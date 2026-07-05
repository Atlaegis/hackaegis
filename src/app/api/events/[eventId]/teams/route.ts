import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams, teamMembers, eventRoles } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createTeamSchema } from "@/lib/validations/team";
import { logTransparencyEvent } from "@/lib/services/audit";
import { nanoid } from "@/lib/utils/nanoid";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await getCurrentUser();
    const { eventId } = await params;

    const allTeams = await db.query.teams.findMany({
      where: and(eq(teams.eventId, eventId), isNull(teams.deletedAt)),
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(allTeams);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { eventId } = await params;

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if user already has a team in this event
    const existingMemberships = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, user.id),
      with: { team: true },
    });

    const alreadyInEvent = existingMemberships.some(
      (m) => m.team.eventId === eventId && !m.team.deletedAt
    );

    if (alreadyInEvent) {
      return NextResponse.json(
        { error: "You are already in a team for this event" },
        { status: 400 }
      );
    }

    const inviteCode = nanoid(8);

    const [newTeam] = await db
      .insert(teams)
      .values({
        eventId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        inviteCode,
        leaderId: user.id,
        status: "forming",
      })
      .returning();

    // Add creator as team leader
    await db.insert(teamMembers).values({
      teamId: newTeam.id,
      userId: user.id,
      role: "leader",
    });

    // Ensure user has participant role for this event
    const existingRole = await db.query.eventRoles.findFirst({
      where: and(
        eq(eventRoles.eventId, eventId),
        eq(eventRoles.userId, user.id)
      ),
    });

    if (!existingRole) {
      await db.insert(eventRoles).values({
        eventId,
        userId: user.id,
        role: "participant",
      });
    }

    await logTransparencyEvent({
      eventId,
      actorId: user.id,
      actorRole: "participant",
      entityType: "team",
      entityId: newTeam.id,
      action: "created",
      newState: { name: newTeam.name, inviteCode },
    });

    // Fetch full team with members before returning
    const fullTeam = await db.query.teams.findFirst({
      where: eq(teams.id, newTeam.id),
      with: {
        members: {
          with: {
            user: {
              columns: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(fullTeam, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
