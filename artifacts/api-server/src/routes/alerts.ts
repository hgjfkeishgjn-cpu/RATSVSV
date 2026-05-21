import { Router } from "express";
import { db, alertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateAlertBody, DeleteAlertParams } from "@workspace/api-zod";

const router = Router();

router.get("/alerts", async (_req, res): Promise<void> => {
  const items = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt));
  res.json(items);
});

router.post("/alerts", async (req, res): Promise<void> => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [alert] = await db.insert(alertsTable).values({
    symbol: parsed.data.symbol.toUpperCase(),
    alertType: parsed.data.alertType as "price_above" | "price_below" | "signal_buy" | "signal_sell",
    threshold: parsed.data.threshold ?? null,
    isActive: true,
  }).returning();
  res.status(201).json(alert);
});

router.delete("/alerts/:id", async (req, res): Promise<void> => {
  const params = DeleteAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(alertsTable).where(eq(alertsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
