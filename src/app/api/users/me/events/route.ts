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

    // Deduplicate by event — user may have multiple roles for the same event
    const eventMap = new Map<string, { roles: string[]; assignedAt: Date; event: typeof userEvents[0]["event"] }>();

    for (const er of userEvents) {
      if (!er.event || er.event.deletedAt) continue;
      const existing = eventMap.get(er.event.id);
      if (existing) {
        existing.roles.push(er.role);
      } else {
        eventMap.set(er.event.id, {
          roles: [er.role],
          assignedAt: er.assignedAt,
          event: er.event,
        });
      }
    }

    const result = Array.from(eventMap.values()).map((entry) => ({
      role: entry.roles.join(", "),
      roles: entry.roles,
      assignedAt: entry.assignedAt,
      event: entry.event,
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
