import { Router, type IRouter, type Request, type Response } from "express";
import { db, teamsTable, votesTable, pollsTable, adminLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateTeamBody } from "@workspace/api-zod";
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

function formatTeam(team: typeof teamsTable.$inferSelect) {
  return {
    id: team.id,
    name: team.name,
    projectTitle: team.projectTitle,
    description: team.description ?? null,
    githubUrl: team.githubUrl ?? null,
    createdAt: team.createdAt.toISOString(),
  };
}

router.get("/teams", async (_req: Request, res: Response) => {
  const teams = await db.select().from(teamsTable).orderBy(teamsTable.createdAt);
  res.json(teams.map(formatTeam));
});

router.get("/teams/with-dummy-auth", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);
  if (!session) {
    res.status(401).json({ error: "unauthorized", message: "Team access required" });
    return;
  }

  const teams = await db.select().from(teamsTable).orderBy(teamsTable.createdAt);
  const [activePoll] = await db.select().from(pollsTable).where(eq(pollsTable.isActive, true));
  const votes = activePoll ? await db.select().from(votesTable).where(eq(votesTable.pollId, activePoll.id)) : [];
  const totalVotes = votes.length;
  const voteCounts = new Map<number, number>();
  for (const vote of votes) voteCounts.set(vote.teamId, (voteCounts.get(vote.teamId) ?? 0) + 1);

  res.json({
    auth: {
      token: session.token,
      role: session.isAdmin ? "admin" : session.isJudge ? "judge" : "participant",
      codeId: session.codeId,
      note: "Dummy team auth: uses existing code-based session and projects team access state",
    },
    teams: teams.map((team) => ({
      ...formatTeam(team),
      voteCount: voteCounts.get(team.id) ?? 0,
      percentage: totalVotes > 0 ? Math.round(((voteCounts.get(team.id) ?? 0) / totalVotes) * 1000) / 10 : 0,
    })),
  });
});

router.post("/teams", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const parse = CreateTeamBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid team data" });
    return;
  }

  const [team] = await db.insert(teamsTable).values(parse.data).returning();
  await logAction("create_team", `Created team ${team.name}`);
  res.status(201).json(formatTeam(team));
});

router.put("/teams/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid team ID" });
    return;
  }

  const parse = CreateTeamBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid team data" });
    return;
  }

  const [team] = await db.update(teamsTable).set(parse.data).where(eq(teamsTable.id, id)).returning();
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  await logAction("update_team", `Updated team ${team.name}`);
  res.json(formatTeam(team));
});

router.delete("/teams/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid team ID" });
    return;
  }

  const [deleted] = await db.delete(teamsTable).where(eq(teamsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  await logAction("delete_team", `Deleted team ${deleted.name}`);
  res.json({ success: true, message: "Team deleted" });
});

router.get("/teams/leaderboard", async (_req: Request, res: Response) => {
  const teams = await db.select().from(teamsTable).orderBy(teamsTable.createdAt);

  const [activePoll] = await db.select().from(pollsTable).where(eq(pollsTable.isActive, true));
  if (!activePoll && !teams.length) {
    res.json([]);
    return;
  }

  const votes = activePoll ? await db.select().from(votesTable).where(eq(votesTable.pollId, activePoll.id)) : [];
  const totalVotes = votes.length;
  const voteCounts = new Map<number, number>();
  for (const vote of votes) voteCounts.set(vote.teamId, (voteCounts.get(vote.teamId) ?? 0) + 1);

  const leaderboard = teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    projectTitle: team.projectTitle,
    voteCount: voteCounts.get(team.id) ?? 0,
    percentage: totalVotes > 0 ? Math.round(((voteCounts.get(team.id) ?? 0) / totalVotes) * 100 * 10) / 10 : 0,
  }));

  leaderboard.sort((a, b) => b.voteCount - a.voteCount);
  res.json(leaderboard);
});

export default router;
