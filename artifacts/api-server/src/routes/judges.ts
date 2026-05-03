import { Router, type IRouter, type Request, type Response } from "express";
import { db, judgeScoresTable, teamsTable, submissionsTable, sessionsTable, eventConfigTable, participationCodesTable, adminLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { extractToken, getSessionFromToken } from "../lib/auth";

const router: IRouter = Router();

async function logAction(action: string, details?: string) {
  await db.insert(adminLogsTable).values({ action, details: details ?? null });
}

async function requireJudge(req: Request, res: Response): Promise<typeof sessionsTable.$inferSelect | null> {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);
  if (!session?.isJudge) {
    res.status(401).json({ error: "unauthorized", message: "Judge access required" });
    return null;
  }
  return session;
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

// Get judge profile from session
router.get("/judges/me", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const [code] = await db.select().from(participationCodesTable).where(eq(participationCodesTable.id, session.codeId));
  if (!code) {
    res.status(404).json({ error: "not_found", message: "Judge code not found" });
    return;
  }

  res.json({ id: session.codeId, code: code.code, label: code.label ?? code.code, isJudge: true });
});

// Get all teams with submissions and this judge's scores
router.get("/judges/teams", async (req: Request, res: Response) => {
  const session = await requireAdminOrJudge(req, res);
  if (!session) return;

  const judgeCodeId = session.codeId;

  const teams = await db.select().from(teamsTable).orderBy(teamsTable.name);
  const submissions = await db.select().from(submissionsTable);
  const scores = await db.select().from(judgeScoresTable).where(eq(judgeScoresTable.judgeId, judgeCodeId));

  const submissionMap = new Map(submissions.map((s) => [s.teamId, s]));
  const scoreMap = new Map(scores.map((s) => [s.teamId, s]));

  const result = teams.map((team) => {
    const sub = submissionMap.get(team.id);
    const score = scoreMap.get(team.id);
    return {
      id: team.id,
      name: team.name,
      projectTitle: team.projectTitle,
      description: team.description ?? null,
      githubUrl: sub?.githubUrl ?? team.githubUrl ?? null,
      demoUrl: sub?.demoUrl ?? null,
      slidesUrl: sub?.slidesUrl ?? null,
      submissionDescription: sub?.description ?? null,
      hasSubmission: !!sub,
      judgeScore: score
        ? { score: score.score, innovation: score.innovation ?? null, execution: score.execution ?? null, presentation: score.presentation ?? null, feedback: score.feedback ?? null }
        : null,
    };
  });

  res.json(result);
});

// Submit / update a score for a team
router.post("/judges/scores", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const { teamId, score, innovation, execution, presentation, feedback } = req.body ?? {};
  if (typeof teamId !== "number" || typeof score !== "number" || score < 0 || score > 10) {
    res.status(400).json({ error: "validation_error", message: "teamId and score (0–10) required" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  const judgeId = session.codeId; // codeId acts as judge identifier
  const [existing] = await db.select().from(judgeScoresTable)
    .where(and(eq(judgeScoresTable.judgeId, judgeId), eq(judgeScoresTable.teamId, teamId)));

  const values = {
    score,
    innovation: typeof innovation === "number" ? innovation : null,
    execution: typeof execution === "number" ? execution : null,
    presentation: typeof presentation === "number" ? presentation : null,
    feedback: feedback ?? null,
    updatedAt: new Date(),
  };

  let saved: typeof judgeScoresTable.$inferSelect;
  if (existing) {
    [saved] = await db.update(judgeScoresTable).set(values).where(eq(judgeScoresTable.id, existing.id)).returning();
  } else {
    [saved] = await db.insert(judgeScoresTable).values({ judgeId, teamId, ...values, createdAt: new Date() }).returning();
  }

  await logAction("judge_scored", `Judge (code ${session.codeId}) scored team ${team.name}: ${score}/10`);
  res.json({ id: saved.id, judgeId: saved.judgeId, teamId: saved.teamId, score: saved.score, innovation: saved.innovation, execution: saved.execution, presentation: saved.presentation, feedback: saved.feedback });
});

// Get all scores for this judge
router.get("/judges/scores", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;
  const scores = await db.select().from(judgeScoresTable).where(eq(judgeScoresTable.judgeId, session.codeId));
  res.json(scores.map((s) => ({
    id: s.id, teamId: s.teamId, score: s.score,
    innovation: s.innovation, execution: s.execution, presentation: s.presentation, feedback: s.feedback,
  })));
});

// Aggregate judge leaderboard
router.get("/judges/leaderboard", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);

  const [config] = await db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id));
  const isPublic = config?.judgeResultsVisible ?? false;

  if (!isPublic && !session?.isAdmin && !session?.isJudge) {
    res.status(403).json({ error: "forbidden", message: "Judge results not yet visible" });
    return;
  }

  const teams = await db.select().from(teamsTable);
  const allScores = await db.select().from(judgeScoresTable);
  const judgeCodes = await db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "judge"));

  const teamScores = new Map<number, number[]>();
  for (const s of allScores) {
    if (!teamScores.has(s.teamId)) teamScores.set(s.teamId, []);
    teamScores.get(s.teamId)!.push(s.score);
  }

  const leaderboard = teams.map((team) => {
    const scores = teamScores.get(team.id) ?? [];
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      teamId: team.id,
      teamName: team.name,
      projectTitle: team.projectTitle,
      averageScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
      judgesScored: scores.length,
      totalJudges: judgeCodes.length,
    };
  }).sort((a, b) => {
    if (a.averageScore === null) return 1;
    if (b.averageScore === null) return -1;
    return b.averageScore - a.averageScore;
  }).map((t, i) => ({ ...t, rank: i + 1 }));

  res.json({ isVisible: isPublic, judgeCount: judgeCodes.length, leaderboard });
});

export default router;
