import { Router, type IRouter, type Request, type Response } from "express";
import { db, participationCodesTable, teamsTable, votesTable, pollsTable, eventConfigTable, adminLogsTable, judgeScoresTable, submissionsTable, hackathonsTable } from "@workspace/db";
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

  const [participantCodes, judgeCodes, teams, votes, activePoll, configs, submissions, scores, hackathons] = await Promise.all([
    db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "participant")),
    db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "judge")),
    db.select().from(teamsTable),
    db.select().from(votesTable),
    db.select().from(pollsTable).where(eq(pollsTable.isActive, true)).then((r) => r[0] ?? null),
    db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id)).then((r) => r[0] ?? null),
    db.select().from(submissionsTable),
    db.select().from(judgeScoresTable),
    db.select().from(hackathonsTable).orderBy(desc(hackathonsTable.id)),
  ]);

  const usedCodes = participantCodes.filter((c) => c.isUsed);
  const linkedCodes = participantCodes.filter((c) => c.teamId !== null);
  const uniqueVoters = new Set(votes.map((v) => v.codeId));
  const activeHackathon = hackathons.find((h) => h.status === "active") ?? null;

  // Active hackathon team stats
  const activeTeams = activeHackathon
    ? teams.filter((t) => t.hackathonId === activeHackathon.id)
    : teams;

  res.json({
    totalCodes: participantCodes.length,
    usedCodes: usedCodes.length,
    unusedCodes: participantCodes.length - usedCodes.length,
    linkedCodes: linkedCodes.length,
    totalTeams: teams.length,
    activeTeams: activeTeams.length,
    totalVotes: votes.length,
    activeParticipants: uniqueVoters.size,
    activePollQuestion: activePoll?.question ?? null,
    currentPhase: activeHackathon?.phase ?? configs?.phase ?? "registration",
    streamActive: activeHackathon?.streamActive ?? configs?.streamActive ?? false,
    totalJudges: judgeCodes.length,
    totalSubmissions: submissions.length,
    totalJudgeScores: scores.length,
    activeHackathon: activeHackathon ? {
      id: activeHackathon.id,
      name: activeHackathon.name,
      slug: activeHackathon.slug,
      phase: activeHackathon.phase,
      status: activeHackathon.status,
    } : null,
    totalHackathons: hackathons.length,
  });
});

// ─── Aggregate judge scores (admin view) ────────────────────────────────────
router.get("/admin/scores", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  // Optional hackathonId filter
  const hackathonId = req.query.hackathonId ? parseInt(String(req.query.hackathonId), 10) : null;

  const [allTeams, judgeCodes, allScores, submissions] = await Promise.all([
    db.select().from(teamsTable),
    db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "judge")),
    db.select().from(judgeScoresTable),
    db.select().from(submissionsTable),
  ]);

  const teams = hackathonId !== null
    ? allTeams.filter((t) => t.hackathonId === hackathonId)
    : allTeams;

  const judgeMap = new Map(judgeCodes.map((j) => [j.id, j.label ?? j.code]));
  const submissionMap = new Map(submissions.map((s) => [s.teamId, s]));

  const teamData = teams
    .map((team) => {
      const teamScores = allScores.filter((s) => s.teamId === team.id);
      const avgScore = teamScores.length > 0
        ? Math.round((teamScores.reduce((a, s) => a + s.score, 0) / teamScores.length) * 10) / 10
        : null;
      const avgInnovation = teamScores.filter(s => s.innovation !== null).length > 0
        ? Math.round((teamScores.filter(s => s.innovation !== null).reduce((a, s) => a + (s.innovation ?? 0), 0) / teamScores.filter(s => s.innovation !== null).length) * 10) / 10
        : null;
      const avgExecution = teamScores.filter(s => s.execution !== null).length > 0
        ? Math.round((teamScores.filter(s => s.execution !== null).reduce((a, s) => a + (s.execution ?? 0), 0) / teamScores.filter(s => s.execution !== null).length) * 10) / 10
        : null;
      const avgPresentation = teamScores.filter(s => s.presentation !== null).length > 0
        ? Math.round((teamScores.filter(s => s.presentation !== null).reduce((a, s) => a + (s.presentation ?? 0), 0) / teamScores.filter(s => s.presentation !== null).length) * 10) / 10
        : null;
      const sub = submissionMap.get(team.id);

      return {
        teamId: team.id,
        hackathonId: team.hackathonId ?? null,
        teamName: team.name,
        projectTitle: sub?.projectTitle ?? team.projectTitle,
        demoUrl: sub?.demoUrl ?? null,
        githubUrl: sub?.githubUrl ?? team.githubUrl ?? null,
        slidesUrl: sub?.slidesUrl ?? null,
        hasSubmission: !!sub,
        averageScore: avgScore,
        averageInnovation: avgInnovation,
        averageExecution: avgExecution,
        averagePresentation: avgPresentation,
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
          updatedAt: s.updatedAt.toISOString(),
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
