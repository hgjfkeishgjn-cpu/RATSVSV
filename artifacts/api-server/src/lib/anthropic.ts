import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY must be set");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface MarketContext {
  symbol: string;
  timeframe: string;
  assetClass: string;
  simulatedPrice: number;
  simulatedChange: number;
  simulatedVolume: number;
}

export async function generateTradingSignal(ctx: MarketContext): Promise<{
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasoning: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
}> {
  const prompt = `You are a professional quantitative trading analyst. Analyze the following market data and generate a trading signal.

Symbol: ${ctx.symbol}
Asset Class: ${ctx.assetClass}
Timeframe: ${ctx.timeframe}
Current Price: $${ctx.simulatedPrice.toFixed(4)}
24h Change: ${ctx.simulatedChange > 0 ? "+" : ""}${ctx.simulatedChange.toFixed(2)}%
Volume: ${ctx.simulatedVolume.toLocaleString()}

Based on typical market patterns, momentum indicators, and risk management principles for ${ctx.symbol} on the ${ctx.timeframe} timeframe, provide a trading signal.

Respond ONLY with a valid JSON object in this exact format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <number 0-100>,
  "reasoning": "<concise 1-2 sentence analysis>",
  "entryPrice": <number>,
  "targetPrice": <number>,
  "stopLoss": <number>,
  "riskRewardRatio": <number>
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    action: parsed.action as "BUY" | "SELL" | "HOLD",
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence))),
    reasoning: String(parsed.reasoning),
    entryPrice: Number(parsed.entryPrice) || ctx.simulatedPrice,
    targetPrice: Number(parsed.targetPrice) || ctx.simulatedPrice * 1.05,
    stopLoss: Number(parsed.stopLoss) || ctx.simulatedPrice * 0.97,
    riskRewardRatio: Number(parsed.riskRewardRatio) || 2,
  };
}
