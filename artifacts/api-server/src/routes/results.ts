import { Router, type IRouter, type Request, type Response } from "express";
import { db, votesTable, teamsTable, pollsTable, eventConfigTable } from "@workspace/db";
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

router.get("/results", async (_req: Request, res: Response) => {
  const configs = await db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id));
  const config = configs[0];
  
  const teams = await db.select().from(teamsTable);
  const polls = await db.select().from(pollsTable);

  const allVotes = await db.select().from(votesTable);
  const totalVotes = allVotes.length;

  const voteCounts = new Map<number, number>();
  for (const vote of allVotes) {
    voteCounts.set(vote.teamId, (voteCounts.get(vote.teamId) ?? 0) + 1);
  }

  const rankedTeams = teams
    .map((team, idx) => ({
      rank: idx + 1,
      teamId: team.id,
      teamName: team.name,
      projectTitle: team.projectTitle,
      voteCount: voteCounts.get(team.id) ?? 0,
      percentage: totalVotes > 0 ? Math.round(((voteCounts.get(team.id) ?? 0) / totalVotes) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.voteCount - a.voteCount)
    .map((t, idx) => ({ ...t, rank: idx + 1 }));

  const winner = rankedTeams[0] ?? null;
  const isPublished = config?.resultsPublished ?? false;
  const publishedAt = isPublished ? (config?.updatedAt?.toISOString() ?? null) : null;

  res.json({ isPublished, publishedAt, winner: isPublished ? winner : null, rankedTeams: isPublished ? rankedTeams : [] });
});

router.get("/results/export", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const teams = await db.select().from(teamsTable);
  const allVotes = await db.select().from(votesTable);
  const totalVotes = allVotes.length;

  const voteCounts = new Map<number, number>();
  for (const vote of allVotes) {
    voteCounts.set(vote.teamId, (voteCounts.get(vote.teamId) ?? 0) + 1);
  }

  const rows = teams
    .map(team => ({
      teamId: team.id,
      teamName: team.name,
      projectTitle: team.projectTitle,
      voteCount: voteCounts.get(team.id) ?? 0,
      percentage: totalVotes > 0 ? Math.round(((voteCounts.get(team.id) ?? 0) / totalVotes) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.voteCount - a.voteCount);

  const header = "Rank,Team ID,Team Name,Project Title,Vote Count,Percentage\n";
  const csvRows = rows.map((r, idx) =>
    `${idx + 1},${r.teamId},"${r.teamName}","${r.projectTitle}",${r.voteCount},${r.percentage}%`
  ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=hackforge-results.csv");
  res.send(header + csvRows);
});

export default router;
