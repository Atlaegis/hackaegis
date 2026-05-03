import { Router, type IRouter, type Request, type Response } from "express";
import { db, participationCodesTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  VerifyParticipationCodeBody,
  AdminLoginBody,
} from "@workspace/api-zod";
import { generateToken, extractToken, getSessionFromToken } from "../lib/auth";

const router: IRouter = Router();

// ─── Unified Code Login (NEW primary endpoint) ───────────────────────────────
router.post("/auth/login", async (req: Request, res: Response) => {
  const rawCode = (req.body?.code ?? "").toString().trim().toUpperCase();
  if (!rawCode) {
    res.status(400).json({ error: "validation_error", message: "Code is required" });
    return;
  }

  const [found] = await db
    .select()
    .from(participationCodesTable)
    .where(eq(participationCodesTable.code, rawCode));

  if (!found) {
    res.status(400).json({ error: "invalid_code", message: "Invalid code. Check your code and try again." });
    return;
  }

  if (!found.isReusable && found.isUsed) {
    res.status(400).json({ error: "code_used", message: "This code has already been used." });
    return;
  }

  // Mark participant codes as used (single-use)
  if (!found.isReusable) {
    await db
      .update(participationCodesTable)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(participationCodesTable.id, found.id));
  }

  const isAdmin = found.role === "admin";
  const isJudge = found.role === "judge";

  const token = generateToken();
  await db.insert(sessionsTable).values({
    token,
    codeId: found.id,
    isAdmin,
    isJudge,
  });

  const redirectTo = isAdmin ? "/admin" : isJudge ? "/judges" : "/watch";

  res.json({
    token,
    role: found.role,
    label: found.label ?? null,
    redirectTo,
  });
});

// ─── Legacy participant code verify (kept for OpenAPI compat) ────────────────
router.post("/auth/verify-code", async (req: Request, res: Response) => {
  const parse = VerifyParticipationCodeBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
    return;
  }

  const normalizedCode = parse.data.code.trim().toUpperCase();
  const [found] = await db
    .select()
    .from(participationCodesTable)
    .where(eq(participationCodesTable.code, normalizedCode));

  if (!found || found.role !== "participant") {
    res.status(400).json({ error: "invalid_code", message: "Invalid participation code" });
    return;
  }

  if (found.isUsed) {
    res.status(400).json({ error: "code_used", message: "This code has already been used" });
    return;
  }

  await db
    .update(participationCodesTable)
    .set({ isUsed: true, usedAt: new Date() })
    .where(eq(participationCodesTable.id, found.id));

  const token = generateToken();
  await db.insert(sessionsTable).values({ token, codeId: found.id, isAdmin: false, isJudge: false });

  res.json({ token, participantCode: normalizedCode, hasVoted: false });
});

// ─── Legacy admin login (kept for OpenAPI compat) ───────────────────────────
router.post("/auth/admin/login", async (req: Request, res: Response) => {
  const parse = AdminLoginBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
    return;
  }

  // Check if there's an admin code in participationCodesTable
  const [adminCode] = await db
    .select()
    .from(participationCodesTable)
    .where(eq(participationCodesTable.role, "admin"));

  if (!adminCode) {
    res.status(401).json({ error: "invalid_credentials", message: "No admin configured" });
    return;
  }

  const token = generateToken();
  await db.insert(sessionsTable).values({ token, codeId: adminCode.id, isAdmin: true, isJudge: false });
  res.json({ token, email: parse.data.email, isAdmin: true });
});

// ─── Session info ─────────────────────────────────────────────────────────────
router.get("/auth/me", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);

  if (!session) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const [code] = await db
    .select()
    .from(participationCodesTable)
    .where(eq(participationCodesTable.id, session.codeId));

  if (session.isAdmin) {
    res.json({ isAdmin: true, isJudge: false, role: "admin", label: code?.label ?? "Admin", participantCode: null, hasVoted: null });
    return;
  }

  if (session.isJudge) {
    res.json({ isAdmin: false, isJudge: true, role: "judge", label: code?.label ?? code?.code ?? "Judge", judgeCodeId: session.codeId, participantCode: null, hasVoted: null });
    return;
  }

  res.json({ isAdmin: false, isJudge: false, role: "participant", label: null, participantCode: code?.code ?? null, hasVoted: false });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/auth/logout", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ success: true, message: "Logged out" });
});

export default router;
