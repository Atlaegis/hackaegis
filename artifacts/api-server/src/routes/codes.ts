import { Router, type IRouter, type Request, type Response } from "express";
import { db, participationCodesTable, adminLogsTable, teamsTable, meetCodesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GenerateCodesBody } from "@workspace/api-zod";
import { extractToken, getSessionFromToken, generateParticipantCode, generateJudgeCode, generateTeamCode, generateMeetCode } from "../lib/auth";

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
    id: c.id, code: c.code, label: c.label ?? null, isUsed: c.isUsed,
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
  const code = String(req.params.code).slice(0, 80);
  const [updated] = await db
    .update(participationCodesTable)
    .set({ isUsed: false, usedAt: null })
    .where(and(eq(participationCodesTable.code, code), eq(participationCodesTable.role, "participant")))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Code not found" });
    return;
  }
  await logAction("reset_code", `Reset participant code`);
  res.json({ id: updated.id, code: updated.code, isUsed: updated.isUsed, usedAt: null, createdAt: updated.createdAt.toISOString() });
});

// ─── Delete a participant code ────────────────────────────────────────────────
router.delete("/codes/:code", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const code = String(req.params.code).slice(0, 80);
  const [deleted] = await db
    .delete(participationCodesTable)
    .where(and(eq(participationCodesTable.code, code), eq(participationCodesTable.role, "participant")))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Code not found" });
    return;
  }
  await logAction("delete_code", `Deleted participant code`);
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
  res.json(judgeCodes.map((c) => ({ id: c.id, code: c.code, label: c.label ?? null, domain: c.domain ?? null, email: c.email ?? null, bio: c.bio ?? null, yearsOfExperience: c.yearsOfExperience ?? null, createdAt: c.createdAt.toISOString() })));
});

router.post("/codes/judges", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const rawLabel = req.body?.label ? String(req.body.label).trim().slice(0, 80) : null;
  const domain = req.body?.domain ? String(req.body.domain).trim().slice(0, 50) : null;
  const email = req.body?.email ? String(req.body.email).trim().slice(0, 255) : null;

  // Generate a random judge code (non-sequential)
  const existing = new Set(
    (await db.select({ code: participationCodesTable.code }).from(participationCodesTable)
      .where(eq(participationCodesTable.role, "judge"))).map((c) => c.code)
  );

  let code = generateJudgeCode();
  let attempts = 0;
  while (existing.has(code) && attempts < 20) {
    code = generateJudgeCode();
    attempts++;
  }

  const judgeCount = existing.size + 1;
  const label = rawLabel || `Judge ${judgeCount}`;

  const [inserted] = await db.insert(participationCodesTable).values({
    code, role: "judge", label, isReusable: true, isUsed: false, domain, email,
  }).returning();

  await logAction("create_judge_code", `Created judge code for: ${label}${domain ? ` (domain: ${domain})` : ""}`);
  res.status(201).json({ id: inserted.id, code: inserted.code, label: inserted.label ?? null, domain: inserted.domain ?? null, email: inserted.email ?? null, createdAt: inserted.createdAt.toISOString() });
});

router.delete("/codes/judges/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const [deleted] = await db
    .delete(participationCodesTable)
    .where(and(eq(participationCodesTable.id, id), eq(participationCodesTable.role, "judge")))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Judge code not found" });
    return;
  }
  await logAction("delete_judge_code", `Deleted judge code for: ${deleted.label ?? deleted.code}`);
  res.json({ success: true });
});

// ─── Generate Team Login Code ─────────────────────────────────────────────────
router.post("/codes/team-login", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const teamId = parseInt(String(req.body?.teamId), 10);
  if (isNaN(teamId)) {
    res.status(400).json({ error: "validation_error", message: "teamId is required" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  if (team.status !== "active") {
    res.status(400).json({ error: "invalid_status", message: "Team must be active to generate login codes" });
    return;
  }

  // Check if a reusable participant code already exists for this team
  const [existing] = await db
    .select()
    .from(participationCodesTable)
    .where(
      and(
        eq(participationCodesTable.teamId, teamId),
        eq(participationCodesTable.isReusable, true),
        eq(participationCodesTable.role, "participant")
      )
    );

  if (existing) {
    res.json({ code: existing.code, teamId: team.id, teamName: team.name, maxMembers: team.maxMembers });
    return;
  }

  let code = generateTeamCode();
  let codeAttempts = 0;
  while (codeAttempts < 20) {
    const [dup] = await db.select({ id: participationCodesTable.id }).from(participationCodesTable).where(eq(participationCodesTable.code, code));
    if (!dup) break;
    code = generateTeamCode();
    codeAttempts++;
  }

  await db.insert(participationCodesTable).values({
    code,
    role: "participant",
    label: team.name,
    isReusable: true,
    isUsed: false,
    teamId: team.id,
  });

  await logAction("generate_team_code", `Team login code for: ${team.name}`);
  res.status(201).json({ code, teamId: team.id, teamName: team.name, maxMembers: team.maxMembers });
});

// ─── Generate Meet Codes ──────────────────────────────────────────────────────
router.post("/codes/meet", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const teamId = parseInt(String(req.body?.teamId), 10);
  if (isNaN(teamId)) {
    res.status(400).json({ error: "validation_error", message: "teamId is required" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  if (team.status !== "active") {
    res.status(400).json({ error: "invalid_status", message: "Team must be active to generate meet codes" });
    return;
  }

  // Check if meet codes already exist (idempotent)
  const existingCodes = await db
    .select()
    .from(meetCodesTable)
    .where(eq(meetCodesTable.teamId, teamId));

  if (existingCodes.length > 0) {
    res.json({ teamId: team.id, codes: existingCodes.map((c) => ({ code: c.code, label: c.label })) });
    return;
  }

  // Generate N codes (N = maxMembers)
  const count = team.maxMembers;
  const codes: { teamId: number; hackathonId: number | null; code: string; label: string }[] = [];
  const usedCodes = new Set<string>();

  for (let i = 0; i < count; i++) {
    let code = generateMeetCode();
    while (usedCodes.has(code)) code = generateMeetCode();
    usedCodes.add(code);
    codes.push({
      teamId: team.id,
      hackathonId: team.hackathonId ?? null,
      code,
      label: `Member ${i + 1}`,
    });
  }

  await db.insert(meetCodesTable).values(codes);
  await logAction("generate_meet_codes", `${count} meet codes for: ${team.name}`);
  res.status(201).json({ teamId: team.id, codes: codes.map((c) => ({ code: c.code, label: c.label })) });
});

// ─── Get Team Codes (login + meet) ───────────────────────────────────────────
router.get("/codes/team/:teamId", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const teamId = parseInt(String(req.params.teamId), 10);
  if (isNaN(teamId)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const [teamLoginCode] = await db
    .select()
    .from(participationCodesTable)
    .where(
      and(
        eq(participationCodesTable.teamId, teamId),
        eq(participationCodesTable.isReusable, true),
        eq(participationCodesTable.role, "participant")
      )
    );

  const meetCodes = await db
    .select()
    .from(meetCodesTable)
    .where(eq(meetCodesTable.teamId, teamId));

  res.json({
    teamLoginCode: teamLoginCode ? { id: teamLoginCode.id, code: teamLoginCode.code, label: teamLoginCode.label } : null,
    meetCodes: meetCodes.map((c) => ({ id: c.id, code: c.code, label: c.label, isUsed: c.isUsed })),
  });
});

export default router;
