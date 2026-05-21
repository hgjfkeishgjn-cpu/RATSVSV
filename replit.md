# AlphaSignal

AI-powered trading signal SaaS — a high-density terminal for self-directed traders with real-time signals, portfolio tracking, watchlist, and alerts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/trading-signals run dev` — run the frontend (port 22428)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query
- Auth: Clerk (Replit-managed), @clerk/react + @clerk/express
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Anthropic claude-sonnet-4-6 (user's own ANTHROPIC_API_KEY)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/trading-signals/` — React + Vite frontend, all pages in `src/pages/`
- `artifacts/api-server/` — Express 5 backend, routes in `src/routes/`
- `artifacts/api-server/src/lib/anthropic.ts` — AI signal generation via Anthropic
- `artifacts/api-server/src/lib/marketData.ts` — simulated market data (no external API)
- `artifacts/api-server/src/middlewares/requireAuth.ts` — Clerk auth middleware
- `lib/db/src/schema/` — Drizzle ORM schema (signals, watchlist, portfolio, alerts, subscriptions)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — generated React Query hooks and Zod schemas
- `lib/api-zod/src/generated/` — generated server-side Zod schemas

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks on client, Zod schemas on server
- Market data is fully simulated with realistic price simulation (no external API keys needed)
- AI signals generated on-demand via Anthropic API; stored in DB for history and analytics
- Clerk proxy is handled by the Express server at `/clerk-proxy`, keeping auth secure server-side
- Dark-first terminal UI — all pages are dark by default with neon accent colors (emerald/rose/amber for BUY/SELL/HOLD)

## Product

- **Dashboard** — Signal summary stats, recent activity feed, top performers, trending momentum
- **Signals** — Filterable signal matrix: BUY/SELL/HOLD, confidence bars, entry/target/stop prices, risk:reward
- **Generate Signal** — AI-powered signal generation via Anthropic for any symbol/timeframe/asset class
- **Watchlist** — Track symbols with notes, see recent signals per symbol
- **Portfolio** — Position tracker with P&L calculations (dollar and percent), portfolio stats banner
- **Market** — Live price grid (8 assets, polled every 30s), trending assets, global sentiment gauge
- **Alerts** — Create price/signal alerts per symbol, manage active alerts
- **Pricing** — Free/Pro/Premium tiers ($0/$29/$99), subscription management

## User preferences

- No emojis in the UI
- Dark terminal aesthetic throughout
- Data-dense layouts over minimalism

## Gotchas

- Always run codegen after editing `lib/api-spec/openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- Always run `pnpm --filter @workspace/db run push` after editing DB schema in `lib/db/src/schema/`
- Market data is simulated — prices update with random ±2% variance on each API call
- The Clerk proxy middleware must be registered BEFORE other routes in `app.ts`
- Do not hardcode ports — frontend uses `PORT` env var via workflow config

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Clerk setup: `.local/skills/clerk-auth/references/setup-and-customization.md`
