import { pgTable, text, serial, boolean, timestamp, integer, varchar, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Hackathons (multi-event support) ────────────────────────────────────────
export const hackathonsTable = pgTable("hackathons", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  tagline: varchar("tagline", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("upcoming"),
  phase: varchar("phase", { length: 50 }).notNull().default("registration"),
  streamUrl: text("stream_url"),
  streamActive: boolean("stream_active").notNull().default(false),
  resultsPublished: boolean("results_published").notNull().default(false),
  judgeResultsVisible: boolean("judge_results_visible").notNull().default(false),
  prizePool: varchar("prize_pool", { length: 100 }),
  grandPrize: varchar("grand_prize", { length: 100 }),
  submissionLocked: boolean("submission_locked").notNull().default(false),
  // Live meet (Jitsi)
  jitsiRoom: varchar("jitsi_room", { length: 255 }),
  meetMode: varchar("meet_mode", { length: 20 }).notNull().default("youtube"), // youtube | jitsi | both
  jitsiPassword: varchar("jitsi_password", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHackathonSchema = createInsertSchema(hackathonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHackathon = z.infer<typeof insertHackathonSchema>;
export type Hackathon = typeof hackathonsTable.$inferSelect;

// ─── Unified access codes (participants, admins, judges) ────────────────────
export const participationCodesTable = pgTable("participation_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  role: varchar("role", { length: 20 }).notNull().default("participant"),
  label: varchar("label", { length: 255 }),
  isReusable: boolean("is_reusable").notNull().default(false),
  isUsed: boolean("is_used").notNull().default(false),
  usedAt: timestamp("used_at"),
  teamId: integer("team_id"),
  domain: varchar("domain", { length: 50 }),
  email: varchar("email", { length: 255 }),
  bio: text("bio"),
  yearsOfExperience: integer("years_of_experience"),
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

// ─── Keep admins table for backward compat ──────────────────────────────────
export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Admin = typeof adminsTable.$inferSelect;

// ─── Teams (scoped to a hackathon) ───────────────────────────────────────────
export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  hackathonId: integer("hackathon_id"),
  name: varchar("name", { length: 255 }).notNull(),
  projectTitle: varchar("project_title", { length: 500 }).notNull(),
  description: text("description"),
  githubUrl: text("github_url"),
  isFinalist: boolean("is_finalist").notNull().default(false),
  domain: varchar("domain", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  disqualifiedAt: timestamp("disqualified_at"),
  disqualifiedBy: integer("disqualified_by"),
  presentationSlot: timestamp("presentation_slot"),
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

// ─── Judge Scores ─────────────────────────────────────────────────────────────
export const judgeScoresTable = pgTable("judge_scores", {
  id: serial("id").primaryKey(),
  judgeId: integer("judge_id").notNull(),
  teamId: integer("team_id").notNull(),
  score: real("score").notNull(),
  innovation: real("innovation"),
  execution: real("execution"),
  presentation: real("presentation"),
  // New 7-criteria scoring (100-point scale)
  innovationProblemSolving: real("innovation_problem_solving"),
  technicalExcellence: real("technical_excellence"),
  realWorldImpact: real("real_world_impact"),
  uiUxExperience: real("ui_ux_experience"),
  presentationCommunication: real("presentation_communication"),
  completionFunctionality: real("completion_functionality"),
  teamworkManagement: real("teamwork_management"),
  totalScore: real("total_score"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type JudgeScore = typeof judgeScoresTable.$inferSelect;

// ─── Judge Team Locks ────────────────────────────────────────────────────────
export const judgeTeamLocksTable = pgTable("judge_team_locks", {
  id: serial("id").primaryKey(),
  judgeId: integer("judge_id").notNull(),
  teamId: integer("team_id").notNull(),
  lockedAt: timestamp("locked_at").notNull().defaultNow(),
  unlockedAt: timestamp("unlocked_at"),
});

export type JudgeTeamLock = typeof judgeTeamLocksTable.$inferSelect;

// ─── Judge Announcements ─────────────────────────────────────────────────────
export const judgeAnnouncementsTable = pgTable("judge_announcements", {
  id: serial("id").primaryKey(),
  hackathonId: integer("hackathon_id"),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type JudgeAnnouncement = typeof judgeAnnouncementsTable.$inferSelect;

// ─── Team Attendance ─────────────────────────────────────────────────────────
export const teamAttendanceTable = pgTable("team_attendance", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  hackathonId: integer("hackathon_id"),
  presentationSlot: timestamp("presentation_slot").notNull(),
  joinedAt: timestamp("joined_at"),
  isLate: boolean("is_late").notNull().default(false),
  minutesLate: integer("minutes_late").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TeamAttendance = typeof teamAttendanceTable.$inferSelect;

// ─── Registrations ────────────────────────────────────────────────────────────
export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  hackathonId: integer("hackathon_id"),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  teamName: varchar("team_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  memberCount: integer("member_count").notNull().default(1),
  teamMembers: jsonb("team_members"),
  paymentMode: varchar("payment_mode", { length: 20 }).notNull().default("upi"),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
  notes: text("notes"),
  participantCode: varchar("participant_code", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(registrationsTable).omit({ id: true, createdAt: true });
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;

// ─── Polls & Votes ────────────────────────────────────────────────────────────
export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  hackathonId: integer("hackathon_id"),
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

// ─── Event Config (legacy — kept for OpenAPI compat) ─────────────────────────
export const eventConfigTable = pgTable("event_config", {
  id: serial("id").primaryKey(),
  phase: varchar("phase", { length: 50 }).notNull().default("registration"),
  streamUrl: text("stream_url"),
  streamActive: boolean("stream_active").notNull().default(false),
  resultsPublished: boolean("results_published").notNull().default(false),
  judgeResultsVisible: boolean("judge_results_visible").notNull().default(false),
  eventName: varchar("event_name", { length: 255 }).notNull().default("HackAegis 2025"),
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
