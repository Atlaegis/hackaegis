import { Router, type IRouter, type Request, type Response } from "express";
import { db, participationCodesTable, teamsTable, votesTable, pollsTable, eventConfigTable, adminLogsTable, judgeScoresTable, submissionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
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

  const [participantCodes, judgeCodes, teams, votes, activePoll, configs, submissions, scores] = await Promise.all([
    db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "participant")),
    db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "judge")),
    db.select().from(teamsTable),
    db.select().from(votesTable),
    db.select().from(pollsTable).where(eq(pollsTable.isActive, true)).then((r) => r[0] ?? null),
    db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id)).then((r) => r[0] ?? null),
    db.select().from(submissionsTable),
    db.select().from(judgeScoresTable),
  ]);

  const usedCodes = participantCodes.filter((c) => c.isUsed);
  const uniqueVoters = new Set(votes.map((v) => v.codeId));

  res.json({
    totalCodes: participantCodes.length,
    usedCodes: usedCodes.length,
    unusedCodes: participantCodes.length - usedCodes.length,
    totalTeams: teams.length,
    totalVotes: votes.length,
    activeParticipants: uniqueVoters.size,
    activePollQuestion: activePoll?.question ?? null,
    currentPhase: configs?.phase ?? "registration",
    streamActive: configs?.streamActive ?? false,
    totalJudges: judgeCodes.length,
    totalSubmissions: submissions.length,
    totalJudgeScores: scores.length,
  });
});

// ─── Aggregate judge scores (admin view) ────────────────────────────────────
router.get("/admin/scores", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const [teams, judgeCodes, allScores, submissions] = await Promise.all([
    db.select().from(teamsTable),
    db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "judge")),
    db.select().from(judgeScoresTable),
    db.select().from(submissionsTable),
  ]);

  const judgeMap = new Map(judgeCodes.map((j) => [j.id, j.label ?? j.code]));
  const submissionMap = new Map(submissions.map((s) => [s.teamId, s]));

  const teamData = teams
    .map((team) => {
      const teamScores = allScores.filter((s) => s.teamId === team.id);
      const avgScore = teamScores.length > 0
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
        totalJudges: judgeCodes.length,
        judgeBreakdown: teamScores.map((s) => ({
          judgeId: s.judgeId,
          judgeName: judgeMap.get(s.judgeId) ?? `Judge ${s.judgeId}`,
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

  res.json({ judgeCount: judgeCodes.length, teams: teamData });
});

router.get("/admin/logs", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const logs = await db.select().from(adminLogsTable).orderBy(desc(adminLogsTable.createdAt)).limit(200);
  res.json(logs.map((l) => ({ id: l.id, action: l.action, details: l.details ?? null, createdAt: l.createdAt.toISOString() })));
});

export default router;
