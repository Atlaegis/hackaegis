import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { events } from "./events";
import { teams } from "./teams";

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("INR").notNull(),
  razorpayOrderId: varchar("razorpay_order_id", { length: 255 }),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 255 }),
  razorpaySignature: varchar("razorpay_signature", { length: 255 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
