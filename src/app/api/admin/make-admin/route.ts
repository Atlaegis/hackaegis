import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, events, eventRoles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// One-time setup endpoint: makes the current logged-in user an admin + organizer
// for the published event. Remove this endpoint after initial setup.
export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found in DB. Complete onboarding first." }, { status: 404 });
  }

  // Get published event
  const event = await db.query.events.findFirst({
    where: eq(events.status, "published"),
  });

  if (!event) {
    return NextResponse.json({ error: "No published event. Run /api/admin/seed first." }, { status: 404 });
  }

  // Assign admin role
  const existingAdmin = await db.query.eventRoles.findFirst({
    where: and(
      eq(eventRoles.eventId, event.id),
      eq(eventRoles.userId, user.id),
      eq(eventRoles.role, "admin")
    ),
  });

  if (!existingAdmin) {
    await db.insert(eventRoles).values({
      eventId: event.id,
      userId: user.id,
      role: "admin",
    });
  }

  // Also assign organizer role
  const existingOrganizer = await db.query.eventRoles.findFirst({
    where: and(
      eq(eventRoles.eventId, event.id),
      eq(eventRoles.userId, user.id),
      eq(eventRoles.role, "organizer")
    ),
  });

  if (!existingOrganizer) {
    await db.insert(eventRoles).values({
      eventId: event.id,
      userId: user.id,
      role: "organizer",
    });
  }

  return NextResponse.json({
    success: true,
    userId: user.id,
    email: user.email,
    roles: ["admin", "organizer"],
    eventId: event.id,
    eventTitle: event.title,
  });
}
