# Quant Terminal

An AI-assisted market intelligence, research, and paper-trading terminal.
Next.js 14 (App Router) + TypeScript + Tailwind CSS + PostgreSQL (Prisma).

This is a real, runnable codebase — not a mockup. It was built with **zero
market-data or AI API keys** configured, so every page works out of the box
in **DEMO MODE**: a deterministic synthetic-data engine stands in for a live
market-data vendor, clearly labeled everywhere it appears. Swap in a real
provider by implementing one interface — see [Connecting a live market-data
provider](#connecting-a-live-market-data-provider) below.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (or point DATABASE_URL at your own instance)
docker compose up -d

# 3. Configure environment
cp .env.example .env
# generate an AUTH_SECRET:
openssl rand -base64 32
# paste it into .env as AUTH_SECRET=...

# 4. Create the database schema
npm run db:migrate

# 5. (optional) seed a demo user — demo@example.com / demo-password-123
npm run db:seed

# 6. Run it
npm run dev
```

Open http://localhost:3000. No API keys are required for the app to be
fully navigable — market data, news, fundamentals, and AI signals all run
through the built-in demo engine until you configure a live provider.

## What's real vs. what's demo

**Real, not simulated:**
- Every technical indicator (SMA/EMA/RSI/MACD/Bollinger/volatility) is computed with actual formulas over whatever candles it's given — demo or live.
- The AI scoring model (signals, Opportunity/Risk Scores, market regime, setup detection) is a genuine deterministic rules engine reading real computed features — not random numbers or hardcoded outputs.
- Paper trading executes real order logic: commission, slippage, average cost basis, realized P&L, insufficient-buying-power checks — all in DB transactions.
- The backtester actually walks historical candles bar-by-bar applying your rule; it does not fabricate results, and it reports 0 trades honestly if your rule never fires.
- Signal performance history is only ever recorded when a signal is actually generated, and outcomes are only evaluated once real wall-clock time has elapsed — nothing is backfilled.

**Synthetic (DEMO MODE), clearly labeled everywhere:**
- Prices, volumes, news headlines, fundamentals, and earnings dates come from `src/lib/market-data/demo-provider.ts` — a seeded random-walk generator, not a real market feed. It's deterministic per ticker per day, so the market feels alive across sessions without being random noise.

## Architecture

```
Market Data → Technical Indicators → Fundamentals → News/Sentiment
  → Market & Sector Context → Feature Engineering → Scoring Model
  → Explanation Layer → Signal
```

- **`src/lib/market-data/`** — the provider abstraction. `types.ts` defines
  the `MarketDataProvider` interface; `demo-provider.ts` implements it with
  synthetic data; `index.ts` is the single factory/switch point. No page or
  API route ever imports a concrete provider directly.
- **`src/lib/indicators/`** — pure technical-indicator math, shared by every
  provider and by the scoring engine.
- **`src/lib/ai/scoring.ts`** — the *numerical* half of the AI pipeline:
  feature engineering + a weighted, transparent scoring model. No language
  model involved. Returns `null`/`"Data unavailable"` rather than guessing
  when an input is missing.
- **`src/lib/ai/explain.ts`** — the *language* half. Takes only the
  already-computed scores/factors and turns them into prose. If `AI_API_KEY`
  is set it asks an LLM to phrase things more naturally (explicitly
  forbidden from introducing new numbers); otherwise a template does it.
  This separation is what keeps every explanation traceable to real inputs.
- **`src/lib/ai/regime.ts`**, **`setups.ts`** — market regime detection and
  technical-setup pattern detection, both evidence-based (every output
  cites the numbers that triggered it).
- **`src/lib/paper-trading/engine.ts`** — order execution and mark-to-market
  portfolio valuation.
- **`src/lib/backtest/engine.ts`** — the rule-based backtester.

## Connecting a live market-data provider

1. Implement `MarketDataProvider` (see `src/lib/market-data/types.ts`) in a
   new file, e.g. `src/lib/market-data/polygon-provider.ts`, reading
   `MARKET_DATA_API_KEY` / `MARKET_DATA_BASE_URL` from `process.env` —
   server-side only, never exposed to the client.
2. Register it in the `switch` in `src/lib/market-data/index.ts`.
3. Set `MARKET_DATA_PROVIDER=polygon` (or your vendor name) in `.env`.

Nothing else changes — every page and API route calls
`getMarketDataProvider()` and is agnostic to which adapter is active. If the
vendor only provides delayed data, set that adapter's `source` to
`"delayed"` and the UI will label it accordingly instead of "live".

## Connecting a real AI explanation layer

Set `AI_API_KEY` (and optionally `AI_MODEL`) in `.env`. `src/lib/ai/explain.ts`
will start calling the Anthropic Messages API to narrate signals, with a
strict system prompt forbidding it from introducing any number not already
in the computed feature set, and a hard timeout + automatic fallback to the
template explainer if the call fails for any reason. The app never blocks
on this — it's a narration layer, not a dependency.

## What's simplified (and where to extend it)

Being upfront about where this build takes a deliberately smaller version
of a full production feature, and where the code is set up to grow into it:

- **Auth** is a minimal email/password + JWT-cookie implementation. Before
  real production use, add: email verification, password reset, OAuth
  providers, and stronger rate limiting on `/api/auth/*` (currently an
  in-memory limiter — see `src/lib/utils/rate-limit.ts`, which documents
  swapping in Redis for multi-instance deployments).
- **Alerts** are evaluated opportunistically when you load the Alerts page
  (`src/lib/alerts/evaluate.ts`), not on a schedule. Wire a cron job or
  worker to call `evaluateActiveAlerts()` on an interval for real-time
  triggering, and extend `src/lib/utils/api.ts`/add a notifier module for
  email/push delivery — the `Alert` model already has everything a notifier
  needs.
- **Screener prebuilt screens** use transparent heuristics over already-computed
  fields (see the predicate table in `src/components/screener/ScreenerClient.tsx`)
  rather than re-running the full per-ticker AI pipeline for speed. The full
  Opportunity/Risk Score pipeline (which also weighs live news and market
  regime) is on the dedicated Opportunities/Risk Scanner pages.
- **Correlation matrix** on the Portfolio page computes real pairwise return
  correlation but is capped at 8 positions for response time.
- **Equity snapshots** are recorded at every simulated trade, not on a
  fixed interval — fine for demo-scale usage; add a scheduled snapshot job
  for smoother equity curves on accounts with infrequent trading.

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS ·
PostgreSQL via Prisma · lightweight-charts (candlesticks) · Recharts (line/
area charts) · Zod (validation) · jose (JWT) · bcryptjs.

## Security notes

- All market-data/AI credentials are read server-side only (`process.env`
  in server components and route handlers) — never sent to the client.
- Every mutating API route validates input with Zod and runs through
  `withRoute()` (`src/lib/utils/api.ts`), which provides consistent error
  → HTTP status mapping and per-route rate limiting.
- Passwords are hashed with bcrypt (12 rounds); sessions are signed JWTs in
  an `httpOnly`, `sameSite=lax` cookie.
- Prisma parameterizes all queries — no raw SQL string interpolation
  anywhere in this codebase.

## Deploying

This is a standard Next.js app, so it deploys to any Node host or platform
with first-class Next.js support (Vercel, Railway, Fly.io, a plain VPS with
`npm run build && npm run start`, etc.). Two things to set up beyond the
build itself:

1. **A reachable Postgres instance** — `docker compose up -d` is for local
   dev only; in production point `DATABASE_URL` at a managed Postgres
   instance and run `npx prisma migrate deploy` (not `migrate dev`) as part
   of your deploy step.
2. **Environment variables** — copy everything from `.env.example` into
   your host's environment settings. At minimum, set `AUTH_SECRET` and
   `DATABASE_URL`; leave `MARKET_DATA_PROVIDER=demo` until a live vendor is
   wired in (see above).

`GET /api/health` reports `{ status: "healthy" | "degraded" }` with a
per-check breakdown (market data, database) — point your platform's health
check / uptime monitor at it.

## Production-readiness touches already in place

- `not-found.tsx`, `error.tsx`, and `global-error.tsx` — a bad ticker or an
  unhandled exception get a styled page instead of a stack trace;
  `global-error.tsx` specifically catches failures in the root layout
  itself (e.g. a misconfigured `MARKET_DATA_PROVIDER`).
- `loading.tsx` — a skeleton shown during route transitions while server
  components fetch data.
- `app/icon.svg` — favicon, auto-detected by Next.js.
- `GET /api/health` — for uptime monitoring and deploy-platform health checks.

## Disclaimer

AI-generated signals, scores, and scenarios throughout this app are
algorithmic model output for informational and educational purposes only —
not financial advice, and not a guarantee of future results. Paper trading
uses simulated money only.
