import crypto from "crypto";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Participant code format: HACKFORGE_PART_XXXXXXXX */
export function generateParticipantCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HACKFORGE_PART_${suffix}`;
}

/** Legacy code generator (kept for backward compat) */
export function generateCode(): string {
  return generateParticipantCode();
}

/** Generate a judge code: HACKFORGE_JUDGE@NN */
export function generateJudgeCode(num: number): string {
  return `HACKFORGE_JUDGE@${String(num).padStart(2, "0")}`;
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
