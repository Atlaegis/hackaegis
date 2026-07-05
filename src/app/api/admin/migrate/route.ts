import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireSuperAdmin, handleAuthError } from "@/lib/auth/rbac";

export async function POST() {
  try {
    await requireSuperAdmin();

    const sql = neon(process.env.DATABASE_URL!);

    // Run migration: add is_super_admin column if it doesn't exist
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_super_admin" boolean DEFAULT false`;

    return NextResponse.json({ success: true, message: "Migration completed" });
  } catch (error) {
    return handleAuthError(error);
  }
}
