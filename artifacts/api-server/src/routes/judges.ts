import { Router, type IRouter, type Request, type Response } from "express";
import { db, judgesTable, judgeScoresTable, teamsTable, submissionsTable, sessionsTable, eventConfigTable, adminLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { extractToken, getSessionFromToken, generateToken } from "../lib/auth";

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

// Judge login
router.post("/judges/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "validation_error", message: "Email and password required" });
    return;
  }

  const [judge] = await db.select().from(judgesTable).where(eq(judgesTable.email, email));
  if (!judge) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    return;
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  if (judge.passwordHash !== passwordHash) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    return;
  }

  const token = generateToken();
  await db.insert(sessionsTable).values({ token, codeId: 0, isJudge: true, judgeId: judge.id });

  res.json({ token, id: judge.id, name: judge.name, email: judge.email, isJudge: true });
});

// Get judge profile
router.get("/judges/me", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const [judge] = await db.select().from(judgesTable).where(eq(judgesTable.id, session.judgeId!));
  if (!judge) {
    res.status(404).json({ error: "not_found", message: "Judge not found" });
    return;
  }

  res.json({ id: judge.id, name: judge.name, email: judge.email, isJudge: true });
});

// Get all teams with submissions and this judge's scores
router.get("/judges/teams", async (req: Request, res: Response) => {
  const session = await requireAdminOrJudge(req, res);
  if (!session) return;

  const judgeId = session.isJudge ? session.judgeId! : null;

  const teams = await db.select().from(teamsTable).orderBy(teamsTable.name);
  const submissions = await db.select().from(submissionsTable);
  const scores = judgeId !== null
    ? await db.select().from(judgeScoresTable).where(eq(judgeScoresTable.judgeId, judgeId))
    : [];

  const submissionMap = new Map(submissions.map(s => [s.teamId, s]));
  const scoreMap = new Map(scores.map(s => [s.teamId, s]));

  const result = teams.map(team => {
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
      judgeScore: score ? {
        score: score.score,
        innovation: score.innovation ?? null,
        execution: score.execution ?? null,
        presentation: score.presentation ?? null,
        feedback: score.feedback ?? null,
      } : null,
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

  const [existing] = await db.select().from(judgeScoresTable)
    .where(and(eq(judgeScoresTable.judgeId, session.judgeId!), eq(judgeScoresTable.teamId, teamId)));

  let saved: typeof judgeScoresTable.$inferSelect;
  const values = {
    score,
    innovation: typeof innovation === "number" ? innovation : null,
    execution: typeof execution === "number" ? execution : null,
    presentation: typeof presentation === "number" ? presentation : null,
    feedback: feedback ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    [saved] = await db.update(judgeScoresTable).set(values).where(eq(judgeScoresTable.id, existing.id)).returning();
  } else {
    [saved] = await db.insert(judgeScoresTable).values({ judgeId: session.judgeId!, teamId, ...values, createdAt: new Date() }).returning();
  }

  await logAction("judge_scored", `Judge ${session.judgeId} scored team ${team.name}: ${score}/10`);
  res.json({ id: saved.id, judgeId: saved.judgeId, teamId: saved.teamId, score: saved.score, innovation: saved.innovation, execution: saved.execution, presentation: saved.presentation, feedback: saved.feedback });
});

// Get all scores (for this judge)
router.get("/judges/scores", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const scores = await db.select().from(judgeScoresTable).where(eq(judgeScoresTable.judgeId, session.judgeId!));
  res.json(scores.map(s => ({
    id: s.id,
    teamId: s.teamId,
    score: s.score,
    innovation: s.innovation,
    execution: s.execution,
    presentation: s.presentation,
    feedback: s.feedback,
  })));
});

// Get aggregate judge leaderboard (admin + judges, optionally public)
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
  const judges = await db.select().from(judgesTable);

  const teamScores = new Map<number, number[]>();
  for (const score of allScores) {
    if (!teamScores.has(score.teamId)) teamScores.set(score.teamId, []);
    teamScores.get(score.teamId)!.push(score.score);
  }

  const judgeCount = judges.length;

  const leaderboard = teams.map(team => {
    const scores = teamScores.get(team.id) ?? [];
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      teamId: team.id,
      teamName: team.name,
      projectTitle: team.projectTitle,
      averageScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
      judgesScored: scores.length,
      totalJudges: judgeCount,
    };
  }).sort((a, b) => {
    if (a.averageScore === null && b.averageScore === null) return 0;
    if (a.averageScore === null) return 1;
    if (b.averageScore === null) return -1;
    return b.averageScore - a.averageScore;
  }).map((t, i) => ({ ...t, rank: i + 1 }));

  res.json({ isVisible: isPublic, judgeCount, leaderboard });
});

export default router;
