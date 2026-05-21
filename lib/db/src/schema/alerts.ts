import { pgTable, text, serial, timestamp, real, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertTypeEnum = pgEnum("alert_type", ["price_above", "price_below", "signal_buy", "signal_sell"]);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  alertType: alertTypeEnum("alert_type").notNull(),
  threshold: real("threshold"),
  isActive: boolean("is_active").notNull().default(true),
  userId: text("user_id"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true, triggeredAt: true, isActive: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
