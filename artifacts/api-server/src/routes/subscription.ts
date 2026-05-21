import { Router } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpsertSubscriptionBody } from "@workspace/api-zod";
import { getAuth } from "@clerk/express";

const router = Router();

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  pro: 50,
  premium: 999,
};

router.get("/subscription", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId || "anonymous";
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (!sub) {
    // Return default free tier
    const [created] = await db.insert(subscriptionsTable).values({
      plan: "free",
      status: "active",
      signalsPerDay: 5,
      userId,
    }).returning();
    res.json(created);
    return;
  }
  res.json(sub);
});

router.post("/subscription", async (req, res): Promise<void> => {
  const parsed = UpsertSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId || "anonymous";
  const plan = parsed.data.plan as "free" | "pro" | "premium";
  const signalsPerDay = PLAN_LIMITS[plan] ?? 5;

  const existing = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  let sub;
  if (existing.length > 0) {
    [sub] = await db.update(subscriptionsTable)
      .set({ plan, signalsPerDay, status: "active" })
      .where(eq(subscriptionsTable.userId, userId))
      .returning();
  } else {
    [sub] = await db.insert(subscriptionsTable).values({ plan, signalsPerDay, status: "active", userId }).returning();
  }
  res.json(sub);
});

export default router;
