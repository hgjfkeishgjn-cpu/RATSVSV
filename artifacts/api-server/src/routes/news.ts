import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  category: "crypto" | "forex" | "stocks" | "macro";
}

function parseRSS(xml: string, source: string, category: NewsItem["category"]): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
      ?? block.match(/<guid>(https?:\/\/[^\s<]+)<\/guid>/)?.[1]?.trim() ?? "#";
    const desc = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.trim() ?? "";
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? new Date().toISOString();
    if (!title) continue;
    items.push({
      id: Buffer.from(link).toString("base64").slice(0, 16),
      title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
      summary: desc.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").slice(0, 200).trim(),
      url: link,
      source,
      publishedAt: new Date(pubDate).toISOString(),
      category,
    });
  }
  return items.slice(0, 10);
}

const FEEDS: Array<{ url: string; source: string; category: NewsItem["category"] }> = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk", category: "crypto" },
  { url: "https://cointelegraph.com/rss", source: "CoinTelegraph", category: "crypto" },
  { url: "https://www.fxstreet.com/rss/news", source: "FXStreet", category: "forex" },
  { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters", category: "macro" },
];

let newsCache: NewsItem[] = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchFeeds(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AlphaSignal/1.0)",
          "Accept": "application/rss+xml, application/xml, text/xml",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`${feed.source} ${res.status}`);
      const xml = await res.text();
      return parseRSS(xml, feed.source, feed.category);
    })
  );

  const items: NewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
  }

  // Sort by date, dedup
  return items
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item, idx, arr) => arr.findIndex(i => i.id === item.id) === idx)
    .slice(0, 40);
}

// Fallback simulated news if all feeds fail
function simulatedNews(): NewsItem[] {
  const templates = [
    { title: "Bitcoin breaks key resistance as institutional demand surges", category: "crypto" as const, source: "AlphaSignal" },
    { title: "EUR/USD holds above 1.08 ahead of ECB decision", category: "forex" as const, source: "AlphaSignal" },
    { title: "Gold consolidates near all-time highs amid geopolitical tensions", category: "macro" as const, source: "AlphaSignal" },
    { title: "NASDAQ 100 extends rally; tech sector leads gains", category: "stocks" as const, source: "AlphaSignal" },
    { title: "Fed signals cautious approach to rate cuts, dollar strengthens", category: "macro" as const, source: "AlphaSignal" },
    { title: "Ethereum ETF inflows hit record; DeFi TVL climbs to $90B", category: "crypto" as const, source: "AlphaSignal" },
    { title: "GBP/USD retreats as UK inflation data disappoints", category: "forex" as const, source: "AlphaSignal" },
    { title: "Crude oil spikes on OPEC production cut speculation", category: "macro" as const, source: "AlphaSignal" },
    { title: "Solana network activity surges; SOL breaks 6-month high", category: "crypto" as const, source: "AlphaSignal" },
    { title: "S&P 500 nears resistance; earnings season kicks off", category: "stocks" as const, source: "AlphaSignal" },
  ];

  return templates.map((t, i) => ({
    id: `sim-${i}`,
    title: t.title,
    summary: "Markets are reacting to macro signals and technical breakouts as traders position ahead of key events.",
    url: "#",
    source: t.source,
    publishedAt: new Date(Date.now() - i * 18 * 60 * 1000).toISOString(),
    category: t.category,
  }));
}

router.get("/news", async (_req, res): Promise<void> => {
  const now = Date.now();
  if (newsCache.length > 0 && now - cacheTime < CACHE_TTL) {
    res.json(newsCache);
    return;
  }

  try {
    const items = await fetchFeeds();
    if (items.length > 0) {
      newsCache = items;
      cacheTime = now;
      res.json(items);
    } else {
      res.json(simulatedNews());
    }
  } catch (err) {
    logger.warn({ err }, "News fetch error");
    res.json(simulatedNews());
  }
});

export default router;
