import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluations, evaluationScores, eventRoles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser, handleAuthError } from "@/lib/auth/rbac";
import { evaluationSchema } from "@/lib/validations/evaluation";
import { logTransparencyEvent } from "@/lib/services/audit";
import { EVALUATION_CRITERIA } from "@/lib/constants/rubric";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const evaluation = await db.query.evaluations.findFirst({
      where: eq(evaluations.id, id),
      with: {
        scores: true,
        submission: {
          with: {
            team: {
              with: { members: { with: { user: true } } },
            },
          },
        },
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    // Check access: assigned judge, team member, organizer, or admin
    const isJudge = evaluation.judgeId === user.id;
    const isTeamMember = evaluation.submission.team.members.some(
      (m) => m.userId === user.id
    );
    const isAdminOrOrganizer = user.isSuperAdmin || !!(await db.query.eventRoles.findFirst({
      where: and(
        eq(eventRoles.eventId, evaluation.eventId),
        eq(eventRoles.userId, user.id),
        eq(eventRoles.role, "organizer")
      ),
    })) || !!(await db.query.eventRoles.findFirst({
      where: and(
        eq(eventRoles.eventId, evaluation.eventId),
        eq(eventRoles.userId, user.id),
        eq(eventRoles.role, "admin")
      ),
    }));

    if (!isJudge && !isTeamMember && !isAdminOrOrganizer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Strip internalNotes unless user is the judge or admin/organizer
    const canSeeInternalNotes = isJudge || isAdminOrOrganizer;
    const response = {
      ...evaluation,
      internalNotes: canSeeInternalNotes ? evaluation.internalNotes : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    // Get the evaluation
    const evaluation = await db.query.evaluations.findFirst({
      where: eq(evaluations.id, id),
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    if (evaluation.judgeId !== user.id) {
      return NextResponse.json({ error: "Not your evaluation" }, { status: 403 });
    }

    if (evaluation.status === "completed") {
      return NextResponse.json({ error: "Evaluation already completed" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = evaluationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Calculate weighted total score
    let totalWeightedScore = 0;
    for (const score of data.scores) {
      const criteria = EVALUATION_CRITERIA.find((c) => c.key === score.criteriaKey);
      if (criteria) {
        totalWeightedScore += score.score * criteria.weight;
      }
    }

    // Update evaluation
    const [updated] = await db
      .update(evaluations)
      .set({
        totalWeightedScore: totalWeightedScore.toFixed(2),
        status: "completed",
        verdict: data.verdict,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        recommendations: data.recommendations || null,
        eliminationReason: data.eliminationReason || null,
        internalNotes: data.internalNotes || null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(evaluations.id, id))
      .returning();

    // Insert individual scores
    for (const score of data.scores) {
      const criteria = EVALUATION_CRITERIA.find((c) => c.key === score.criteriaKey)!;
      await db
        .insert(evaluationScores)
        .values({
          evaluationId: id,
          criteriaKey: score.criteriaKey,
          score: score.score.toFixed(2),
          weight: criteria.weight.toFixed(2),
          comment: score.comment || null,
        })
        .onConflictDoUpdate({
          target: [evaluationScores.evaluationId, evaluationScores.criteriaKey],
          set: {
            score: score.score.toFixed(2),
            comment: score.comment || null,
          },
        });
    }

    // Audit log — THE CORE USP
    await logTransparencyEvent({
      eventId: evaluation.eventId,
      actorId: user.id,
      actorRole: "judge",
      entityType: "evaluation",
      entityId: id,
      action: "score_submitted",
      newState: {
        totalWeightedScore,
        verdict: data.verdict,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        eliminationReason: data.eliminationReason,
        scores: data.scores,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
