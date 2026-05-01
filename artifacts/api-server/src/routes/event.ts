import { Router, type IRouter, type Request, type Response } from "express";
import { db, eventConfigTable, adminLogsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { UpdateEventStatusBody } from "@workspace/api-zod";
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

async function getOrCreateConfig() {
  const configs = await db.select().from(eventConfigTable).orderBy(desc(eventConfigTable.id));
  if (configs[0]) return configs[0];
  const [config] = await db.insert(eventConfigTable).values({}).returning();
  return config;
}

function formatConfig(config: typeof eventConfigTable.$inferSelect) {
  return {
    phase: config.phase,
    streamUrl: config.streamUrl ?? null,
    streamActive: config.streamActive,
    resultsPublished: config.resultsPublished,
    eventName: config.eventName,
    tagline: config.tagline,
    updatedAt: config.updatedAt.toISOString(),
  };
}

router.get("/event/status", async (_req: Request, res: Response) => {
  const config = await getOrCreateConfig();
  res.json(formatConfig(config));
});

router.put("/event/status", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const parse = UpdateEventStatusBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid event status data" });
    return;
  }

  const config = await getOrCreateConfig();
  const updateData: Partial<typeof eventConfigTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parse.data.phase !== undefined) updateData.phase = parse.data.phase;
  if (parse.data.streamUrl !== undefined) updateData.streamUrl = parse.data.streamUrl;
  if (parse.data.streamActive !== undefined) updateData.streamActive = parse.data.streamActive;
  if (parse.data.resultsPublished !== undefined) updateData.resultsPublished = parse.data.resultsPublished;
  if (parse.data.eventName !== undefined) updateData.eventName = parse.data.eventName;
  if (parse.data.tagline !== undefined) updateData.tagline = parse.data.tagline;

  const { eq } = await import("drizzle-orm");
  const [updated] = await db
    .update(eventConfigTable)
    .set(updateData)
    .where(eq(eventConfigTable.id, config.id))
    .returning();

  await logAction("update_event_status", `Phase: ${updated.phase}, Stream: ${updated.streamActive}`);
  res.json(formatConfig(updated));
});

export default router;
