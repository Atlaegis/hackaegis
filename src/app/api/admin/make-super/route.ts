import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// One-time bootstrap endpoint: makes the current logged-in user a super admin.
// Only works if there are ZERO super admins in the system (first-time setup).
export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Check if any super admin already exists
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.isSuperAdmin, true));

  if (Number(countResult.count) > 0) {
    return NextResponse.json(
      { error: "A super admin already exists. Use an existing super admin to promote users." },
      { status: 403 }
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found in DB. Complete onboarding first." },
      { status: 404 }
    );
  }

  const [updated] = await db
    .update(users)
    .set({ isSuperAdmin: true })
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({
    success: true,
    userId: updated.id,
    email: updated.email,
    isSuperAdmin: updated.isSuperAdmin,
    message: "You are now a super admin.",
  });
}
