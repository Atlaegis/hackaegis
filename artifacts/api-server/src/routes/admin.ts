import { Router, type IRouter, type Request, type Response } from "express";
import { db, participationCodesTable, teamsTable, votesTable, pollsTable, eventConfigTable, adminLogsTable } from "@workspace/db";
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

router.get("/admin/dashboard", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const [codes, teams, votes, activePoll, configs] = await Promise.all([
    db.select().from(participationCodesTable),
    db.select().from(teamsTable),
    db.select().from(votesTable),
    db.select().from(pollsTable).where(eq(pollsTable.isActive, true)).then(r => r[0] ?? null),
    db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id)).then(r => r[0] ?? null),
  ]);

  const usedCodes = codes.filter(c => c.isUsed);
  const uniqueVoters = new Set(votes.map(v => v.codeId));

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
  });
});

router.get("/admin/logs", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const logs = await db.select().from(adminLogsTable).orderBy(desc(adminLogsTable.createdAt)).limit(100);
  res.json(logs.map(l => ({
    id: l.id,
    action: l.action,
    details: l.details ?? null,
    createdAt: l.createdAt.toISOString(),
  })));
});

export default router;
