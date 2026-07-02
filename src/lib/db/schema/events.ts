import { pgTable, uuid, varchar, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  bannerUrl: text("banner_url"),
  registrationStart: timestamp("registration_start", { withTimezone: true }).notNull(),
  registrationEnd: timestamp("registration_end", { withTimezone: true }).notNull(),
  eventStart: timestamp("event_start", { withTimezone: true }).notNull(),
  eventEnd: timestamp("event_end", { withTimezone: true }).notNull(),
  submissionDeadline: timestamp("submission_deadline", { withTimezone: true }),
  registrationFeeAmount: integer("registration_fee_amount").default(0),
  registrationFeeCurrency: varchar("registration_fee_currency", { length: 3 }).default("INR"),
  maxParticipants: integer("max_participants"),
  minTeamSize: integer("min_team_size").default(2),
  maxTeamSize: integer("max_team_size").default(4),
  teamLockDeadline: timestamp("team_lock_deadline", { withTimezone: true }),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  rules: text("rules"),
  prizesDescription: text("prizes_description"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const eventRoles = pgTable("event_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  assignedBy: uuid("assigned_by").references(() => users.id),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal"),
  isPinned: boolean("is_pinned").default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const problemStatements = pgTable("problem_statements", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  objectives: text("objectives"),
  deliverables: text("deliverables"),
  constraints: text("constraints"),
  evaluationFocus: text("evaluation_focus"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
