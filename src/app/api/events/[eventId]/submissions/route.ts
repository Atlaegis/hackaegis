import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, teams, teamMembers, events } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser, requireEventRole } from "@/lib/auth/rbac";
import { submissionSchema } from "@/lib/validations/submission";
import { logTransparencyEvent } from "@/lib/services/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  // Organizer/admin can see all submissions
  try {
    await requireEventRole(eventId, ["organizer", "admin", "judge"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allSubmissions = await db.query.submissions.findMany({
    where: and(eq(submissions.eventId, eventId), isNull(submissions.deletedAt)),
    with: {
      team: {
        with: {
          members: {
            with: { user: true },
          },
        },
      },
    },
  });

  return NextResponse.json(allSubmissions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { eventId } = await params;

    // Find user's team in this event
    const membership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
      with: { team: true },
    });

    if (!membership || membership.team.eventId !== eventId) {
      return NextResponse.json(
        { error: "You must be in a team to submit" },
        { status: 400 }
      );
    }

    const team = membership.team;

    // Check deadline
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (event?.submissionDeadline) {
      const now = new Date();
      const deadline = new Date(event.submissionDeadline);
      const graceMs = 60 * 1000; // 60 second grace period
      if (now.getTime() > deadline.getTime() + graceMs) {
        return NextResponse.json(
          { error: "Submission deadline has passed" },
          { status: 400 }
        );
      }
    }

    const body = await request.json();
    const parsed = submissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if team already has a submission
    const existingSubmission = await db.query.submissions.findFirst({
      where: and(
        eq(submissions.teamId, team.id),
        eq(submissions.eventId, eventId),
        isNull(submissions.deletedAt)
      ),
    });

    if (existingSubmission) {
      // Update existing submission
      const [updated] = await db
        .update(submissions)
        .set({
          ...parsed.data,
          status: "submitted",
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, existingSubmission.id))
        .returning();

      await logTransparencyEvent({
        eventId,
        actorId: user.id,
        actorRole: "participant",
        entityType: "submission",
        entityId: updated.id,
        action: "updated",
        previousState: { status: existingSubmission.status },
        newState: { status: "submitted", ...parsed.data },
      });

      return NextResponse.json(updated);
    }

    // Create new submission (handle duplicate race with onConflictDoUpdate)
    const [newSubmission] = await db
      .insert(submissions)
      .values({
        teamId: team.id,
        eventId,
        ...parsed.data,
        status: "submitted",
        submittedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [submissions.teamId, submissions.eventId],
        set: {
          ...parsed.data,
          status: "submitted",
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    await logTransparencyEvent({
      eventId,
      actorId: user.id,
      actorRole: "participant",
      entityType: "submission",
      entityId: newSubmission.id,
      action: "created",
      newState: { status: "submitted", ...parsed.data },
    });

    return NextResponse.json(newSubmission, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Submission error:", error);
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 });
  }
}
