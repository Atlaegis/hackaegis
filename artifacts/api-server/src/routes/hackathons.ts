import { Router, type IRouter, type Request, type Response } from "express";
import { db, hackathonsTable, teamsTable, pollsTable, votesTable, judgeScoresTable, submissionsTable, participationCodesTable, adminLogsTable, eventConfigTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
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

function formatHackathon(h: typeof hackathonsTable.$inferSelect) {
  return {
    id: h.id,
    name: h.name,
    slug: h.slug,
    description: h.description ?? null,
    tagline: h.tagline ?? null,
    status: h.status,
    phase: h.phase,
    streamUrl: h.streamUrl ?? null,
    streamActive: h.streamActive,
    resultsPublished: h.resultsPublished,
    judgeResultsVisible: h.judgeResultsVisible,
    prizePool: h.prizePool ?? null,
    grandPrize: h.grandPrize ?? null,
    submissionLocked: h.submissionLocked,
    jitsiRoom: (h as typeof h & { jitsiRoom?: string | null }).jitsiRoom ?? null,
    meetMode: (h as typeof h & { meetMode?: string }).meetMode ?? "youtube",
    jitsiPassword: (h as typeof h & { jitsiPassword?: string | null }).jitsiPassword ?? null,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  };
}

// ─── Public: list all hackathons ─────────────────────────────────────────────
router.get("/hackathons", async (_req: Request, res: Response) => {
  const hackathons = await db.select().from(hackathonsTable).orderBy(desc(hackathonsTable.createdAt));
  res.json(hackathons.map(formatHackathon));
});

// ─── Public: get active hackathon ────────────────────────────────────────────
router.get("/hackathons/active", async (_req: Request, res: Response) => {
  const [hackathon] = await db.select().from(hackathonsTable).where(eq(hackathonsTable.status, "active")).orderBy(desc(hackathonsTable.id));
  if (!hackathon) {
    res.status(404).json({ error: "not_found", message: "No active hackathon" });
    return;
  }
  res.json(formatHackathon(hackathon));
});

// ─── Public: get hackathon by slug with results ───────────────────────────────
router.get("/hackathons/:slug", async (req: Request, res: Response) => {
  const slug = String(req.params.slug);
  const [hackathon] = await db.select().from(hackathonsTable).where(eq(hackathonsTable.slug, slug));
  if (!hackathon) {
    res.status(404).json({ error: "not_found", message: "Hackathon not found" });
    return;
  }

  const teams = await db.select().from(teamsTable).where(eq(teamsTable.hackathonId, hackathon.id));
  const allVotes = await db.select().from(votesTable);
  const submissions = await db.select().from(submissionsTable);
  const submissionMap = new Map(submissions.map((s) => [s.teamId, s]));

  const totalVotes = allVotes.length;
  const voteCounts = new Map<number, number>();
  for (const vote of allVotes) {
    if (teams.some((t) => t.id === vote.teamId)) {
      voteCounts.set(vote.teamId, (voteCounts.get(vote.teamId) ?? 0) + 1);
    }
  }

  const judgeScores = await db.select().from(judgeScoresTable);
  const judgeCodes = await db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "judge"));
  const teamScoresMap = new Map<number, number[]>();
  for (const s of judgeScores) {
    if (teams.some((t) => t.id === s.teamId)) {
      if (!teamScoresMap.has(s.teamId)) teamScoresMap.set(s.teamId, []);
      teamScoresMap.get(s.teamId)!.push(s.score);
    }
  }

  const hackathonVotes = allVotes.filter((v) => teams.some((t) => t.id === v.teamId));
  const hackathonTotalVotes = hackathonVotes.length;
  const hackathonVoteCounts = new Map<number, number>();
  for (const vote of hackathonVotes) {
    hackathonVoteCounts.set(vote.teamId, (hackathonVoteCounts.get(vote.teamId) ?? 0) + 1);
  }

  const rankedTeams = teams
    .map((team) => {
      const scores = teamScoresMap.get(team.id) ?? [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      const sub = submissionMap.get(team.id);
      return {
        teamId: team.id,
        teamName: team.name,
        projectTitle: sub?.projectTitle ?? team.projectTitle,
        githubUrl: sub?.githubUrl ?? team.githubUrl ?? null,
        demoUrl: sub?.demoUrl ?? null,
        slidesUrl: sub?.slidesUrl ?? null,
        voteCount: hackathonVoteCounts.get(team.id) ?? 0,
        percentage: hackathonTotalVotes > 0
          ? Math.round(((hackathonVoteCounts.get(team.id) ?? 0) / hackathonTotalVotes) * 1000) / 10
          : 0,
        averageJudgeScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
        judgesScored: scores.length,
      };
    })
    .sort((a, b) => b.voteCount - a.voteCount || (b.averageJudgeScore ?? 0) - (a.averageJudgeScore ?? 0))
    .map((t, i) => ({ ...t, rank: i + 1 }));

  res.json({
    hackathon: formatHackathon(hackathon),
    isPublished: hackathon.resultsPublished,
    totalTeams: teams.length,
    totalJudges: judgeCodes.length,
    rankedTeams: hackathon.resultsPublished ? rankedTeams : [],
  });
});

// ─── Admin: create hackathon ──────────────────────────────────────────────────
router.post("/hackathons", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const { name, slug, description, tagline, status, phase, prizePool, grandPrize } = req.body ?? {};
  if (!name || !slug) {
    res.status(400).json({ error: "validation_error", message: "name and slug are required" });
    return;
  }

  const cleanSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const [existing] = await db.select().from(hackathonsTable).where(eq(hackathonsTable.slug, cleanSlug));
  if (existing) {
    res.status(409).json({ error: "conflict", message: "Slug already exists" });
    return;
  }

  const [hackathon] = await db.insert(hackathonsTable).values({
    name,
    slug: cleanSlug,
    description: description ?? null,
    tagline: tagline ?? null,
    status: status ?? "upcoming",
    phase: phase ?? "registration",
    prizePool: prizePool ?? null,
    grandPrize: grandPrize ?? null,
  }).returning();

  await logAction("create_hackathon", `Created hackathon: ${name}`);
  res.status(201).json(formatHackathon(hackathon));
});

// ─── Admin: update hackathon ──────────────────────────────────────────────────
router.put("/hackathons/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const { name, description, tagline, status, phase, streamUrl, streamActive, resultsPublished,
    judgeResultsVisible, prizePool, grandPrize, submissionLocked, jitsiRoom, meetMode, jitsiPassword } = req.body ?? {};

  const updateData: Partial<typeof hackathonsTable.$inferInsert> & { jitsiRoom?: string | null; meetMode?: string; jitsiPassword?: string | null } = { updatedAt: new Date() };
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (tagline !== undefined) updateData.tagline = tagline;
  if (status !== undefined) updateData.status = status;
  if (phase !== undefined) updateData.phase = phase;
  if (streamUrl !== undefined) updateData.streamUrl = streamUrl;
  if (streamActive !== undefined) updateData.streamActive = streamActive;
  if (resultsPublished !== undefined) updateData.resultsPublished = resultsPublished;
  if (judgeResultsVisible !== undefined) updateData.judgeResultsVisible = judgeResultsVisible;
  if (prizePool !== undefined) updateData.prizePool = prizePool;
  if (grandPrize !== undefined) updateData.grandPrize = grandPrize;
  if (submissionLocked !== undefined) updateData.submissionLocked = submissionLocked;
  if (jitsiRoom !== undefined) updateData.jitsiRoom = jitsiRoom;
  if (meetMode !== undefined) updateData.meetMode = meetMode;
  if (jitsiPassword !== undefined) updateData.jitsiPassword = jitsiPassword;

  const [updated] = await db.update(hackathonsTable).set(updateData).where(eq(hackathonsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Hackathon not found" });
    return;
  }

  // If this is now the active hackathon, sync eventConfig for backward compat
  if (updated.status === "active") {
    const configs = await db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id));
    const configUpdate = {
      eventName: updated.name,
      tagline: updated.tagline ?? "Build. Improve. Pitch. Win.",
      phase: updated.phase,
      streamUrl: updated.streamUrl ?? null,
      streamActive: updated.streamActive,
      resultsPublished: updated.resultsPublished,
      judgeResultsVisible: updated.judgeResultsVisible,
      updatedAt: new Date(),
    };
    if (configs[0]) {
      await db.update(eventConfigTable).set(configUpdate).where(eq(eventConfigTable.id, configs[0].id));
    } else {
      await db.insert(eventConfigTable).values(configUpdate);
    }
  }

  await logAction("update_hackathon", `Updated hackathon: ${updated.name} → status=${updated.status}, phase=${updated.phase}`);
  res.json(formatHackathon(updated));
});

// ─── Admin: set active hackathon ─────────────────────────────────────────────
router.post("/hackathons/:id/activate", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  // Set all others to not active (don't change completed ones)
  await db.update(hackathonsTable).set({ status: "upcoming", updatedAt: new Date() }).where(eq(hackathonsTable.status, "active"));
  const [updated] = await db.update(hackathonsTable).set({ status: "active", updatedAt: new Date() }).where(eq(hackathonsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  // Sync eventConfig
  const configs = await db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id));
  const configUpdate = {
    eventName: updated.name,
    tagline: updated.tagline ?? "Build. Improve. Pitch. Win.",
    phase: updated.phase,
    streamActive: updated.streamActive,
    resultsPublished: updated.resultsPublished,
    judgeResultsVisible: updated.judgeResultsVisible,
    updatedAt: new Date(),
  };
  if (configs[0]) {
    await db.update(eventConfigTable).set(configUpdate).where(eq(eventConfigTable.id, configs[0].id));
  } else {
    await db.insert(eventConfigTable).values(configUpdate);
  }

  await logAction("activate_hackathon", `Activated hackathon: ${updated.name}`);
  res.json(formatHackathon(updated));
});

// ─── Admin: archive (complete) hackathon ─────────────────────────────────────
router.post("/hackathons/:id/complete", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  const [updated] = await db.update(hackathonsTable).set({ status: "completed", updatedAt: new Date() }).where(eq(hackathonsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "not_found" }); return; }
  await logAction("complete_hackathon", `Completed hackathon: ${updated.name}`);
  res.json(formatHackathon(updated));
});

// ─── Admin: delete hackathon ──────────────────────────────────────────────────
router.delete("/hackathons/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  const [deleted] = await db.delete(hackathonsTable).where(eq(hackathonsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "not_found" }); return; }
  await logAction("delete_hackathon", `Deleted hackathon: ${deleted.name}`);
  res.json({ success: true });
});

export default router;
