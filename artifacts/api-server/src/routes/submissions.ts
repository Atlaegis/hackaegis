import { Router, type IRouter, type Request, type Response } from "express";
import { db, submissionsTable, teamsTable, sessionsTable, adminLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { extractToken, getSessionFromToken } from "../lib/auth";

const router: IRouter = Router();

async function logAction(action: string, details?: string) {
  await db.insert(adminLogsTable).values({ action, details: details ?? null });
}

async function requireAdminOrJudge(req: Request, res: Response): Promise<typeof sessionsTable.$inferSelect | null> {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);
  if (!session?.isAdmin && !session?.isJudge) {
    res.status(401).json({ error: "unauthorized", message: "Access required" });
    return null;
  }
  return session;
}

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);
  if (!session?.isAdmin) {
    res.status(401).json({ error: "unauthorized", message: "Admin access required" });
    return false;
  }
  return true;
}

// List all submissions (admin + judges)
router.get("/submissions", async (req: Request, res: Response) => {
  const session = await requireAdminOrJudge(req, res);
  if (!session) return;

  const submissions = await db.select().from(submissionsTable).orderBy(desc(submissionsTable.submittedAt));
  const teams = await db.select().from(teamsTable);
  const teamMap = new Map(teams.map(t => [t.id, t]));

  res.json(submissions.map(s => ({
    id: s.id,
    teamId: s.teamId,
    teamName: teamMap.get(s.teamId)?.name ?? "Unknown",
    projectTitle: s.projectTitle ?? teamMap.get(s.teamId)?.projectTitle ?? null,
    description: s.description,
    githubUrl: s.githubUrl,
    demoUrl: s.demoUrl,
    slidesUrl: s.slidesUrl,
    submittedAt: s.submittedAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })));
});

// Get submission for a specific team
router.get("/submissions/:teamId", async (req: Request, res: Response) => {
  const session = await requireAdminOrJudge(req, res);
  if (!session) return;

  const teamId = parseInt(String(req.params.teamId), 10);
  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.teamId, teamId));
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));

  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  if (!submission) {
    res.json({
      id: null, teamId, teamName: team.name,
      projectTitle: team.projectTitle,
      description: team.description ?? null,
      githubUrl: team.githubUrl ?? null,
      demoUrl: null, slidesUrl: null,
      submittedAt: null, updatedAt: null,
    });
    return;
  }

  res.json({
    id: submission.id,
    teamId: submission.teamId,
    teamName: team.name,
    projectTitle: submission.projectTitle ?? team.projectTitle,
    description: submission.description,
    githubUrl: submission.githubUrl,
    demoUrl: submission.demoUrl,
    slidesUrl: submission.slidesUrl,
    submittedAt: submission.submittedAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  });
});

// Create or update submission (admin or judge)
router.post("/submissions", async (req: Request, res: Response) => {
  const session = await requireAdminOrJudge(req, res);
  if (!session) return;

  const { teamId, projectTitle, description, githubUrl, demoUrl, slidesUrl } = req.body ?? {};
  if (typeof teamId !== "number") {
    res.status(400).json({ error: "validation_error", message: "teamId required" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  const [existing] = await db.select().from(submissionsTable).where(eq(submissionsTable.teamId, teamId));
  const now = new Date();
  const values = {
    projectTitle: projectTitle ?? null,
    description: description ?? null,
    githubUrl: githubUrl ?? null,
    demoUrl: demoUrl ?? null,
    slidesUrl: slidesUrl ?? null,
    updatedAt: now,
  };

  let saved: typeof submissionsTable.$inferSelect;
  if (existing) {
    [saved] = await db.update(submissionsTable).set(values).where(eq(submissionsTable.id, existing.id)).returning();
  } else {
    [saved] = await db.insert(submissionsTable).values({ teamId, ...values, submittedAt: now }).returning();
  }

  await logAction("upsert_submission", `Submission for team ${team.name}`);
  res.status(existing ? 200 : 201).json({
    id: saved.id,
    teamId: saved.teamId,
    teamName: team.name,
    projectTitle: saved.projectTitle,
    description: saved.description,
    githubUrl: saved.githubUrl,
    demoUrl: saved.demoUrl,
    slidesUrl: saved.slidesUrl,
    submittedAt: saved.submittedAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
  });
});

// Delete submission (admin only)
router.delete("/submissions/:teamId", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const teamId = parseInt(String(req.params.teamId), 10);
  await db.delete(submissionsTable).where(eq(submissionsTable.teamId, teamId));
  res.json({ success: true });
});

export default router;
