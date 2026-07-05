import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Run migration: add is_super_admin column if it doesn't exist
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_super_admin" boolean DEFAULT false`;

    return NextResponse.json({ success: true, message: "Migration completed" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
