import { Router, type IRouter, type Request, type Response } from "express";
import { db, pollsTable, votesTable, teamsTable, adminLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreatePollBody } from "@workspace/api-zod";
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

async function buildPollWithResults(poll: typeof pollsTable.$inferSelect) {
  const votes = await db.select().from(votesTable).where(eq(votesTable.pollId, poll.id));
  const teams = await db.select().from(teamsTable);
  const totalVotes = votes.length;
  const voteCounts = new Map<number, number>();
  for (const vote of votes) {
    voteCounts.set(vote.teamId, (voteCounts.get(vote.teamId) ?? 0) + 1);
  }

  const results = teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    projectTitle: team.projectTitle,
    voteCount: voteCounts.get(team.id) ?? 0,
    percentage: totalVotes > 0 ? Math.round(((voteCounts.get(team.id) ?? 0) / totalVotes) * 100 * 10) / 10 : 0,
  }));

  results.sort((a, b) => b.voteCount - a.voteCount);

  return {
    id: poll.id,
    question: poll.question,
    isActive: poll.isActive,
    isFrozen: poll.isFrozen,
    totalVotes,
    results,
  };
}

router.get("/polls", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const polls = await db.select().from(pollsTable).orderBy(desc(pollsTable.createdAt));
  const pollsWithCounts = await Promise.all(
    polls.map(async poll => {
      const votes = await db.select().from(votesTable).where(eq(votesTable.pollId, poll.id));
      return {
        id: poll.id,
        question: poll.question,
        isActive: poll.isActive,
        isFrozen: poll.isFrozen,
        totalVotes: votes.length,
        createdAt: poll.createdAt.toISOString(),
      };
    })
  );
  res.json(pollsWithCounts);
});

router.post("/polls", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const parse = CreatePollBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "Question is required" });
    return;
  }

  const [poll] = await db.insert(pollsTable).values({
    question: parse.data.question,
    isActive: false,
    isFrozen: false,
  }).returning();

  await logAction("create_poll", `Created poll: ${parse.data.question}`);
  res.status(201).json({ id: poll.id, question: poll.question, isActive: poll.isActive, isFrozen: poll.isFrozen, totalVotes: 0, createdAt: poll.createdAt.toISOString() });
});

router.get("/polls/active", async (_req: Request, res: Response) => {
  const [poll] = await db.select().from(pollsTable).where(and(eq(pollsTable.isActive, true), eq(pollsTable.isFrozen, false)));
  if (!poll) {
    const [frozen] = await db.select().from(pollsTable).where(eq(pollsTable.isFrozen, true));
    if (!frozen) {
      res.status(404).json({ error: "no_active_poll", message: "No active poll" });
      return;
    }
    res.json(await buildPollWithResults(frozen));
    return;
  }
  res.json(await buildPollWithResults(poll));
});

router.post("/polls/:id/activate", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid poll ID" });
    return;
  }

  await db.update(pollsTable).set({ isActive: false, isFrozen: false }).where(eq(pollsTable.isActive, true));
  const [poll] = await db.update(pollsTable).set({ isActive: true, isFrozen: false }).where(eq(pollsTable.id, id)).returning();

  if (!poll) {
    res.status(404).json({ error: "not_found", message: "Poll not found" });
    return;
  }

  await logAction("activate_poll", `Activated poll: ${poll.question}`);
  const votes = await db.select().from(votesTable).where(eq(votesTable.pollId, poll.id));
  res.json({ id: poll.id, question: poll.question, isActive: poll.isActive, isFrozen: poll.isFrozen, totalVotes: votes.length, createdAt: poll.createdAt.toISOString() });
});

router.post("/polls/:id/deactivate", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid poll ID" });
    return;
  }

  const [poll] = await db.update(pollsTable).set({ isActive: false, isFrozen: true }).where(eq(pollsTable.id, id)).returning();
  if (!poll) {
    res.status(404).json({ error: "not_found", message: "Poll not found" });
    return;
  }

  await logAction("deactivate_poll", `Deactivated/frozen poll: ${poll.question}`);
  const votes = await db.select().from(votesTable).where(eq(votesTable.pollId, poll.id));
  res.json({ id: poll.id, question: poll.question, isActive: poll.isActive, isFrozen: poll.isFrozen, totalVotes: votes.length, createdAt: poll.createdAt.toISOString() });
});

router.get("/polls/:id/results", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid poll ID" });
    return;
  }
  const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, id));
  if (!poll) {
    res.status(404).json({ error: "not_found", message: "Poll not found" });
    return;
  }
  res.json(await buildPollWithResults(poll));
});

export default router;
