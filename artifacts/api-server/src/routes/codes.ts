import { Router, type IRouter, type Request, type Response } from "express";
import { db, participationCodesTable, adminLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GenerateCodesBody } from "@workspace/api-zod";
import { extractToken, getSessionFromToken, generateParticipantCode, generateJudgeCode } from "../lib/auth";

const router: IRouter = Router();

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);
  if (!session?.isAdmin) {
    res.status(401).json({ error: "unauthorized", message: "Admin access required" });
    return false;
  }
  return true;
}

async function logAction(action: string, details?: string) {
  await db.insert(adminLogsTable).values({ action, details: details ?? null });
}

// ─── List participant codes ───────────────────────────────────────────────────
router.get("/codes", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const codes = await db
    .select()
    .from(participationCodesTable)
    .where(eq(participationCodesTable.role, "participant"))
    .orderBy(participationCodesTable.createdAt);
  res.json(codes.map((c) => ({
    id: c.id, code: c.code, isUsed: c.isUsed,
    usedAt: c.usedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  })));
});

// ─── Generate participant codes ───────────────────────────────────────────────
router.post("/codes", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const parse = GenerateCodesBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "count must be between 1 and 500" });
    return;
  }
  const { count } = parse.data;

  const existing = new Set(
    (await db.select({ code: participationCodesTable.code }).from(participationCodesTable)).map((c) => c.code)
  );
  const newCodes: { code: string; role: string; isReusable: boolean; isUsed: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    let code = generateParticipantCode();
    while (existing.has(code)) code = generateParticipantCode();
    existing.add(code);
    newCodes.push({ code, role: "participant", isReusable: false, isUsed: false });
  }

  const inserted = await db.insert(participationCodesTable).values(newCodes).returning();
  await logAction("generate_codes", `Generated ${count} participant codes`);

  res.status(201).json(inserted.map((c) => ({
    id: c.id, code: c.code, isUsed: c.isUsed, usedAt: null, createdAt: c.createdAt.toISOString(),
  })));
});

// ─── Reset a participant code ─────────────────────────────────────────────────
router.post("/codes/:code/reset", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const code = String(req.params.code);
  const [updated] = await db
    .update(participationCodesTable)
    .set({ isUsed: false, usedAt: null })
    .where(and(eq(participationCodesTable.code, code), eq(participationCodesTable.role, "participant")))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Code not found" });
    return;
  }
  await logAction("reset_code", `Reset code ${code}`);
  res.json({ id: updated.id, code: updated.code, isUsed: updated.isUsed, usedAt: null, createdAt: updated.createdAt.toISOString() });
});

// ─── Delete a participant code ────────────────────────────────────────────────
router.delete("/codes/:code", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const code = String(req.params.code);
  const [deleted] = await db
    .delete(participationCodesTable)
    .where(and(eq(participationCodesTable.code, code), eq(participationCodesTable.role, "participant")))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Code not found" });
    return;
  }
  await logAction("delete_code", `Deleted code ${code}`);
  res.json({ success: true, message: "Code deleted" });
});

// ─── Code stats ───────────────────────────────────────────────────────────────
router.get("/codes/stats", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const all = await db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "participant"));
  const used = all.filter((c) => c.isUsed).length;
  res.json({ total: all.length, used, unused: all.length - used });
});

// ─── Judge codes management ───────────────────────────────────────────────────
router.get("/codes/judges", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const judgeCodes = await db
    .select().from(participationCodesTable)
    .where(eq(participationCodesTable.role, "judge"))
    .orderBy(participationCodesTable.createdAt);
  res.json(judgeCodes.map((c) => ({ id: c.id, code: c.code, label: c.label ?? null, createdAt: c.createdAt.toISOString() })));
});

router.post("/codes/judges", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const { label } = req.body ?? {};
  const existing = await db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "judge"));
  let maxNum = 0;
  for (const c of existing) {
    const match = c.code.match(/@(\d+)$/);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }
  const nextNum = maxNum + 1;
  const code = generateJudgeCode(nextNum);
  const [inserted] = await db.insert(participationCodesTable).values({
    code, role: "judge", label: label || `Judge ${nextNum}`, isReusable: true, isUsed: false,
  }).returning();
  await logAction("create_judge_code", `Created judge code: ${code}`);
  res.status(201).json({ id: inserted.id, code: inserted.code, label: inserted.label ?? null, createdAt: inserted.createdAt.toISOString() });
});

router.delete("/codes/judges/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  const [deleted] = await db
    .delete(participationCodesTable)
    .where(and(eq(participationCodesTable.id, id), eq(participationCodesTable.role, "judge")))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Judge code not found" });
    return;
  }
  await logAction("delete_judge_code", `Deleted judge code: ${deleted.code}`);
  res.json({ success: true });
});

export default router;
