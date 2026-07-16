import { Router, type IRouter, type Request, type Response } from "express";
import { db, registrationsTable, participationCodesTable, adminLogsTable, hackathonsTable, teamsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { extractToken, getSessionFromToken, generateParticipantCode } from "../lib/auth";
import { registrationRateLimit } from "../middlewares/rateLimiter";

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

function sanitizeString(val: unknown, maxLen: number): string {
  return String(val ?? "").trim().slice(0, maxLen);
}

// ─── Public: submit registration ─────────────────────────────────────────────
router.post("/register", registrationRateLimit, async (req: Request, res: Response) => {
  const { hackathonId, fullName, email, teamName, phone, memberCount, paymentMode, notes, teamMembers } = req.body ?? {};

  const cleanFullName = sanitizeString(fullName, 120);
  const cleanEmail = sanitizeString(email, 200).toLowerCase();
  const cleanTeamName = sanitizeString(teamName, 100);
  const cleanPhone = phone ? sanitizeString(phone, 30) : null;
  const cleanNotes = notes ? sanitizeString(notes, 1000) : null;
  const cleanPaymentMode = ["upi"].includes(String(paymentMode)) ? String(paymentMode) : "upi";
  const cleanMemberCount = typeof memberCount === "number" && memberCount >= 1 && memberCount <= 6
    ? memberCount
    : typeof memberCount === "string" && !isNaN(Number(memberCount))
      ? Math.min(Math.max(1, parseInt(memberCount, 10)), 6)
      : 1;

  if (!cleanFullName || !cleanEmail || !cleanTeamName) {
    res.status(400).json({ error: "validation_error", message: "fullName, email, and teamName are required" });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: "validation_error", message: "Invalid email address" });
    return;
  }

  if (cleanTeamName.length < 2) {
    res.status(400).json({ error: "validation_error", message: "Team name must be at least 2 characters" });
    return;
  }

  if (cleanFullName.length < 2) {
    res.status(400).json({ error: "validation_error", message: "Full name must be at least 2 characters" });
    return;
  }

  let cleanTeamMembers: Array<{ fullName: string; email: string; phone: string }> | null = null;
  if (cleanMemberCount > 1 && Array.isArray(teamMembers) && teamMembers.length > 0) {
    cleanTeamMembers = teamMembers.slice(0, cleanMemberCount).map((m: any) => ({
      fullName: sanitizeString(m?.fullName, 120),
      email: sanitizeString(m?.email, 200).toLowerCase(),
      phone: m?.phone ? sanitizeString(m.phone, 30) : "",
    }));
    for (let i = 0; i < cleanTeamMembers.length; i++) {
      const member = cleanTeamMembers[i];
      if (!member.fullName || member.fullName.length < 2) {
        res.status(400).json({ error: "validation_error", message: `Team member ${i + 1} must have a full name (2+ characters)` });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
        res.status(400).json({ error: "validation_error", message: `Team member ${i + 1} has an invalid email address` });
        return;
      }
    }
  }

  let resolvedHackathonId: number | null = hackathonId ? parseInt(String(hackathonId), 10) : null;
  if (!resolvedHackathonId || isNaN(resolvedHackathonId)) {
    const [active] = await db.select({ id: hackathonsTable.id }).from(hackathonsTable).where(eq(hackathonsTable.status, "active")).orderBy(desc(hackathonsTable.id));
    resolvedHackathonId = active?.id ?? null;
  }

  const [reg] = await db.insert(registrationsTable).values({
    hackathonId: resolvedHackathonId,
    fullName: cleanFullName,
    email: cleanEmail,
    teamName: cleanTeamName,
    phone: cleanPhone,
    memberCount: cleanMemberCount,
    teamMembers: cleanTeamMembers,
    paymentMode: cleanPaymentMode,
    paymentStatus: "pending",
    notes: cleanNotes,
  }).returning();

  await logAction("registration_submitted", `Team: ${cleanTeamName}, Email: ${cleanEmail}`);
  res.status(201).json({ id: reg.id, message: "Registration submitted. Admin will review and assign your code." });
});

// ─── Admin: list all registrations ───────────────────────────────────────────
router.get("/admin/registrations", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const regs = await db.select().from(registrationsTable).orderBy(desc(registrationsTable.createdAt));
  res.json(regs.map((r) => ({
    id: r.id,
    hackathonId: r.hackathonId ?? null,
    fullName: r.fullName,
    email: r.email,
    teamName: r.teamName,
    phone: r.phone ?? null,
    memberCount: r.memberCount,
    teamMembers: r.teamMembers ?? null,
    paymentMode: r.paymentMode,
    paymentStatus: r.paymentStatus,
    notes: r.notes ?? null,
    participantCode: r.participantCode ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

// ─── Admin: approve registration + generate code ──────────────────────────────
router.post("/admin/registrations/:id/approve", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const [reg] = await db.select().from(registrationsTable).where(eq(registrationsTable.id, id));
  if (!reg) {
    res.status(404).json({ error: "not_found", message: "Registration not found" });
    return;
  }

  if (reg.paymentStatus === "approved" && reg.participantCode) {
    res.json({ message: "Already approved", code: reg.participantCode });
    return;
  }

  // Generate a unique participant code
  let code = generateParticipantCode();
  let attempts = 0;
  while (attempts < 20) {
    const [existing] = await db.select().from(participationCodesTable).where(eq(participationCodesTable.code, code));
    if (!existing) break;
    code = generateParticipantCode();
    attempts++;
  }

  // Resolve hackathon for the team (fall back to active hackathon)
  let teamHackathonId = reg.hackathonId ?? null;
  if (!teamHackathonId) {
    const [active] = await db.select({ id: hackathonsTable.id }).from(hackathonsTable).where(eq(hackathonsTable.status, "active")).orderBy(desc(hackathonsTable.id));
    teamHackathonId = active?.id ?? null;
  }

  // Find an existing team with the same name in this hackathon, or create one
  let team = teamHackathonId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.hackathonId, teamHackathonId)))
        .find((t) => t.name.toLowerCase() === reg.teamName.toLowerCase())
    : undefined;

  if (!team) {
    const [createdTeam] = await db.insert(teamsTable).values({
      hackathonId: teamHackathonId,
      name: reg.teamName,
      projectTitle: "TBD",
    }).returning();
    team = createdTeam;
  }

  // Insert into participation_codes, linked directly to the team
  await db.insert(participationCodesTable).values({
    code,
    role: "participant",
    label: `${reg.fullName} (${reg.teamName})`,
    isReusable: false,
    isUsed: false,
    teamId: team.id,
  });

  // Update registration
  const [updated] = await db.update(registrationsTable)
    .set({ paymentStatus: "approved", participantCode: code })
    .where(eq(registrationsTable.id, id))
    .returning();

  await logAction("registration_approved", `Reg #${id} (${reg.teamName}) → code assigned & linked to team #${team.id}`);
  res.json({ message: "Approved", code: updated.participantCode, registration: updated, teamId: team.id });
});

// ─── Admin: reject registration ───────────────────────────────────────────────
router.post("/admin/registrations/:id/reject", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const [updated] = await db.update(registrationsTable)
    .set({ paymentStatus: "rejected" })
    .where(eq(registrationsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  await logAction("registration_rejected", `Reg #${id} (${updated.teamName})`);
  res.json({ message: "Rejected", registration: updated });
});

// ─── Admin: get all access credentials (access portal) ──────────────────────
router.get("/admin/access-portal", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const [codes, regs] = await Promise.all([
    db.select().from(participationCodesTable).orderBy(participationCodesTable.role, participationCodesTable.id),
    db.select().from(registrationsTable).orderBy(desc(registrationsTable.createdAt)),
  ]);

  const adminCodes = codes.filter((c) => c.role === "admin");
  const judgeCodes = codes.filter((c) => c.role === "judge");
  const participantCodes = codes.filter((c) => c.role === "participant");

  res.json({
    adminCodes: adminCodes.map((c) => ({ id: c.id, code: c.code, label: c.label ?? "Admin", isReusable: c.isReusable })),
    judgeCodes: judgeCodes.map((c) => ({ id: c.id, code: c.code, label: c.label ?? "Judge", isReusable: c.isReusable })),
    participantCodes: participantCodes.map((c) => ({ id: c.id, code: c.code, label: c.label, isUsed: c.isUsed, teamId: c.teamId ?? null })),
    registrations: regs.map((r) => ({
      id: r.id, fullName: r.fullName, email: r.email, teamName: r.teamName,
      paymentStatus: r.paymentStatus, participantCode: r.participantCode ?? null,
    })),
    summary: {
      totalAdmin: adminCodes.length,
      totalJudges: judgeCodes.length,
      totalParticipants: participantCodes.length,
      totalRegistrations: regs.length,
      pendingRegistrations: regs.filter((r) => r.paymentStatus === "pending").length,
      approvedRegistrations: regs.filter((r) => r.paymentStatus === "approved").length,
    },
  });
});

export default router;
