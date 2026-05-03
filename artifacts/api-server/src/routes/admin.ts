import { Router, type IRouter, type Request, type Response } from "express";
import { db, participationCodesTable, teamsTable, votesTable, pollsTable, eventConfigTable, adminLogsTable, judgesTable, judgeScoresTable, submissionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { extractToken, getSessionFromToken } from "../lib/auth";

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

router.get("/admin/dashboard", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const [codes, teams, votes, activePoll, configs, judges, submissions, scores] = await Promise.all([
    db.select().from(participationCodesTable),
    db.select().from(teamsTable),
    db.select().from(votesTable),
    db.select().from(pollsTable).where(eq(pollsTable.isActive, true)).then((r) => r[0] ?? null),
    db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id)).then((r) => r[0] ?? null),
    db.select().from(judgesTable),
    db.select().from(submissionsTable),
    db.select().from(judgeScoresTable),
  ]);

  const usedCodes = codes.filter((c) => c.isUsed);
  const uniqueVoters = new Set(votes.map((v) => v.codeId));

  res.json({
    totalCodes: codes.length,
    usedCodes: usedCodes.length,
    unusedCodes: codes.length - usedCodes.length,
    totalTeams: teams.length,
    totalVotes: votes.length,
    activeParticipants: uniqueVoters.size,
    activePollQuestion: activePoll?.question ?? null,
    currentPhase: configs?.phase ?? "registration",
    streamActive: configs?.streamActive ?? false,
    totalJudges: judges.length,
    totalSubmissions: submissions.length,
    totalJudgeScores: scores.length,
  });
});

// ─── Judge Management ────────────────────────────────────────────────────────

router.get("/admin/judges", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const judges = await db.select().from(judgesTable).orderBy(judgesTable.name);
  const scores = await db.select().from(judgeScoresTable);
  const scoresByJudge = new Map<number, number>();
  for (const s of scores) {
    scoresByJudge.set(s.judgeId, (scoresByJudge.get(s.judgeId) ?? 0) + 1);
  }

  res.json(
    judges.map((j) => ({
      id: j.id,
      name: j.name,
      email: j.email,
      scoresSubmitted: scoresByJudge.get(j.id) ?? 0,
      createdAt: j.createdAt.toISOString(),
    }))
  );
});

router.post("/admin/judges", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const { email, name, password } = req.body ?? {};
  if (!email || !name || !password) {
    res.status(400).json({ error: "validation_error", message: "email, name, and password required" });
    return;
  }

  const [existing] = await db.select().from(judgesTable).where(eq(judgesTable.email, email));
  if (existing) {
    res.status(409).json({ error: "conflict", message: "Judge with this email already exists" });
    return;
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const [judge] = await db.insert(judgesTable).values({ email, name, passwordHash }).returning();
  await logAction("create_judge", `Created judge: ${name} (${email})`);

  res.status(201).json({ id: judge.id, name: judge.name, email: judge.email, scoresSubmitted: 0, createdAt: judge.createdAt.toISOString() });
});

router.delete("/admin/judges/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  const [judge] = await db.delete(judgesTable).where(eq(judgesTable.id, id)).returning();
  if (!judge) {
    res.status(404).json({ error: "not_found", message: "Judge not found" });
    return;
  }
  await logAction("delete_judge", `Deleted judge: ${judge.name}`);
  res.json({ success: true });
});

router.post("/admin/judges/:id/reset-password", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  const { password } = req.body ?? {};
  if (!password) {
    res.status(400).json({ error: "validation_error", message: "password required" });
    return;
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const [judge] = await db.update(judgesTable).set({ passwordHash }).where(eq(judgesTable.id, id)).returning();
  if (!judge) {
    res.status(404).json({ error: "not_found", message: "Judge not found" });
    return;
  }
  await logAction("reset_judge_password", `Reset password for judge: ${judge.name}`);
  res.json({ success: true });
});

// ─── Aggregate judge scores (admin view) ────────────────────────────────────

router.get("/admin/scores", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const [teams, judges, allScores, submissions] = await Promise.all([
    db.select().from(teamsTable),
    db.select().from(judgesTable),
    db.select().from(judgeScoresTable),
    db.select().from(submissionsTable),
  ]);

  const judgeMap = new Map(judges.map((j) => [j.id, j]));
  const submissionMap = new Map(submissions.map((s) => [s.teamId, s]));

  const teamData = teams
    .map((team) => {
      const teamScores = allScores.filter((s) => s.teamId === team.id);
      const avgScore =
        teamScores.length > 0
          ? Math.round((teamScores.reduce((a, s) => a + s.score, 0) / teamScores.length) * 10) / 10
          : null;
      const sub = submissionMap.get(team.id);

      return {
        teamId: team.id,
        teamName: team.name,
        projectTitle: sub?.projectTitle ?? team.projectTitle,
        demoUrl: sub?.demoUrl ?? null,
        githubUrl: sub?.githubUrl ?? team.githubUrl ?? null,
        slidesUrl: sub?.slidesUrl ?? null,
        averageScore: avgScore,
        judgesScored: teamScores.length,
        totalJudges: judges.length,
        judgeBreakdown: teamScores.map((s) => ({
          judgeId: s.judgeId,
          judgeName: judgeMap.get(s.judgeId)?.name ?? "Unknown",
          score: s.score,
          innovation: s.innovation ?? null,
          execution: s.execution ?? null,
          presentation: s.presentation ?? null,
          feedback: s.feedback ?? null,
        })),
      };
    })
    .sort((a, b) => {
      if (a.averageScore === null) return 1;
      if (b.averageScore === null) return -1;
      return b.averageScore - a.averageScore;
    })
    .map((t, i) => ({ ...t, rank: i + 1 }));

  res.json({ judgeCount: judges.length, teams: teamData });
});

router.get("/admin/logs", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const logs = await db.select().from(adminLogsTable).orderBy(desc(adminLogsTable.createdAt)).limit(200);
  res.json(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      details: l.details ?? null,
      createdAt: l.createdAt.toISOString(),
    }))
  );
});

export default router;
