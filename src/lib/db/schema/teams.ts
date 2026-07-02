import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { events, problemStatements } from "./events";
import { users } from "./users";

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  inviteCode: varchar("invite_code", { length: 20 }).unique().notNull(),
  leaderId: uuid("leader_id").references(() => users.id).notNull(),
  problemStatementId: uuid("problem_statement_id").references(() => problemStatements.id),
  status: varchar("status", { length: 20 }).default("forming").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).default("member").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("team_members_team_user_idx").on(table.teamId, table.userId),
]);

export const teamJoinRequests = pgTable("team_join_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by").references(() => users.id),
});
