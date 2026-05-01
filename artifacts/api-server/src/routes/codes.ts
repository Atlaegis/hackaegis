import { Router, type IRouter, type Request, type Response } from "express";
import { db, participationCodesTable, adminLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GenerateCodesBody } from "@workspace/api-zod";
import { extractToken, getSessionFromToken, generateCode } from "../lib/auth";

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

router.get("/codes", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const codes = await db.select().from(participationCodesTable).orderBy(participationCodesTable.createdAt);
  res.json(codes.map(c => ({
    id: c.id,
    code: c.code,
    isUsed: c.isUsed,
    usedAt: c.usedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/codes", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const parse = GenerateCodesBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "count must be between 1 and 500" });
    return;
  }
  const { count } = parse.data;

  const newCodes = [];
  const existing = new Set(
    (await db.select({ code: participationCodesTable.code }).from(participationCodesTable)).map(c => c.code)
  );

  for (let i = 0; i < count; i++) {
    let code = generateCode();
    while (existing.has(code)) {
      code = generateCode();
    }
    existing.add(code);
    newCodes.push({ code, isUsed: false });
  }

  const inserted = await db.insert(participationCodesTable).values(newCodes).returning();
  await logAction("generate_codes", `Generated ${count} codes`);

  res.status(201).json(inserted.map(c => ({
    id: c.id,
    code: c.code,
    isUsed: c.isUsed,
    usedAt: null,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/codes/:code/reset", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const code = String(req.params.code);
  const [updated] = await db
    .update(participationCodesTable)
    .set({ isUsed: false, usedAt: null })
    .where(eq(participationCodesTable.code, code))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Code not found" });
    return;
  }

  await logAction("reset_code", `Reset code ${code}`);
  res.json({ id: updated.id, code: updated.code, isUsed: updated.isUsed, usedAt: null, createdAt: updated.createdAt.toISOString() });
});

router.delete("/codes/:code", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const code = String(req.params.code);
  const [deleted] = await db
    .delete(participationCodesTable)
    .where(eq(participationCodesTable.code, code))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Code not found" });
    return;
  }

  await logAction("delete_code", `Deleted code ${code}`);
  res.json({ success: true, message: "Code deleted" });
});

router.get("/codes/stats", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const all = await db.select().from(participationCodesTable);
  const used = all.filter(c => c.isUsed).length;
  res.json({ total: all.length, used, unused: all.length - used });
});

export default router;
