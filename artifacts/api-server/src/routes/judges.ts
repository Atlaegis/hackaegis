import { Router, type IRouter, type Request, type Response } from "express";
import { db, judgeScoresTable, teamsTable, submissionsTable, sessionsTable, eventConfigTable, participationCodesTable, adminLogsTable, judgeTeamLocksTable, judgeAnnouncementsTable, teamAttendanceTable } from "@workspace/db";
import { eq, and, desc, isNull } from "drizzle-orm";
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

const SCORING_CRITERIA = [
  { key: "innovationProblemSolving", label: "Innovation & Problem Solving", max: 20, weight: 20 },
  { key: "technicalExcellence", label: "Technical Excellence", max: 25, weight: 25 },
  { key: "realWorldImpact", label: "Real-World Impact & Scalability", max: 20, weight: 20 },
  { key: "uiUxExperience", label: "UI/UX & Product Experience", max: 10, weight: 10 },
  { key: "presentationCommunication", label: "Presentation & Communication", max: 10, weight: 10 },
  { key: "completionFunctionality", label: "Completion & Functionality", max: 10, weight: 10 },
  { key: "teamworkManagement", label: "Teamwork & Project Management", max: 5, weight: 5 },
];

async function getJudgeStats(codeId: number) {
  const [code] = await db.select().from(participationCodesTable).where(eq(participationCodesTable.id, codeId));
  if (!code) return null;
  const allTeams = await db.select().from(teamsTable);
  const assignedTeams = code.domain ? allTeams.filter((t) => t.domain === code.domain) : allTeams;
  const scores = await db.select().from(judgeScoresTable).where(eq(judgeScoresTable.judgeId, codeId));
  return { code, assignedTeams: assignedTeams.length, completedEvaluations: scores.length, pendingEvaluations: Math.max(0, assignedTeams.length - scores.length) };
}

// Get judge profile with stats
router.get("/judges/me", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const stats = await getJudgeStats(session.codeId);
  if (!stats) {
    res.status(404).json({ error: "not_found", message: "Judge code not found" });
    return;
  }

  res.json({
    id: session.codeId,
    code: stats.code.code,
    label: stats.code.label ?? stats.code.code,
    domain: stats.code.domain ?? null,
    email: stats.code.email ?? null,
    bio: stats.code.bio ?? null,
    yearsOfExperience: stats.code.yearsOfExperience ?? null,
    isJudge: true,
    assignedTeams: stats.assignedTeams,
    completedEvaluations: stats.completedEvaluations,
    pendingEvaluations: stats.pendingEvaluations,
  });
});

// Update judge profile
router.put("/judges/profile", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const { bio, yearsOfExperience } = req.body ?? {};
  const updateData: Record<string, unknown> = {};
  if (bio !== undefined) updateData.bio = bio ? String(bio).trim().slice(0, 2000) : null;
  if (yearsOfExperience !== undefined) updateData.yearsOfExperience = typeof yearsOfExperience === "number" && yearsOfExperience >= 0 ? yearsOfExperience : null;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "validation_error", message: "No fields to update" });
    return;
  }

  const [updated] = await db.update(participationCodesTable).set(updateData).where(eq(participationCodesTable.id, session.codeId)).returning();
  res.json({ id: updated.id, label: updated.label, domain: updated.domain ?? null, email: updated.email ?? null, bio: updated.bio ?? null, yearsOfExperience: updated.yearsOfExperience ?? null });
});

// Get judge dashboard data (home page)
router.get("/judges/dashboard", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const stats = await getJudgeStats(session.codeId);
  const announcements = await db.select().from(judgeAnnouncementsTable).orderBy(desc(judgeAnnouncementsTable.createdAt)).limit(10);

  res.json({
    announcements,
    scoringGuidelines: { criteria: SCORING_CRITERIA, totalPoints: 100 },
    judgeStats: {
      assignedTeams: stats?.assignedTeams ?? 0,
      completedEvaluations: stats?.completedEvaluations ?? 0,
      pendingEvaluations: stats?.pendingEvaluations ?? 0,
    },
  });
});

// Get all teams with submissions, scores, lock/disqualification info
router.get("/judges/teams", async (req: Request, res: Response) => {
  const session = await requireAdminOrJudge(req, res);
  if (!session) return;

  const judgeCodeId = session.codeId;

  const [code] = await db.select().from(participationCodesTable).where(eq(participationCodesTable.id, judgeCodeId));
  const allTeams = await db.select().from(teamsTable).orderBy(teamsTable.name);
  const teams = code?.domain
    ? allTeams.filter((t) => t.domain === code.domain)
    : allTeams;

  const submissions = await db.select().from(submissionsTable);
  const scores = await db.select().from(judgeScoresTable).where(eq(judgeScoresTable.judgeId, judgeCodeId));
  const attendance = await db.select().from(teamAttendanceTable).orderBy(desc(teamAttendanceTable.createdAt));

  const [activeLock] = await db.select().from(judgeTeamLocksTable)
    .where(and(eq(judgeTeamLocksTable.judgeId, judgeCodeId), isNull(judgeTeamLocksTable.unlockedAt)));

  const submissionMap = new Map(submissions.map((s) => [s.teamId, s]));
  const scoreMap = new Map(scores.map((s) => [s.teamId, s]));
  // Use most recent attendance record per team (first in desc-ordered array wins)
  const attendanceMap = new Map<number, typeof attendance[number]>();
  for (const a of attendance) {
    if (!attendanceMap.has(a.teamId)) attendanceMap.set(a.teamId, a);
  }

  const result = teams.map((team) => {
    const sub = submissionMap.get(team.id);
    const score = scoreMap.get(team.id);
    const att = attendanceMap.get(team.id);
    return {
      id: team.id,
      name: team.name,
      projectTitle: team.projectTitle,
      description: team.description ?? null,
      domain: team.domain ?? null,
      githubUrl: sub?.githubUrl ?? team.githubUrl ?? null,
      demoUrl: sub?.demoUrl ?? null,
      slidesUrl: sub?.slidesUrl ?? null,
      submissionDescription: sub?.description ?? null,
      hasSubmission: !!sub,
      isDisqualified: team.status === "disqualified",
      isLate: att?.isLate ?? false,
      minutesLate: att?.minutesLate ?? 0,
      judgeScore: score
        ? {
            score: score.score,
            totalScore: score.totalScore ?? null,
            innovationProblemSolving: score.innovationProblemSolving ?? null,
            technicalExcellence: score.technicalExcellence ?? null,
            realWorldImpact: score.realWorldImpact ?? null,
            uiUxExperience: score.uiUxExperience ?? null,
            presentationCommunication: score.presentationCommunication ?? null,
            completionFunctionality: score.completionFunctionality ?? null,
            teamworkManagement: score.teamworkManagement ?? null,
            feedback: score.feedback ?? null,
          }
        : null,
    };
  });

  res.json({ teams: result, lockedTeamId: activeLock?.teamId ?? null });
});

// Submit / update a score for a team (new 7-criteria system)
router.post("/judges/scores", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const { teamId, innovationProblemSolving, technicalExcellence, realWorldImpact, uiUxExperience, presentationCommunication, completionFunctionality, teamworkManagement, feedback } = req.body ?? {};

  if (typeof teamId !== "number") {
    res.status(400).json({ error: "validation_error", message: "teamId is required" });
    return;
  }

  const criteriaValues: Record<string, number> = { innovationProblemSolving, technicalExcellence, realWorldImpact, uiUxExperience, presentationCommunication, completionFunctionality, teamworkManagement };
  for (const c of SCORING_CRITERIA) {
    const val = criteriaValues[c.key];
    if (typeof val !== "number" || val < 0 || val > c.max) {
      res.status(400).json({ error: "validation_error", message: `${c.label} must be 0–${c.max}` });
      return;
    }
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  if (team.status === "disqualified") {
    res.status(400).json({ error: "disqualified", message: "Cannot score a disqualified team" });
    return;
  }

  const judgeId = session.codeId;
  const totalScore = innovationProblemSolving + technicalExcellence + realWorldImpact + uiUxExperience + presentationCommunication + completionFunctionality + teamworkManagement;

  const values = {
    score: totalScore / 10,
    innovationProblemSolving,
    technicalExcellence,
    realWorldImpact,
    uiUxExperience,
    presentationCommunication,
    completionFunctionality,
    teamworkManagement,
    totalScore,
    feedback: feedback ?? null,
    updatedAt: new Date(),
  };

  // Use transaction to prevent TOCTOU race on lock check + score write
  let saved: typeof judgeScoresTable.$inferSelect | { error: string };
  try {
    saved = await db.transaction(async (tx) => {
      const [activeLock] = await tx.select().from(judgeTeamLocksTable)
        .where(and(eq(judgeTeamLocksTable.judgeId, judgeId), isNull(judgeTeamLocksTable.unlockedAt)));
      if (!activeLock || activeLock.teamId !== teamId) {
        return { error: "lock_required" } as const;
      }

      const [existing] = await tx.select().from(judgeScoresTable)
        .where(and(eq(judgeScoresTable.judgeId, judgeId), eq(judgeScoresTable.teamId, teamId)));

      if (existing) {
        const [row] = await tx.update(judgeScoresTable).set(values).where(eq(judgeScoresTable.id, existing.id)).returning();
        return row;
      } else {
        const [row] = await tx.insert(judgeScoresTable).values({ judgeId, teamId, ...values, createdAt: new Date() }).returning();
        return row;
      }
    });
  } catch {
    res.status(500).json({ error: "server_error", message: "Failed to save score" });
    return;
  }

  if ("error" in saved) {
    res.status(400).json({ error: "lock_required", message: "You must lock this team before scoring." });
    return;
  }

  await logAction("judge_scored", `Judge (code ${session.codeId}) scored team ${team.name}: ${totalScore}/100`);
  res.json({ id: saved.id, judgeId: saved.judgeId, teamId: saved.teamId, totalScore: saved.totalScore, feedback: saved.feedback });
});

// Get all scores for this judge
router.get("/judges/scores", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;
  const scores = await db.select().from(judgeScoresTable).where(eq(judgeScoresTable.judgeId, session.codeId));
  res.json(scores.map((s) => ({
    id: s.id, teamId: s.teamId, score: s.score, totalScore: s.totalScore ?? null,
    innovationProblemSolving: s.innovationProblemSolving ?? null,
    technicalExcellence: s.technicalExcellence ?? null,
    realWorldImpact: s.realWorldImpact ?? null,
    uiUxExperience: s.uiUxExperience ?? null,
    presentationCommunication: s.presentationCommunication ?? null,
    completionFunctionality: s.completionFunctionality ?? null,
    teamworkManagement: s.teamworkManagement ?? null,
    feedback: s.feedback,
  })));
});

// Lock a team for evaluation
router.post("/judges/teams/:teamId/lock", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const teamId = parseInt(String(req.params.teamId), 10);
  if (isNaN(teamId)) {
    res.status(400).json({ error: "validation_error", message: "Invalid teamId" });
    return;
  }

  // Verify team exists
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  // Verify domain access
  const [code] = await db.select().from(participationCodesTable).where(eq(participationCodesTable.id, session.codeId));
  if (code?.domain && team.domain !== code.domain) {
    res.status(403).json({ error: "domain_mismatch", message: "This team is not in your assigned domain" });
    return;
  }

  // Transaction to prevent double-lock race condition
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(judgeTeamLocksTable)
      .where(and(eq(judgeTeamLocksTable.judgeId, session.codeId), isNull(judgeTeamLocksTable.unlockedAt)));
    if (existing) return { error: "already_locked" } as const;
    await tx.insert(judgeTeamLocksTable).values({ judgeId: session.codeId, teamId });
    return { success: true } as const;
  });

  if ("error" in result) {
    res.status(400).json({ error: "already_locked", message: "You must unlock your current team first" });
    return;
  }

  res.json({ success: true, lockedTeamId: teamId });
});

// Unlock a team
router.post("/judges/teams/:teamId/unlock", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const teamId = parseInt(String(req.params.teamId), 10);
  if (isNaN(teamId)) {
    res.status(400).json({ error: "validation_error", message: "Invalid teamId" });
    return;
  }

  const [lock] = await db.select().from(judgeTeamLocksTable)
    .where(and(eq(judgeTeamLocksTable.judgeId, session.codeId), eq(judgeTeamLocksTable.teamId, teamId), isNull(judgeTeamLocksTable.unlockedAt)));

  if (!lock) {
    res.status(404).json({ error: "not_found", message: "No active lock for this team" });
    return;
  }

  await db.update(judgeTeamLocksTable).set({ unlockedAt: new Date() }).where(eq(judgeTeamLocksTable.id, lock.id));
  res.json({ success: true });
});

// Get current lock status
router.get("/judges/lock-status", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const [lock] = await db.select().from(judgeTeamLocksTable)
    .where(and(eq(judgeTeamLocksTable.judgeId, session.codeId), isNull(judgeTeamLocksTable.unlockedAt)));

  res.json({ lockedTeamId: lock?.teamId ?? null, lockedAt: lock?.lockedAt ?? null });
});

// Disqualify a team (must be >10 min late)
router.post("/judges/teams/:teamId/disqualify", async (req: Request, res: Response) => {
  const session = await requireJudge(req, res);
  if (!session) return;

  const teamId = parseInt(String(req.params.teamId), 10);
  if (isNaN(teamId)) {
    res.status(400).json({ error: "validation_error", message: "Invalid teamId" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  // Verify domain access
  const [code] = await db.select().from(participationCodesTable).where(eq(participationCodesTable.id, session.codeId));
  if (code?.domain && team.domain !== code.domain) {
    res.status(403).json({ error: "domain_mismatch", message: "This team is not in your assigned domain" });
    return;
  }

  if (team.status === "disqualified") {
    res.status(400).json({ error: "already_disqualified", message: "Team is already disqualified" });
    return;
  }

  const [att] = await db.select().from(teamAttendanceTable).where(eq(teamAttendanceTable.teamId, teamId)).orderBy(desc(teamAttendanceTable.createdAt));
  if (!att || !att.isLate || (att.minutesLate ?? 0) <= 10) {
    res.status(400).json({ error: "not_eligible", message: "Team has not exceeded the 10-minute late threshold" });
    return;
  }

  await db.update(teamsTable).set({ status: "disqualified", disqualifiedAt: new Date(), disqualifiedBy: session.codeId }).where(eq(teamsTable.id, teamId));
  await logAction("team_disqualified", `Judge (code ${session.codeId}) disqualified team ${team.name} (${att.minutesLate} min late)`);
  res.json({ success: true });
});

// Aggregate judge leaderboard (100-point scale)
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
    const scoreVal = s.totalScore ?? (s.score * 10);
    if (!teamScores.has(s.teamId)) teamScores.set(s.teamId, []);
    teamScores.get(s.teamId)!.push(scoreVal);
  }

  const leaderboard = teams.map((team) => {
    const scores = teamScores.get(team.id) ?? [];
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      teamId: team.id,
      teamName: team.name,
      projectTitle: team.projectTitle,
      domain: team.domain ?? null,
      averageScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
      judgesScored: scores.length,
      totalJudges: judgeCodes.length,
      isDisqualified: team.status === "disqualified",
    };
  }).sort((a, b) => {
    if (a.isDisqualified && !b.isDisqualified) return 1;
    if (!a.isDisqualified && b.isDisqualified) return -1;
    if (a.averageScore === null) return 1;
    if (b.averageScore === null) return -1;
    return b.averageScore - a.averageScore;
  }).map((t, i) => ({ ...t, rank: i + 1 }));

  res.json({ isVisible: isPublic, judgeCount: judgeCodes.length, leaderboard });
});

export default router;
