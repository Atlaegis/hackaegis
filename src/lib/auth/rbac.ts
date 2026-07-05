import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, eventRoles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type Role = "participant" | "organizer" | "judge" | "admin";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
  }
}

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new UnauthorizedError();

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireEventRole(
  eventId: string,
  allowedRoles: Role[]
) {
  const user = await getCurrentUser();

  const role = await db.query.eventRoles.findFirst({
    where: and(
      eq(eventRoles.eventId, eventId),
      eq(eventRoles.userId, user.id)
    ),
  });

  if (!role || !allowedRoles.includes(role.role as Role)) {
    throw new ForbiddenError();
  }

  return { user, role: role.role as Role };
}

export function handleAuthError(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  throw error;
}
