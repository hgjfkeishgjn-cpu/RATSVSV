import Anthropic from "@anthropic-ai/sdk";
import type { MultiTimeframeAnalysis } from "./technicalAnalysis";
import { calcTPSL } from "./technicalAnalysis";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY must be set");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function fmt(n: number, dec = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function buildSignalPrompt(analysis: MultiTimeframeAnalysis, assetClass: string): string {
  const { symbol, currentPrice, indicators1h, indicators5m } = analysis;
  const p = currentPrice;
  const dec = p < 1 ? 6 : p < 10 ? 4 : 2;
  const h = indicators1h;
  const m = indicators5m;

  const priceVsBB =
    p > h.bbUpper ? "Above upper band (overbought zone)" :
    p < h.bbLower ? "Below lower band (oversold zone)" :
    p > h.bbMiddle ? "Between middle and upper (bullish zone)" :
    "Between lower and middle (bearish zone)";

  return `You are a professional quantitative trading analyst. Analyze the following REAL technical data and generate a precise trading signal.

ASSET: ${symbol} (${assetClass})
CURRENT PRICE: ${fmt(p, dec)}
TIMEFRAME: 5-minute entry signal based on 1-hour trend analysis

=== 1-HOUR TREND CONTEXT (50 candles) ===
RSI(14): ${h.rsi14.toFixed(1)} ${h.rsi14 > 70 ? "→ OVERBOUGHT" : h.rsi14 < 30 ? "→ OVERSOLD" : "→ Neutral"}
EMA9:  ${fmt(h.ema9, dec)} | EMA21: ${fmt(h.ema21, dec)} | EMA50: ${fmt(h.ema50, dec)}
EMA Alignment: ${h.trend} (${h.ema9 > h.ema21 ? "9>21" : "9<21"}, ${h.ema21 > h.ema50 ? "21>50" : "21<50"})
MACD Line: ${h.macd.toFixed(4)} | Signal: ${h.macdSignal.toFixed(4)} | Histogram: ${h.macdHistogram > 0 ? "+" : ""}${h.macdHistogram.toFixed(4)} (${h.macdHistogram > 0 ? "Bullish" : "Bearish"} momentum)
Bollinger Bands: Upper ${fmt(h.bbUpper, dec)} | Middle ${fmt(h.bbMiddle, dec)} | Lower ${fmt(h.bbLower, dec)}
Price Position: ${priceVsBB}
ATR(14): ${fmt(h.atr14, dec)} (${((h.atr14 / p) * 100).toFixed(2)}% of price)
Key Resistance: ${fmt(h.resistance, dec)} | Key Support: ${fmt(h.support, dec)}
Overall Trend: ${h.trend} | Momentum: ${h.momentum}

=== 5-MINUTE ENTRY CONTEXT (recent candles) ===
RSI(14): ${m.rsi14.toFixed(1)}
EMA9: ${fmt(m.ema9, dec)} | EMA21: ${fmt(m.ema21, dec)}
Short-term trend: ${m.trend} | Short-term momentum: ${m.momentum}
MACD Histogram: ${m.macdHistogram > 0 ? "+" : ""}${m.macdHistogram.toFixed(4)}

=== INSTRUCTIONS ===
Based on these REAL indicator readings, determine:
1. Trade direction (BUY/SELL/HOLD) — must be consistent with indicator confluence
2. Confidence level (0-100) — reflect how many indicators align
3. Brief reasoning (1-2 sentences) citing the actual indicator values above

Rules:
- BUY if: RSI not overbought, EMA bullish alignment OR oversold bounce, MACD bullish crossover/momentum
- SELL if: RSI not oversold, EMA bearish alignment OR overbought rejection, MACD bearish
- HOLD if: conflicting signals, RSI neutral, mixed MACD, sideways trend
- Confidence above 80 only if 4+ indicators agree
- Reference specific indicator values in your reasoning

Respond ONLY with valid JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "reasoning": "<1-2 sentences referencing actual values>"
}`;
}

export interface SignalResult {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasoning: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
}

export async function generateTradingSignal(
  analysis: MultiTimeframeAnalysis,
  assetClass: string
): Promise<SignalResult> {
  const prompt = buildSignalPrompt(analysis, assetClass);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  const parsed = JSON.parse(jsonMatch[0]);
  const action = parsed.action as "BUY" | "SELL" | "HOLD";
  const confidence = Math.min(100, Math.max(0, Number(parsed.confidence)));
  const reasoning = String(parsed.reasoning);

  // TP/SL calculated deterministically from ATR — not from AI output
  const levels = calcTPSL(action, analysis.currentPrice, analysis.indicators1h);

  return { action, confidence, reasoning, ...levels };
}

// Kept for backward compat with chat route
export { anthropic as default };
