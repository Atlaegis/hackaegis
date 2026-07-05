import { relations } from "drizzle-orm";
import { users } from "./users";
import { organizations } from "./organizations";
import { events, eventRoles, announcements, problemStatements } from "./events";
import { teams, teamMembers, teamJoinRequests } from "./teams";
import { submissions } from "./submissions";
import { evaluations, evaluationScores } from "./evaluations";
import { transparencyLogs } from "./transparency";
import { payments } from "./payments";
import { notifications } from "./notifications";

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  teamMemberships: many(teamMembers),
  eventRoles: many(eventRoles),
  evaluationsAsJudge: many(evaluations),
  payments: many(payments),
  notifications: many(notifications),
}));

// Organization relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  events: many(events),
}));

// Event relations
export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  roles: many(eventRoles),
  teams: many(teams),
  announcements: many(announcements),
  problemStatements: many(problemStatements),
  submissions: many(submissions),
}));

// Event roles relations
export const eventRolesRelations = relations(eventRoles, ({ one }) => ({
  event: one(events, {
    fields: [eventRoles.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRoles.userId],
    references: [users.id],
  }),
}));

// Team relations
export const teamsRelations = relations(teams, ({ one, many }) => ({
  event: one(events, {
    fields: [teams.eventId],
    references: [events.id],
  }),
  leader: one(users, {
    fields: [teams.leaderId],
    references: [users.id],
  }),
  problemStatement: one(problemStatements, {
    fields: [teams.problemStatementId],
    references: [problemStatements.id],
  }),
  members: many(teamMembers),
  joinRequests: many(teamJoinRequests),
  submissions: many(submissions),
}));

// Team member relations
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

// Team join requests relations
export const teamJoinRequestsRelations = relations(teamJoinRequests, ({ one }) => ({
  team: one(teams, {
    fields: [teamJoinRequests.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamJoinRequests.userId],
    references: [users.id],
  }),
}));

// Submission relations
export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  team: one(teams, {
    fields: [submissions.teamId],
    references: [teams.id],
  }),
  event: one(events, {
    fields: [submissions.eventId],
    references: [events.id],
  }),
  evaluations: many(evaluations),
}));

// Evaluation relations
export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  submission: one(submissions, {
    fields: [evaluations.submissionId],
    references: [submissions.id],
  }),
  judge: one(users, {
    fields: [evaluations.judgeId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [evaluations.eventId],
    references: [events.id],
  }),
  scores: many(evaluationScores),
}));

// Evaluation scores relations
export const evaluationScoresRelations = relations(evaluationScores, ({ one }) => ({
  evaluation: one(evaluations, {
    fields: [evaluationScores.evaluationId],
    references: [evaluations.id],
  }),
}));

// Announcements relations
export const announcementsRelations = relations(announcements, ({ one }) => ({
  event: one(events, {
    fields: [announcements.eventId],
    references: [events.id],
  }),
}));

// Problem statements relations
export const problemStatementsRelations = relations(problemStatements, ({ one }) => ({
  event: one(events, {
    fields: [problemStatements.eventId],
    references: [events.id],
  }),
}));

// Transparency logs relations
export const transparencyLogsRelations = relations(transparencyLogs, ({ one }) => ({
  actor: one(users, {
    fields: [transparencyLogs.actorId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [transparencyLogs.eventId],
    references: [events.id],
  }),
}));

// Payment relations
export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [payments.eventId],
    references: [events.id],
  }),
}));

// Notification relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [notifications.eventId],
    references: [events.id],
  }),
}));
