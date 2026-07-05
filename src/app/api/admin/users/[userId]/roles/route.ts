import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, eventRoles } from "@/lib/db/schema";
import { requireSuperAdmin, requireAdminAccess, handleAuthError } from "@/lib/auth/rbac";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdminAccess();

    const { userId } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roles = await db.query.eventRoles.findMany({
      where: eq(eventRoles.userId, userId),
    });

    return NextResponse.json({ roles });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { user: adminUser, level } = await requireAdminAccess();

    const { userId } = await params;
    const body = await request.json();

    const { eventId, role } = body;

    if (!eventId || !role) {
      return NextResponse.json(
        { error: "eventId and role are required" },
        { status: 400 }
      );
    }

    // Only super admin can assign/remove "admin" role
    if (role === "admin" && level !== "super") {
      return NextResponse.json(
        { error: "Only super admin can assign admin role" },
        { status: 403 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if role already exists
    const existing = await db.query.eventRoles.findFirst({
      where: and(
        eq(eventRoles.eventId, eventId),
        eq(eventRoles.userId, userId),
        eq(eventRoles.role, role)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Role already assigned" },
        { status: 409 }
      );
    }

    const [newRole] = await db
      .insert(eventRoles)
      .values({
        eventId,
        userId,
        role,
        assignedBy: adminUser.id,
      })
      .returning();

    return NextResponse.json({ role: newRole }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { level } = await requireAdminAccess();

    const { userId } = await params;
    const body = await request.json();

    const { eventId, role } = body;

    if (!eventId || !role) {
      return NextResponse.json(
        { error: "eventId and role are required" },
        { status: 400 }
      );
    }

    // Only super admin can remove "admin" role
    if (role === "admin" && level !== "super") {
      return NextResponse.json(
        { error: "Only super admin can remove admin role" },
        { status: 403 }
      );
    }

    const existing = await db.query.eventRoles.findFirst({
      where: and(
        eq(eventRoles.eventId, eventId),
        eq(eventRoles.userId, userId),
        eq(eventRoles.role, role)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    await db
      .delete(eventRoles)
      .where(
        and(
          eq(eventRoles.eventId, eventId),
          eq(eventRoles.userId, userId),
          eq(eventRoles.role, role)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
