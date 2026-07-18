import { Router, type IRouter, type Request, type Response } from "express";
import { db, resourcesTable, announcementsTable, certificatesTable, participationCodesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

// ─── Resources ───────────────────────────────────────────────────────────────

router.get("/cms/resources", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);
  const isAdmin = session?.isAdmin ?? false;

  if (isAdmin) {
    const resources = await db.select().from(resourcesTable).orderBy(resourcesTable.sortOrder);
    res.json(resources);
  } else {
    const resources = await db.select().from(resourcesTable).where(eq(resourcesTable.isPublished, true)).orderBy(resourcesTable.sortOrder);
    res.json(resources);
  }
});

router.post("/cms/resources", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const { title, description, category, url, fileType, sortOrder, hackathonId } = req.body ?? {};
  if (!title) {
    res.status(400).json({ error: "validation_error", message: "title is required" });
    return;
  }
  const [inserted] = await db.insert(resourcesTable).values({
    title: String(title).slice(0, 255),
    description: description ? String(description) : null,
    category: category ? String(category).slice(0, 50) : "general",
    url: url ? String(url) : null,
    fileType: fileType ? String(fileType).slice(0, 20) : null,
    sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    hackathonId: hackathonId ? parseInt(String(hackathonId), 10) : null,
  }).returning();
  res.status(201).json(inserted);
});

router.put("/cms/resources/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }

  const updates: Record<string, unknown> = {};
  if (req.body?.title !== undefined) updates.title = String(req.body.title).slice(0, 255);
  if (req.body?.description !== undefined) updates.description = req.body.description ? String(req.body.description) : null;
  if (req.body?.category !== undefined) updates.category = String(req.body.category).slice(0, 50);
  if (req.body?.url !== undefined) updates.url = req.body.url ? String(req.body.url) : null;
  if (req.body?.fileType !== undefined) updates.fileType = req.body.fileType ? String(req.body.fileType).slice(0, 20) : null;
  if (req.body?.sortOrder !== undefined) updates.sortOrder = parseInt(String(req.body.sortOrder), 10);
  if (req.body?.isPublished !== undefined) updates.isPublished = !!req.body.isPublished;

  const [updated] = await db.update(resourcesTable).set(updates).where(eq(resourcesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "not_found" }); return; }
  res.json(updated);
});

router.delete("/cms/resources/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }
  const [deleted] = await db.delete(resourcesTable).where(eq(resourcesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ success: true });
});

// ─── Announcements ───────────────────────────────────────────────────────────

router.get("/cms/announcements", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);
  const isAdmin = session?.isAdmin ?? false;

  if (isAdmin) {
    const announcements = await db.select().from(announcementsTable).orderBy(announcementsTable.createdAt);
    res.json(announcements);
  } else {
    const announcements = await db.select().from(announcementsTable).where(eq(announcementsTable.isPublished, true)).orderBy(announcementsTable.createdAt);
    res.json(announcements);
  }
});

router.post("/cms/announcements", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const { title, content, priority, targetRole, hackathonId } = req.body ?? {};
  if (!title || !content) {
    res.status(400).json({ error: "validation_error", message: "title and content are required" });
    return;
  }
  const [inserted] = await db.insert(announcementsTable).values({
    title: String(title).slice(0, 255),
    content: String(content),
    priority: priority ? String(priority).slice(0, 20) : "normal",
    targetRole: targetRole ? String(targetRole).slice(0, 20) : "all",
    hackathonId: hackathonId ? parseInt(String(hackathonId), 10) : null,
  }).returning();
  res.status(201).json(inserted);
});

router.put("/cms/announcements/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }

  const updates: Record<string, unknown> = {};
  if (req.body?.title !== undefined) updates.title = String(req.body.title).slice(0, 255);
  if (req.body?.content !== undefined) updates.content = String(req.body.content);
  if (req.body?.priority !== undefined) updates.priority = String(req.body.priority).slice(0, 20);
  if (req.body?.targetRole !== undefined) updates.targetRole = String(req.body.targetRole).slice(0, 20);
  if (req.body?.isPublished !== undefined) updates.isPublished = !!req.body.isPublished;

  const [updated] = await db.update(announcementsTable).set(updates).where(eq(announcementsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "not_found" }); return; }
  res.json(updated);
});

router.delete("/cms/announcements/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }
  const [deleted] = await db.delete(announcementsTable).where(eq(announcementsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ success: true });
});

// ─── Certificates ────────────────────────────────────────────────────────────

router.get("/cms/certificates", async (req: Request, res: Response) => {
  const token = extractToken(req.headers.authorization);
  const session = await getSessionFromToken(token);
  if (!session) {
    res.status(401).json({ error: "unauthorized", message: "Authentication required" });
    return;
  }

  // Admins can see all certificates
  if (session.isAdmin) {
    const teamId = req.query.teamId ? parseInt(String(req.query.teamId), 10) : null;
    if (teamId) {
      const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.teamId, teamId));
      res.json(certs);
    } else {
      const certs = await db.select().from(certificatesTable).orderBy(certificatesTable.issuedAt);
      res.json(certs);
    }
    return;
  }

  // Non-admins can only see their own team's certificates
  const [code] = await db.select().from(participationCodesTable).where(eq(participationCodesTable.id, session.codeId));
  if (code?.teamId) {
    const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.teamId, code.teamId));
    res.json(certs);
  } else {
    res.json([]);
  }
});

router.post("/cms/certificates", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const { teamId, type, url, hackathonId } = req.body ?? {};
  if (!teamId) {
    res.status(400).json({ error: "validation_error", message: "teamId is required" });
    return;
  }
  const [inserted] = await db.insert(certificatesTable).values({
    teamId: parseInt(String(teamId), 10),
    type: type ? String(type).slice(0, 50) : "participation",
    url: url ? String(url) : null,
    hackathonId: hackathonId ? parseInt(String(hackathonId), 10) : null,
  }).returning();
  res.status(201).json(inserted);
});

router.delete("/cms/certificates/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }
  const [deleted] = await db.delete(certificatesTable).where(eq(certificatesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ success: true });
});

export default router;
