import { Router, type IRouter, type Request, type Response } from "express";
import { db, votesTable, teamsTable, pollsTable, eventConfigTable, hackathonsTable, submissionsTable, judgeScoresTable, participationCodesTable } from "@workspace/db";
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

// ─── Helper: compute ranked teams for a set of teams ─────────────────────────
async function computeResults(teams: typeof teamsTable.$inferSelect[]) {
  const allVotes = await db.select().from(votesTable);
  const submissions = await db.select().from(submissionsTable);
  const allScores = await db.select().from(judgeScoresTable);

  const teamIds = new Set(teams.map((t) => t.id));
  const submissionMap = new Map(submissions.map((s) => [s.teamId, s]));

  const relevantVotes = allVotes.filter((v) => teamIds.has(v.teamId));
  const totalVotes = relevantVotes.length;
  const voteCounts = new Map<number, number>();
  for (const vote of relevantVotes) {
    voteCounts.set(vote.teamId, (voteCounts.get(vote.teamId) ?? 0) + 1);
  }

  const teamScoresMap = new Map<number, number[]>();
  for (const s of allScores) {
    if (teamIds.has(s.teamId)) {
      if (!teamScoresMap.has(s.teamId)) teamScoresMap.set(s.teamId, []);
      teamScoresMap.get(s.teamId)!.push(s.score);
    }
  }

  return teams
    .map((team) => {
      const sub = submissionMap.get(team.id);
      const scores = teamScoresMap.get(team.id) ?? [];
      const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
      const voteCount = voteCounts.get(team.id) ?? 0;
      return {
        rank: 0,
        teamId: team.id,
        teamName: team.name,
        projectTitle: sub?.projectTitle ?? team.projectTitle,
        githubUrl: sub?.githubUrl ?? team.githubUrl ?? null,
        demoUrl: sub?.demoUrl ?? null,
        slidesUrl: sub?.slidesUrl ?? null,
        voteCount,
        percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 1000) / 10 : 0,
        averageJudgeScore: avgScore,
        judgesScored: scores.length,
      };
    })
    .sort((a, b) => b.voteCount - a.voteCount || (b.averageJudgeScore ?? 0) - (a.averageJudgeScore ?? 0))
    .map((t, i) => ({ ...t, rank: i + 1 }));
}

// ─── Current active event public results (backward compat) ───────────────────
router.get("/results", async (_req: Request, res: Response) => {
  const configs = await db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id));
  const config = configs[0];

  // Try to get from active hackathon first
  const [activeHackathon] = await db.select().from(hackathonsTable).where(eq(hackathonsTable.status, "active")).orderBy(desc(hackathonsTable.id));
  const isPublished = activeHackathon?.resultsPublished ?? config?.resultsPublished ?? false;
  const publishedAt = isPublished ? (activeHackathon?.updatedAt?.toISOString() ?? config?.updatedAt?.toISOString() ?? null) : null;

  let teams;
  if (activeHackathon) {
    teams = await db.select().from(teamsTable).where(eq(teamsTable.hackathonId, activeHackathon.id));
  } else {
    teams = await db.select().from(teamsTable);
  }

  if (!isPublished) {
    res.json({ isPublished: false, publishedAt: null, winner: null, rankedTeams: [] });
    return;
  }

  const rankedTeams = await computeResults(teams);
  const winner = rankedTeams[0] ?? null;

  res.json({ isPublished, publishedAt, winner, rankedTeams });
});

// ─── All hackathons public summary ───────────────────────────────────────────
router.get("/results/hackathons", async (_req: Request, res: Response) => {
  const hackathons = await db.select().from(hackathonsTable).orderBy(desc(hackathonsTable.id));
  const allTeams = await db.select().from(teamsTable);

  const summaries = await Promise.all(
    hackathons.map(async (h) => {
      const hTeams = allTeams.filter((t) => t.hackathonId === h.id);
      let winner = null;

      if (h.resultsPublished && hTeams.length > 0) {
        const ranked = await computeResults(hTeams);
        winner = ranked[0] ? { teamName: ranked[0].teamName, projectTitle: ranked[0].projectTitle, voteCount: ranked[0].voteCount } : null;
      }

      return {
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description ?? null,
        tagline: h.tagline ?? null,
        status: h.status,
        phase: h.phase,
        resultsPublished: h.resultsPublished,
        prizePool: h.prizePool ?? null,
        grandPrize: h.grandPrize ?? null,
        totalTeams: hTeams.length,
        winner,
        createdAt: h.createdAt.toISOString(),
      };
    })
  );

  res.json(summaries);
});

// ─── Per-hackathon results ─────────────────────────────────────────────────────
router.get("/results/hackathon/:slug", async (req: Request, res: Response) => {
  const slug = String(req.params.slug);
  const [hackathon] = await db.select().from(hackathonsTable).where(eq(hackathonsTable.slug, slug));
  if (!hackathon) {
    res.status(404).json({ error: "not_found", message: "Hackathon not found" });
    return;
  }

  const teams = await db.select().from(teamsTable).where(eq(teamsTable.hackathonId, hackathon.id));
  const judgeCodes = await db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "judge"));

  if (!hackathon.resultsPublished) {
    res.json({
      hackathon: {
        id: hackathon.id, name: hackathon.name, slug: hackathon.slug,
        status: hackathon.status, phase: hackathon.phase,
        prizePool: hackathon.prizePool ?? null, grandPrize: hackathon.grandPrize ?? null,
        tagline: hackathon.tagline ?? null,
      },
      isPublished: false,
      winner: null,
      rankedTeams: [],
      totalTeams: teams.length,
      totalJudges: judgeCodes.length,
    });
    return;
  }

  const rankedTeams = await computeResults(teams);

  res.json({
    hackathon: {
      id: hackathon.id, name: hackathon.name, slug: hackathon.slug,
      status: hackathon.status, phase: hackathon.phase,
      prizePool: hackathon.prizePool ?? null, grandPrize: hackathon.grandPrize ?? null,
      tagline: hackathon.tagline ?? null,
    },
    isPublished: true,
    publishedAt: hackathon.updatedAt.toISOString(),
    winner: rankedTeams[0] ?? null,
    rankedTeams,
    totalTeams: teams.length,
    totalJudges: judgeCodes.length,
  });
});

// ─── Export results CSV (admin) ───────────────────────────────────────────────
router.get("/results/export", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const teams = await db.select().from(teamsTable);
  const rankedTeams = await computeResults(teams);

  const header = "Rank,Team ID,Team Name,Project Title,Vote Count,Percentage,Avg Judge Score\n";
  const csvRows = rankedTeams.map((r) =>
    `${r.rank},${r.teamId},"${r.teamName}","${r.projectTitle}",${r.voteCount},${r.percentage}%,${r.averageJudgeScore ?? "—"}`
  ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=hackaegis-results.csv");
  res.send(header + csvRows);
});

export default router;
