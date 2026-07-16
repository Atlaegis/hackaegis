import { Router, type IRouter, type Request, type Response } from "express";
import { db, teamsTable, votesTable, pollsTable, adminLogsTable, hackathonsTable, participationCodesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
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

async function getActiveHackathonId(): Promise<number | null> {
  const [h] = await db.select({ id: hackathonsTable.id }).from(hackathonsTable).where(eq(hackathonsTable.status, "active")).orderBy(desc(hackathonsTable.id));
  return h?.id ?? null;
}

function formatTeam(team: typeof teamsTable.$inferSelect, members?: Array<{ id: number; code: string; label: string | null }>) {
  return {
    id: team.id,
    hackathonId: team.hackathonId ?? null,
    name: team.name,
    projectTitle: team.projectTitle,
    description: team.description ?? null,
    githubUrl: team.githubUrl ?? null,
    isFinalist: (team as typeof team & { isFinalist?: boolean }).isFinalist ?? false,
    domain: team.domain ?? null,
    status: team.status ?? "active",
    disqualifiedAt: team.disqualifiedAt?.toISOString() ?? null,
    presentationSlot: team.presentationSlot?.toISOString() ?? null,
    createdAt: team.createdAt.toISOString(),
    members: members ?? [],
  };
}

// List all teams — filtered by hackathonId query param, or active hackathon if ?active=true, or all if no filter
router.get("/teams", async (req: Request, res: Response) => {
  let hackathonId: number | null = null;

  if (req.query.hackathonId) {
    hackathonId = parseInt(String(req.query.hackathonId), 10);
  } else if (req.query.active === "true") {
    hackathonId = await getActiveHackathonId();
  }

  let teams;
  if (hackathonId !== null) {
    teams = await db.select().from(teamsTable).where(eq(teamsTable.hackathonId, hackathonId)).orderBy(teamsTable.createdAt);
  } else {
    teams = await db.select().from(teamsTable).orderBy(teamsTable.createdAt);
  }

  // Get member codes linked to each team
  const allCodes = await db.select().from(participationCodesTable).where(eq(participationCodesTable.role, "participant"));
  const membersByTeam = new Map<number, Array<{ id: number; code: string; label: string | null }>>();
  for (const code of allCodes) {
    if (code.teamId !== null && code.teamId !== undefined) {
      if (!membersByTeam.has(code.teamId)) membersByTeam.set(code.teamId, []);
      membersByTeam.get(code.teamId)!.push({ id: code.id, code: code.code, label: code.label });
    }
  }

  res.json(teams.map((t) => formatTeam(t, membersByTeam.get(t.id) ?? [])));
});

// Create team (admin only)
router.post("/teams", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const parse = CreateTeamBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid team data" });
    return;
  }

  // Auto-assign to active hackathon if hackathonId not provided
  let hackathonId = typeof req.body.hackathonId === "number" ? req.body.hackathonId : null;
  if (!hackathonId) hackathonId = await getActiveHackathonId();

  const domain = req.body.domain ? String(req.body.domain).trim().slice(0, 50) : null;
  const presentationSlot = req.body.presentationSlot ? new Date(req.body.presentationSlot) : null;

  const [team] = await db.insert(teamsTable).values({ ...parse.data, hackathonId, domain, presentationSlot }).returning();
  await logAction("create_team", `Created team ${team.name} for hackathon ${hackathonId}`);
  res.status(201).json(formatTeam(team, []));
});

// Update team (admin only)
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

  const updateData: Record<string, unknown> = { ...parse.data };
  if (req.body.domain !== undefined) updateData.domain = req.body.domain ? String(req.body.domain).trim().slice(0, 50) : null;
  if (req.body.presentationSlot !== undefined) updateData.presentationSlot = req.body.presentationSlot ? new Date(req.body.presentationSlot) : null;

  const [team] = await db.update(teamsTable).set(updateData).where(eq(teamsTable.id, id)).returning();
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  await logAction("update_team", `Updated team ${team.name}`);
  res.json(formatTeam(team, []));
});

// Delete team (admin only)
router.delete("/teams/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid team ID" });
    return;
  }

  // Unlink participant codes from this team
  await db.update(participationCodesTable).set({ teamId: null }).where(eq(participationCodesTable.teamId, id));

  const [deleted] = await db.delete(teamsTable).where(eq(teamsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  await logAction("delete_team", `Deleted team ${deleted.name}`);
  res.json({ success: true, message: "Team deleted" });
});

// Admin: assign participant code to a team
router.post("/teams/:id/assign-code", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const teamId = parseInt(String(req.params.id), 10);
  const { code } = req.body ?? {};
  if (!code) {
    res.status(400).json({ error: "validation_error", message: "code is required" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "not_found", message: "Team not found" });
    return;
  }

  const [found] = await db.select().from(participationCodesTable).where(eq(participationCodesTable.code, String(code).toUpperCase()));
  if (!found || found.role !== "participant") {
    res.status(404).json({ error: "not_found", message: "Participant code not found" });
    return;
  }

  const [updated] = await db.update(participationCodesTable).set({ teamId }).where(eq(participationCodesTable.id, found.id)).returning();
  await logAction("assign_code_to_team", `Code ${found.code} → team ${team.name}`);
  res.json({ success: true, code: updated.code, teamId, teamName: team.name });
});

// Admin: unassign participant code from team
router.post("/teams/unassign-code", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const { code } = req.body ?? {};
  if (!code) {
    res.status(400).json({ error: "validation_error", message: "code is required" });
    return;
  }

  const [updated] = await db.update(participationCodesTable).set({ teamId: null }).where(eq(participationCodesTable.code, String(code).toUpperCase())).returning();
  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Code not found" });
    return;
  }

  await logAction("unassign_code", `Unassigned code ${updated.code} from team`);
  res.json({ success: true });
});

// Admin: toggle finalist status for a team
router.post("/teams/:id/finalist", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }
  const { isFinalist } = req.body ?? {};
  const updateData = { isFinalist: !!isFinalist } as Partial<typeof teamsTable.$inferInsert> & { isFinalist?: boolean };
  const [updated] = await db.update(teamsTable).set(updateData).where(eq(teamsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "not_found" }); return; }
  await logAction("toggle_finalist", `Team ${updated.name} finalist = ${isFinalist}`);
  res.json(formatTeam(updated, []));
});

// Leaderboard
router.get("/teams/leaderboard", async (_req: Request, res: Response) => {
  const hackathonId = await getActiveHackathonId();
  let teams;
  if (hackathonId) {
    teams = await db.select().from(teamsTable).where(eq(teamsTable.hackathonId, hackathonId)).orderBy(teamsTable.createdAt);
  } else {
    teams = await db.select().from(teamsTable).orderBy(teamsTable.createdAt);
  }

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
