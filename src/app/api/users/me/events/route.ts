import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventRoles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, handleAuthError, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const userEvents = await db.query.eventRoles.findMany({
      where: eq(eventRoles.userId, user.id),
      with: {
        event: true,
      },
    });

    const result = userEvents
      .filter((er) => er.event && !er.event.deletedAt)
      .map((er) => ({
        role: er.role,
        assignedAt: er.assignedAt,
        event: er.event,
      }));

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return handleAuthError(error);
    }
    console.error("User events error:", error);
    return NextResponse.json({ error: "Failed to fetch user events." }, { status: 500 });
  }
}
