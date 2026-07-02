import { pgTable, uuid, varchar, text, timestamp, jsonb, inet, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { events } from "./events";
import { users } from "./users";

// THE CORE IP — IMMUTABLE, APPEND-ONLY
// No updated_at, no deleted_at. Once written, never modified.
export const transparencyLogs = pgTable("transparency_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  eventId: uuid("event_id").references(() => events.id),
  actorId: uuid("actor_id").references(() => users.id).notNull(),
  actorRole: varchar("actor_role", { length: 20 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("transparency_logs_event_entity_idx").on(table.eventId, table.entityType, table.createdAt),
  index("transparency_logs_actor_idx").on(table.actorId, table.createdAt),
]);
