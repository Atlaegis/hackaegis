import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { onboardingSchema } from "@/lib/validations/user";

async function ensureUserExists(clerkId: string) {
  let user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) {
    // Fallback: create user from Clerk session if webhook hasn't fired yet
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "User";

    const [created] = await db
      .insert(users)
      .values({
        clerkId,
        email,
        fullName,
        avatarUrl: clerkUser.imageUrl,
      })
      .onConflictDoNothing()
      .returning();

    user = created || await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  }

  return user;
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await ensureUserExists(clerkId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user exists before updating
  await ensureUserExists(clerkId);

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  await db
    .update(users)
    .set({
      fullName: data.fullName,
      phone: data.phone || null,
      college: data.college,
      university: data.university || null,
      degree: data.degree || null,
      branch: data.branch || null,
      graduationYear: data.graduationYear || null,
      githubUrl: data.githubUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      portfolioUrl: data.portfolioUrl || null,
      skills: data.skills || [],
      bio: data.bio || null,
      city: data.city || null,
      state: data.state || null,
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(users.clerkId, clerkId));

  return NextResponse.json({ success: true });
}
