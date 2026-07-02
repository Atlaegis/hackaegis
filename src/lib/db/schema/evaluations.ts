import { pgTable, uuid, varchar, text, decimal, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { submissions } from "./submissions";
import { events } from "./events";
import { users } from "./users";

export const evaluations = pgTable("evaluations", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id").references(() => submissions.id).notNull(),
  judgeId: uuid("judge_id").references(() => users.id).notNull(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  totalWeightedScore: decimal("total_weighted_score", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  verdict: varchar("verdict", { length: 20 }),
  // MANDATORY FEEDBACK — THE USP
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  recommendations: text("recommendations"),
  eliminationReason: text("elimination_reason"),
  // Judge-only field, NEVER shown to participants
  internalNotes: text("internal_notes"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("evaluations_submission_judge_idx").on(table.submissionId, table.judgeId),
]);

export const evaluationScores = pgTable("evaluation_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  evaluationId: uuid("evaluation_id").references(() => evaluations.id).notNull(),
  criteriaKey: varchar("criteria_key", { length: 50 }).notNull(),
  score: decimal("score", { precision: 5, scale: 2 }).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  comment: text("comment"),
}, (table) => [
  uniqueIndex("eval_scores_eval_criteria_idx").on(table.evaluationId, table.criteriaKey),
]);
