import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluations, evaluationScores, submissions, transparencyLogs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/rbac";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { submissionId } = await params;

    // Get submission to verify ownership
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
      with: {
        team: {
          with: { members: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify user is on this team
    const isMember = submission.team.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not your submission" }, { status: 403 });
    }

    // Get evaluations (only completed ones with results published)
    const completedEvals = await db.query.evaluations.findMany({
      where: and(
        eq(evaluations.submissionId, submissionId),
        eq(evaluations.status, "completed")
      ),
      with: {
        scores: true,
      },
    });

    // Build transparency response — NEVER expose internalNotes
    const transparencyData = completedEvals.map((eval_) => ({
      id: eval_.id,
      totalWeightedScore: eval_.totalWeightedScore,
      verdict: eval_.verdict,
      strengths: eval_.strengths,
      weaknesses: eval_.weaknesses,
      recommendations: eval_.recommendations,
      eliminationReason: eval_.eliminationReason,
      // internalNotes is NEVER included
      completedAt: eval_.completedAt,
      scores: eval_.scores.map((s) => ({
        criteriaKey: s.criteriaKey,
        score: s.score,
        weight: s.weight,
        comment: s.comment,
      })),
    }));

    // Get audit trail for this submission
    const auditTrail = await db.query.transparencyLogs.findMany({
      where: and(
        eq(transparencyLogs.entityType, "evaluation"),
        eq(transparencyLogs.entityId, submissionId)
      ),
      orderBy: [desc(transparencyLogs.createdAt)],
      columns: {
        action: true,
        actorRole: true,
        createdAt: true,
        reason: true,
      },
    });

    return NextResponse.json({
      submission: {
        id: submission.id,
        projectTitle: submission.projectTitle,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
      evaluations: transparencyData,
      auditTrail,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
