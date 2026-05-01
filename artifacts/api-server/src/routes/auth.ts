import { Router, type IRouter, type Request, type Response } from "express";
import { db, participationCodesTable, sessionsTable, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  VerifyParticipationCodeBody,
  AdminLoginBody,
} from "@workspace/api-zod";
import { generateToken, extractToken, getSessionFromToken } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/verify-code", async (req: Request, res: Response) => {
  const parse = VerifyParticipationCodeBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
    return;
  }
  const { code } = parse.data;
  const normalizedCode = code.trim().toUpperCase();

  const [participationCode] = await db
    .select()
    .from(participationCodesTable)
    .where(eq(participationCodesTable.code, normalizedCode));

  if (!participationCode) {
    res.status(400).json({ error: "invalid_code", message: "Invalid participation code" });
    return;
  }

  if (participationCode.isUsed) {
    res.status(400).json({ error: "code_used", message: "This code has already been used" });
    return;
  }

  await db
    .update(participationCodesTable)
    .set({ isUsed: true, usedAt: new Date() })
    .where(eq(participationCodesTable.id, participationCode.id));

  const token = generateToken();
  await db.insert(sessionsTable).values({
    token,
    codeId: participationCode.id,
    isAdmin: false,
  });

  res.json({
    token,
    participantCode: normalizedCode,
    hasVoted: false,
  });
});

router.post("/auth/admin/login", async (req: Request, res: Response) => {
  const parse = AdminLoginBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
    return;
  }
  const { email, password } = parse.data;

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email));
  if (!admin) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    return;
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  if (admin.passwordHash !== passwordHash) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    return;
  }

  const token = generateToken();
  await db.insert(sessionsTable).values({
    token,
    codeId: 0,
    isAdmin: true,
    adminEmail: email,
  });

  res.json({ token, email, isAdmin: true });
});

router.get("/auth/me", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);

  if (!session) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  if (session.isAdmin) {
    res.json({ isAdmin: true, participantCode: null, hasVoted: null });
    return;
  }

  const [code] = await db
    .select()
    .from(participationCodesTable)
    .where(eq(participationCodesTable.id, session.codeId));

  res.json({
    isAdmin: false,
    participantCode: code?.code ?? null,
    hasVoted: false,
  });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ success: true, message: "Logged out" });
});

export default router;
