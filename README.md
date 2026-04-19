# Meta Ads Creative Analytics

Premium internal tool for paid social teams: connects Meta ad accounts, classifies creatives with AI taxonomy, computes stage-aware win rates, and produces **Scale / Watch / Kill** recommendations.

Desktop-first, light-themed, top-tab navigation, no heavy enterprise shell.

## Stack

- **Next.js 15** (App Router) · **TypeScript** · **Tailwind CSS**
- Radix primitives + `class-variance-authority` for a local shadcn-style UI kit
- **Zustand** with `persist` middleware (localStorage) as the client source of truth
- **TanStack Table** patterns (hand-rolled for fidelity) · **Recharts** (available for future charts)
- Route handlers for the service layer (Meta sync + AI analyze stubs)

## Run it

```bash
npm install
npm run dev
# → http://localhost:3000 (redirects to /accounts)
```

For a production build:

```bash
npm run build
npm start
```

## Sections (top nav)

| Tab        | Purpose                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| Accounts   | Connect / sync / disconnect Meta ad accounts                            |
| Creatives  | Table + grid of creatives with filters, taxonomy, and detail modal      |
| Analytics  | Win Rate Analysis, grouped breakdown, Scale/Watch/Kill board            |
| Reports    | Generated creative performance summaries                                |
| Settings   | Meta API setup, sync cadence, winning thresholds, AI spend threshold    |

## What is fully functional

- All five pages render with real data and interact bidirectionally with a persisted zustand store.
- Account CRUD — add, delete, sync per-account, sync all active (with optimistic UX + delay simulation).
- Global filters (account + date range) affect the KPI strip, Analytics page, and Kill/Scale board.
- Creatives filters (delivery, group-by, media type, AI status, asset type, messaging angle, funnel stage, search) and column visibility are all wired end-to-end.
- Creative detail modal shows preview, metrics, AI taxonomy, summary, strengths, areas to improve, recommended iterations, and a working **Re-analyze** action.
- Analytics computes: total ads, winners, win rate, blended ROAS, grouped performance by 6 taxonomy dimensions, and a stage-aware Scale / Watch / Kill board for **TOF / MOF / BOF**.
- Scoring logic is stage-aware and tunable from Settings (see `src/lib/scoring.ts`).
- Reports — create, regenerate (with async status), delete, preview modal.
- Settings — all five sections (Meta API, Sync Frequency, Report Automation, Winning Logic, Min Spend for AI) persist to the store.

## What uses seeded / demo logic

- **Seed data**: 132 realistic creatives across 4 active accounts + 1 disconnected, with naming like _"Morning Ritual UGC · Push 03"_, mixed video/image, mixed funnel stages, mixed AI tags, and tier-based metrics (winner / mid / loser).
- **Sync actions** simulate latency and update `lastSyncedAt`; without `META_ACCESS_TOKEN` the route handler returns an empty synced payload and the demo data stays authoritative.
- **Re-analyze** flips AI status to `pending` then back to `complete`; the route handler acknowledges but does not call a vision model unless `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set.
- **Report generation** is simulated async (1.4s) and fills `generatedAt`.
- **Test connection** in Add Account / Meta API Settings is simulated locally.

## What needs real credentials

Copy `.env.example` → `.env.local`:

```
META_ACCESS_TOKEN=EAAB…          # long-lived system user token (ads_read, ads_management)
META_APP_ID=…                    # optional, for OAuth flows
META_APP_SECRET=…                # optional
OPENAI_API_KEY=…                 # OR ANTHROPIC_API_KEY for AI re-analysis
```

When `META_ACCESS_TOKEN` is set:

- `POST /api/accounts/:id/sync` calls `graph.facebook.com/v21.0/:id/ads` and returns a normalized creative payload (`src/lib/meta-sync.ts`). The client store reads this payload on success.
- `GET /api/settings` reports `hasMetaToken: true`.

When an AI provider key is set:

- `POST /api/creatives/:id/analyze` is the seam to call a vision model and persist structured taxonomy + summary back to the creative record. Current implementation returns `{ mode: "live" }` and the client updates state optimistically; plug your model call into that handler.

## How account sync should be configured

1. Create a Business-type app at https://developers.facebook.com/apps.
2. Add the **Marketing API** product; grant `ads_read` and `ads_management`.
3. Generate a **system user** long-lived token — never use a user token in production.
4. Place the token in `META_ACCESS_TOKEN` (preferred) or paste it in **Settings → Meta API Setup** with "Use server environment token" toggled off.
5. Click **Sync All Active** on any page to pull creatives. Per-account sync is available from the Accounts table.

Rate limits: the Marketing API allows ~200 calls per user per hour. The route handler makes one paged call per `ads?fields=…insights` request; batch multiple accounts with a delay if you add scheduled sync.

## Real AI analysis (Gemini 2.0 Flash)

The `Re-analyze` button is wired to **Google Gemini 2.0 Flash** via `POST /api/creatives/:id/analyze`. It's the best free-tier option for this workload (native structured output, video support, generous quota).

### Setup

1. Get a key at https://aistudio.google.com/app/apikey (30 seconds).
2. Add it to `.env.local`:
   ```
   GEMINI_API_KEY=AIzaSy…
   ```
3. Restart `npm run dev`. Click **Re-analyze** on any creative.

### What changes when the key is present

- The client POSTs the creative's name, campaign, ad set, media type, funnel stage, and all performance metrics to the analyze route.
- Server calls Gemini with a `responseSchema` matching the `AIAnalysis` type — taxonomy values are enum-locked, arrays sized, fields required.
- The prompt (`src/lib/ai/gemini.ts`) enforces critique rules:
  - Every strength / improvement / iteration MUST cite a concrete metric value, stage benchmark, or named format convention.
  - Gemini is told to reassign the funnel stage if metrics contradict the current tag.
  - Iterations must be testable and sequenced Low → High effort.
- The returned analysis replaces the creative's AI record in the store with a real `analyzedAt` timestamp.
- If a real HTTP image URL is attached to the creative (e.g. from a Meta sync), the server fetches it and sends it inline so Gemini sees the actual asset.

### Quota

Gemini 2.0 Flash free tier is ~1 500 requests/day, 15 RPM, 1 M tokens/day — plenty for interactive creative review. Video support is available on the same endpoint via the Files API; this repo currently sends text + inline image only.

### Without a key

The analyze endpoint returns `{ mode: "demo", analysis: null }` and the client flips the AI record's `analyzedAt` without rewriting it — the seeded taxonomy stays. You get a realistic Re-analyze animation; just no fresh judgment.

## How AI analysis is stored and triggered

Each creative carries an `AIAnalysis` record with:

```ts
status: "complete" | "pending" | "failed"
assetType · visualFormat · messagingAngle · hookTactic · offerType · funnelStage
summary: string
strengths: string[]
areasToImprove: string[]
recommendedIterations: [{ title, effort, rationale, expectedOutcome }]
analyzedAt: string | null
```

Trigger points:

- **Automatic**: when a new creative arrives via sync, your sync handler should enqueue an `/api/creatives/:id/analyze` request.
- **Manual**: the **Re-analyze** button in the Creative Detail modal.

Storage in demo mode is the persisted zustand slice. To persist server-side, add a Postgres/Supabase schema matching the `Creative` and `AIAnalysis` types in `src/types/index.ts` and swap the store's action implementations for `fetch` calls against your route handlers.

## Key files

```
src/
  app/
    layout.tsx                         Top nav + global modal mount
    accounts|creatives|analytics|reports|settings/page.tsx
    api/
      accounts/route.ts                Integration status
      accounts/[id]/sync/route.ts      Per-account sync (calls src/lib/meta-sync)
      creatives/[id]/analyze/route.ts  Re-analysis seam
      analytics|reports|settings/…     Scaffolds
  components/
    layout/      AppHeader · TopTabs · PageHeader · ControlBar
    kpi/         KpiCard · KpiStrip · GlobalKpiStrip
    accounts/    AccountsTable · AddAccountDialog
    creatives/   CreativesFilters · CreativesTable · CreativesGrid · CreativeDetailModal
    analytics/   WinRateCard · GroupedBreakdown · KillScaleBoard
    reports/     ReportsTable (+ create/preview modal)
    settings/    SettingsCard · MetaApiCard · SyncAndAutomationCards · WinningLogicCard
    shared/      StoreInit · StatusBadges · CreativePreview · EmptyState
    ui/          button · card · badge · input · dialog · select · switch · tabs · dropdown-menu
  lib/
    store.ts         Zustand store (persisted) + all actions + filtered selector
    scoring.ts       Stage-aware winner + score + classify (Scale/Watch/Kill)
    analytics.ts     Grouped breakdown · win rate summary · Kill/Scale board
    taxonomy.ts      Asset / Visual / Angle / Hook / Offer / Funnel enums
    demo-data.ts     132 creatives, 5 accounts, 3 reports — deterministic seeding
    meta-sync.ts     Meta Graph v21.0 integration seam
    utils.ts         Formatters (money, pct, ROAS, relative time), cn, math helpers
  types/index.ts     All shared types
```

## Resetting demo data

Open devtools console:

```js
localStorage.removeItem("mca-store-v1"); location.reload();
```

Or from code: `useStore.getState().resetDemoData()`.

## Design notes

- Top-tab navigation, not a heavy sidebar. Header is slim (56px) + 40px tab row.
- All cards are `rounded-2xl` white with 1px border; no aggressive shadow.
- Metrics use tabular figures (`font-variant-numeric: tabular-nums`) for column alignment.
- Status tones are muted: success 148° 38%, warning 38° 60%, danger 356° 54%. No neons.
- Modals use a calm backdrop (foreground/20 + 2px backdrop-blur), animated in with `scale-in`.
- All tables share one style: sticky uppercase header, hover `bg-muted/40`, row separators in `border-border/70`.
