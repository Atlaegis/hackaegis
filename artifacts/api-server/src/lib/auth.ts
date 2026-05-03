import crypto from "crypto";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

/** Participant code format: HACKFORGE_PART_XXXXXXXX (32-char entropy suffix) */
export function generateParticipantCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 10; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HACKFORGE_PART_${suffix}`;
}

/** Legacy code generator (kept for backward compat) */
export function generateCode(): string {
  return generateParticipantCode();
}

/** Generate a judge code with random suffix — not sequential */
export function generateJudgeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HACKFORGE_JUDGE_${suffix}`;
}

export async function getSessionFromToken(token: string | undefined): Promise<typeof sessionsTable.$inferSelect | null> {
  if (!token || token.length < 32) return null;
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  if (!session) return null;

  const age = Date.now() - new Date(session.createdAt).getTime();
  if (age > SESSION_TTL_MS) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return null;
  }

  return session;
}

export function extractToken(authHeader: string | undefined): string | undefined {
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  const token = authHeader.slice(7).trim();
  if (!token || token.length < 32) return undefined;
  return token;
}
