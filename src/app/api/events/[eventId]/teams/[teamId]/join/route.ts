import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams, teamMembers, events, eventRoles } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/rbac";
import { logTransparencyEvent } from "@/lib/services/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string; teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { eventId, teamId } = await params;

    // Get team
    const team = await db.query.teams.findFirst({
      where: and(eq(teams.id, teamId), eq(teams.eventId, eventId)),
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.status === "locked") {
      return NextResponse.json({ error: "Team is locked and cannot accept new members" }, { status: 400 });
    }

    // Check if user already in a team for this event
    const existingMembership = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
      with: { team: true },
    });

    if (existingMembership && existingMembership.team.eventId === eventId) {
      return NextResponse.json(
        { error: "You are already in a team for this event" },
        { status: 400 }
      );
    }

    // Check team capacity
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    const [memberCount] = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    const maxSize = event?.maxTeamSize || 4;
    if (memberCount.count >= maxSize) {
      return NextResponse.json({ error: "Team is full" }, { status: 400 });
    }

    // Add member
    await db.insert(teamMembers).values({
      teamId,
      userId: user.id,
      role: "member",
    });

    // Ensure user has participant role
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
      entityId: teamId,
      action: "member_joined",
      newState: { userId: user.id, teamName: team.name },
    });

    return NextResponse.json({ success: true, message: "Joined team successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
