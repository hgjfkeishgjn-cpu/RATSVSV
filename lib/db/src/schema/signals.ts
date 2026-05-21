import { pgTable, text, serial, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalActionEnum = pgEnum("signal_action", ["BUY", "SELL", "HOLD"]);
export const timeframeEnum = pgEnum("timeframe", ["1m", "5m", "15m", "1h", "4h", "1d"]);
export const assetClassEnum = pgEnum("asset_class", ["crypto", "stocks", "forex", "commodities"]);

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  action: signalActionEnum("action").notNull(),
  confidence: real("confidence").notNull(),
  reasoning: text("reasoning").notNull(),
  timeframe: timeframeEnum("timeframe").notNull(),
  entryPrice: real("entry_price").notNull(),
  targetPrice: real("target_price").notNull(),
  stopLoss: real("stop_loss").notNull(),
  riskRewardRatio: real("risk_reward_ratio"),
  assetClass: assetClassEnum("asset_class").notNull().default("crypto"),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, createdAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;
