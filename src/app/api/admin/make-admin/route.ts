import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, events, eventRoles } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { requireSuperAdmin, handleAuthError } from "@/lib/auth/rbac";

// One-time setup endpoint: makes the current logged-in user an admin + organizer
// for the published event. Only works without auth when zero super admins exist.
export async function POST() {
  try {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Check if any super admin already exists
  const existingSuperAdmins = await db.select({count: count()}).from(users).where(eq(users.isSuperAdmin, true));
  if (Number(existingSuperAdmins[0].count) > 0) {
    await requireSuperAdmin(); // Only existing super admin can promote others
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

  // Also promote to super admin
  if (!user.isSuperAdmin) {
    await db.update(users).set({ isSuperAdmin: true }).where(eq(users.id, user.id));
  }

  return NextResponse.json({
    success: true,
    userId: user.id,
    email: user.email,
    roles: ["admin", "organizer"],
    isSuperAdmin: true,
    eventId: event.id,
    eventTitle: event.title,
  });
  } catch (error) {
    return handleAuthError(error);
  }
}
