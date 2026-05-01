import { Router, type IRouter, type Request, type Response } from "express";
import { db, votesTable, pollsTable, teamsTable, sessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CastVoteBody } from "@workspace/api-zod";
import { extractToken, getSessionFromToken } from "../lib/auth";

const router: IRouter = Router();

async function requireParticipant(req: Request, res: Response): Promise<typeof sessionsTable.$inferSelect | null> {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);
  if (!session) {
    res.status(401).json({ error: "unauthorized", message: "Authentication required" });
    return null;
  }
  return session;
}

router.post("/votes", async (req: Request, res: Response) => {
  const session = await requireParticipant(req, res);
  if (!session) return;

  const parse = CastVoteBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "teamId is required" });
    return;
  }
  const { teamId } = parse.data;

  const [activePoll] = await db.select().from(pollsTable).where(and(eq(pollsTable.isActive, true), eq(pollsTable.isFrozen, false)));
  if (!activePoll) {
    res.status(400).json({ error: "no_active_poll", message: "No active poll" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(400).json({ error: "invalid_team", message: "Team not found" });
    return;
  }

  const [existingVote] = await db
    .select()
    .from(votesTable)
    .where(and(eq(votesTable.codeId, session.codeId), eq(votesTable.pollId, activePoll.id)));

  if (existingVote) {
    res.status(409).json({ error: "already_voted", message: "You have already voted in this poll" });
    return;
  }

  const [vote] = await db.insert(votesTable).values({
    codeId: session.codeId,
    teamId,
    pollId: activePoll.id,
  }).returning();

  res.status(201).json({
    id: vote.id,
    teamId: vote.teamId,
    teamName: team.name,
    pollId: vote.pollId,
    createdAt: vote.createdAt.toISOString(),
  });
});

router.get("/votes/my-vote", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);

  if (!session) {
    res.json({ hasVoted: false, votedForTeamId: null, votedForTeamName: null });
    return;
  }

  const [activePoll] = await db.select().from(pollsTable).where(eq(pollsTable.isActive, true));
  if (!activePoll) {
    res.json({ hasVoted: false, votedForTeamId: null, votedForTeamName: null });
    return;
  }

  const [existingVote] = await db
    .select()
    .from(votesTable)
    .where(and(eq(votesTable.codeId, session.codeId), eq(votesTable.pollId, activePoll.id)));

  if (!existingVote) {
    res.json({ hasVoted: false, votedForTeamId: null, votedForTeamName: null });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, existingVote.teamId));
  res.json({
    hasVoted: true,
    votedForTeamId: existingVote.teamId,
    votedForTeamName: team?.name ?? null,
  });
});

export default router;
