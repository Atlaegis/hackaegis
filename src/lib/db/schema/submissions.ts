import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { teams } from "./teams";
import { events } from "./events";

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  projectTitle: varchar("project_title", { length: 255 }),
  projectDescription: text("project_description"),
  githubUrl: text("github_url"),
  deploymentUrl: text("deployment_url"),
  demoVideoUrl: text("demo_video_url"),
  pptUrl: text("ppt_url"),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("submissions_team_event_idx").on(table.teamId, table.eventId),
]);
