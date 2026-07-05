import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdminAccess, handleAuthError } from "@/lib/auth/rbac";
import { ilike, or, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    await requireAdminAccess();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const conditions = search
      ? or(
          ilike(users.fullName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      : undefined;

    const [userList, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          college: users.college,
          skills: users.skills,
          isSuperAdmin: users.isSuperAdmin,
          createdAt: users.createdAt,
          onboardingCompleted: users.onboardingCompleted,
        })
        .from(users)
        .where(conditions)
        .orderBy(users.createdAt)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(conditions),
    ]);

    const total = Number(countResult[0].count);

    return NextResponse.json({
      users: userList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
