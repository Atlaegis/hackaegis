import { pgTable, text, serial, boolean, timestamp, integer, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Unified access codes (participants, admins, judges) ────────────────────
export const participationCodesTable = pgTable("participation_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  role: varchar("role", { length: 20 }).notNull().default("participant"), // 'participant' | 'admin' | 'judge'
  label: varchar("label", { length: 255 }), // display name for judges / admins
  isReusable: boolean("is_reusable").notNull().default(false), // admin/judge codes are reusable
  isUsed: boolean("is_used").notNull().default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertParticipationCodeSchema = createInsertSchema(participationCodesTable).omit({ id: true, createdAt: true });
export type InsertParticipationCode = z.infer<typeof insertParticipationCodeSchema>;
export type ParticipationCode = typeof participationCodesTable.$inferSelect;

// ─── Sessions ───────────────────────────────────────────────────────────────
export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  codeId: integer("code_id").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  isJudge: boolean("is_judge").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Session = typeof sessionsTable.$inferSelect;

// ─── Keep admins table for backward compat (not used for login anymore) ─────
export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Admin = typeof adminsTable.$inferSelect;

// ─── Teams ───────────────────────────────────────────────────────────────────
export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  projectTitle: varchar("project_title", { length: 500 }).notNull(),
  description: text("description"),
  githubUrl: text("github_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true, createdAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;

// ─── Submissions ─────────────────────────────────────────────────────────────
export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().unique(),
  projectTitle: varchar("project_title", { length: 500 }),
  description: text("description"),
  githubUrl: text("github_url"),
  demoUrl: text("demo_url"),
  slidesUrl: text("slides_url"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Submission = typeof submissionsTable.$inferSelect;

// ─── Judge Scores (judgeId = participationCodesTable.id for role='judge') ────
export const judgeScoresTable = pgTable("judge_scores", {
  id: serial("id").primaryKey(),
  judgeId: integer("judge_id").notNull(), // references participationCodesTable.id where role='judge'
  teamId: integer("team_id").notNull(),
  score: real("score").notNull(),
  innovation: real("innovation"),
  execution: real("execution"),
  presentation: real("presentation"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type JudgeScore = typeof judgeScoresTable.$inferSelect;

// ─── Polls & Votes ───────────────────────────────────────────────────────────
export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  isFrozen: boolean("is_frozen").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Poll = typeof pollsTable.$inferSelect;

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  codeId: integer("code_id").notNull(),
  teamId: integer("team_id").notNull(),
  pollId: integer("poll_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Vote = typeof votesTable.$inferSelect;

// ─── Event Config ─────────────────────────────────────────────────────────────
export const eventConfigTable = pgTable("event_config", {
  id: serial("id").primaryKey(),
  phase: varchar("phase", { length: 50 }).notNull().default("registration"),
  streamUrl: text("stream_url"),
  streamActive: boolean("stream_active").notNull().default(false),
  resultsPublished: boolean("results_published").notNull().default(false),
  judgeResultsVisible: boolean("judge_results_visible").notNull().default(false),
  eventName: varchar("event_name", { length: 255 }).notNull().default("HackForge 2025"),
  tagline: varchar("tagline", { length: 500 }).notNull().default("Build. Improve. Pitch. Win."),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type EventConfig = typeof eventConfigTable.$inferSelect;

// ─── Admin Logs ───────────────────────────────────────────────────────────────
export const adminLogsTable = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminLog = typeof adminLogsTable.$inferSelect;
