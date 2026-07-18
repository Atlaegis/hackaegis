import crypto from "crypto";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

/** Participant code format: HACKAEGIS_PART_XXXXXXXX (32-char entropy suffix) */
export function generateParticipantCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 10; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HACKAEGIS_PART_${suffix}`;
}

/** Legacy code generator (kept for backward compat) */
export function generateCode(): string {
  return generateParticipantCode();
}

/** Team code format: HACKAEGIS_TEAM_XXXXXXXXXX (10-char random suffix) */
export function generateTeamCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 10; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HACKAEGIS_TEAM_${suffix}`;
}

/** Meet code format: HACKAEGIS_MEET_XXXXXXXX (8-char random suffix) */
export function generateMeetCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HACKAEGIS_MEET_${suffix}`;
}

/** Generate a judge code with random suffix — not sequential */
export function generateJudgeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `HACKAEGIS_JUDGE_${suffix}`;
}

export async function getSessionFromToken(token: string | undefined): Promise<typeof sessionsTable.$inferSelect | null> {
  if (!token || token.length < 32) return null;
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  if (!session) return null;

  // Reject and clean up sessions that have been explicitly logged out
  if (session.loggedOutAt) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
    return null;
  }

  // Reject and clean up sessions past their explicit expiry
  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
    return null;
  }

  // Fallback: reject sessions older than the global TTL
  const age = Date.now() - new Date(session.createdAt).getTime();
  if (age > SESSION_TTL_MS) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
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
