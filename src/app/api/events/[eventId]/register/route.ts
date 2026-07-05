import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventRoles } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { getCurrentUser, handleAuthError, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";
import { logTransparencyEvent } from "@/lib/services/audit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { eventId } = await params;

    // Validate event exists and is not deleted
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), isNull(events.deletedAt)),
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if registration is open
    const now = new Date();
    if (now < event.registrationStart || now > event.registrationEnd) {
      return NextResponse.json(
        { error: "Registration is not open for this event" },
        { status: 400 }
      );
    }

    // Check if user is already registered
    const existingRole = await db.query.eventRoles.findFirst({
      where: and(
        eq(eventRoles.eventId, eventId),
        eq(eventRoles.userId, user.id),
        eq(eventRoles.role, "participant")
      ),
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "You are already registered for this event" },
        { status: 409 }
      );
    }

    // Check max capacity
    if (event.maxParticipants) {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventRoles)
        .where(
          and(
            eq(eventRoles.eventId, eventId),
            eq(eventRoles.role, "participant")
          )
        );

      if (Number(countResult.count) >= event.maxParticipants) {
        return NextResponse.json(
          { error: "Event has reached maximum capacity" },
          { status: 400 }
        );
      }
    }

    // If registration fee > 0, require payment
    if (event.registrationFeeAmount && event.registrationFeeAmount > 0) {
      return NextResponse.json({
        requiresPayment: true,
        amount: event.registrationFeeAmount,
        currency: event.registrationFeeCurrency,
        eventId: event.id,
      });
    }

    // Free event — assign participant role directly
    const insertResult = await db
      .insert(eventRoles)
      .values({
        eventId,
        userId: user.id,
        role: "participant",
      })
      .onConflictDoNothing()
      .returning();

    // If no rows returned, another request already registered the user — return success anyway
    if (insertResult.length === 0) {
      return NextResponse.json(
        { success: true, message: "Successfully registered for the event" },
        { status: 201 }
      );
    }

    const newRole = insertResult[0];

    await logTransparencyEvent({
      eventId,
      actorId: user.id,
      actorRole: "participant",
      entityType: "event_role",
      entityId: newRole.id,
      action: "registered",
      newState: { role: "participant", eventId },
    });

    return NextResponse.json(
      { success: true, message: "Successfully registered for the event" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return handleAuthError(error);
    }
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
