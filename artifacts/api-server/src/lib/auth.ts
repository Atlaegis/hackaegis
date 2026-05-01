import crypto from "crypto";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HACK-${suffix}`;
}

export async function getSessionFromToken(token: string | undefined): Promise<typeof sessionsTable.$inferSelect | null> {
  if (!token) return null;
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  return session ?? null;
}

export function extractToken(authHeader: string | undefined): string | undefined {
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  return authHeader.slice(7);
}
