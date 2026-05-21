import { Router } from "express";
import { anthropic } from "../lib/anthropic";
import { getLivePrices } from "../lib/marketData";

const router = Router();

const LIVE_SYMBOLS = ["BTC", "ETH", "SOL", "GOLD", "NASDAQ", "EURUSD", "GBPUSD", "USDJPY", "SP500", "OIL", "SILVER"];

function buildSystemPrompt(prices: Array<{ symbol: string; price: number; changePercent24h: number; change24h: number }>): string {
  const priceLines = prices.map(p => {
    const dir = p.changePercent24h >= 0 ? "+" : "";
    return `  ${p.symbol}: ${p.price.toLocaleString()} (${dir}${p.changePercent24h.toFixed(2)}% today, ${dir}${p.change24h.toFixed(2)} change)`;
  }).join("\n");

  const now = new Date().toUTCString();

  return `You are ALPHA, an elite institutional trading analyst at a top-tier hedge fund. You have 20 years of experience trading equities, commodities, FX, and crypto across all market cycles.

LIVE MARKET DATA (as of ${now}):
${priceLines}

YOUR ROLE:
- Give sharp, direct, actionable trading intelligence — no fluff, no disclaimers
- Think like a professional: discuss support/resistance, momentum, risk:reward, position sizing
- Reference the live prices above when discussing specific assets
- Use professional trading terminology naturally
- If asked for a trade idea, give specific entry, target, and stop levels
- For multi-asset questions, compare correlations, macro context, and relative strength
- Stay concise and high-density — traders don't have time for bloat

PERSONALITY:
- Confident but not arrogant. Direct and precise.
- Think Bloomberg Terminal meets Ray Dalio — macro-aware, data-driven, risk-first
- You can express conviction: "I like this setup" or "this is a low-probability trade"
- Never refuse to engage with a trading question — give your best professional assessment
- No disclaimers like "this is not financial advice" — you are a professional at a hedge fund talking to a colleague

FORMAT:
- Use short paragraphs, not bullet lists unless listing levels
- Bold key price levels with **price** format when relevant
- Keep responses under 200 words unless the question genuinely requires depth
- For trade setups: Entry | Target | Stop | R:R on a single line is clean`;
}

router.post("/chat", async (req, res): Promise<void> => {
  const { messages } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const prices = await getLivePrices(LIVE_SYMBOLS);
    const systemPrompt = buildSystemPrompt(prices);

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        const text = chunk.delta.text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

export default router;
