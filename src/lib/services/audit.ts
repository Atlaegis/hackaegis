import { db } from "@/lib/db";
import { transparencyLogs } from "@/lib/db/schema";

interface AuditLogParams {
  organizationId?: string;
  eventId?: string;
  actorId: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  action: string;
  previousState?: unknown;
  newState?: unknown;
  reason?: string;
  ipAddress?: string;
}

export async function logTransparencyEvent(params: AuditLogParams): Promise<void> {
  // This function MUST NOT swallow errors.
  // If audit logging fails, the parent mutation must also fail.
  await db.insert(transparencyLogs).values({
    organizationId: params.organizationId,
    eventId: params.eventId,
    actorId: params.actorId,
    actorRole: params.actorRole,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    previousState: params.previousState ?? null,
    newState: params.newState ?? null,
    reason: params.reason ?? null,
    ipAddress: params.ipAddress ?? null,
  });
}
