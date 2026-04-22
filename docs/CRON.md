# Automatic Meta sync via cron

This app exposes a single scheduled endpoint:

```
POST  /api/cron/sync-all
```

It iterates every workspace in the database, finds every active Meta account,
pulls fresh creatives from the Graph API, and merges them into the workspace's
state (deduplicating by `ad_id`). Any scheduler that can hit an HTTP URL with a
bearer token works.

## Authentication

Send the `CRON_SECRET` as either:
- `Authorization: Bearer <CRON_SECRET>` header (recommended), or
- `?token=<CRON_SECRET>` query param

The secret is set via `CRON_SECRET` in your env. It was auto-generated in
`.env.local` at build time and must match in whichever scheduler you choose.

## Test it manually

Once the dev server is running:

```bash
curl -X POST http://localhost:4137/api/cron/sync-all \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected response (demo mode, no `META_ACCESS_TOKEN`):

```json
{
  "ok": true,
  "mode": "demo",
  "message": "META_ACCESS_TOKEN not set — cron endpoint is reachable but no real sync was performed",
  "workspacesProcessed": 0
}
```

With `META_ACCESS_TOKEN` set, response includes a per-workspace summary of
added / updated / unchanged ads.

## Scheduler options — pick one

### Option 1 — Supabase pg_cron (recommended if staying on Supabase)

Pros: already bundled with your Supabase project, no external service, free.
Cons: requires your app to be deployed at a public URL (not localhost).

Run this SQL in the Supabase SQL editor ONCE you've deployed the app:

```sql
-- Enable extensions (one-time)
create extension if not exists pg_cron with schema extensions;
create extension if not exists http with schema extensions;

-- Store the secret in vault (safer than inlining in the cron definition)
-- Alternative: just paste the header inline in the http call below.

-- Every hour at :05
select cron.schedule(
  'mca-sync-meta-hourly',
  '5 * * * *',
  $$
  select http_post(
    'https://YOUR_APP_DOMAIN.com/api/cron/sync-all',
    '',
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer YOUR_CRON_SECRET')
    ]
  );
  $$
);

-- To list:        select * from cron.job;
-- To unschedule:  select cron.unschedule('mca-sync-meta-hourly');
```

### Option 2 — Vercel Cron (if deploying to Vercel)

Pros: native, zero extra config, reuses your deployment env vars.
Cons: Vercel Pro required for < 1h schedules on production.

Add to `vercel.json` at the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-all?token={{env.CRON_SECRET}}",
      "schedule": "5 * * * *"
    }
  ]
}
```

Note: Vercel Cron uses GET, which is supported. Vercel automatically injects
the bearer header if the env var `CRON_SECRET` is set — either approach works.

### Option 3 — GitHub Actions (works with any deployment)

Pros: free forever, works with any host (Railway, Render, Fly, self-hosted).
Cons: minimum schedule is every ~5 min (no strict guarantee on timing).

A ready-to-copy template is at `docs/github-actions-meta-sync.yml`. Copy it to
`.github/workflows/meta-sync.yml` in your repo root (the GitHub PAT used to
push must have the `workflow` scope enabled, or you can add the file via the
GitHub web UI):

```yaml
name: Meta Sync (hourly)

on:
  schedule:
    # Every hour at :05
    - cron: "5 * * * *"
  # Manual trigger from the Actions tab
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Hit sync endpoint
        run: |
          curl --fail --show-error --silent \
            -X POST "${APP_URL}/api/cron/sync-all" \
            -H "Authorization: Bearer ${CRON_SECRET}"
        env:
          APP_URL: ${{ secrets.APP_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
```

Add two repo secrets: `APP_URL` (e.g. `https://meta-ads.yourdomain.com`) and
`CRON_SECRET` (the one in your `.env.local`).

### Option 4 — crontab on your Mac (local-only testing)

Only works when your laptop is awake and the dev server is running.

```bash
crontab -e
```

Add:

```
5 * * * * curl -s -X POST "http://localhost:4137/api/cron/sync-all" -H "Authorization: Bearer 520ff6ed109bed49145eff974b4f2e369c9d8f595ff65d62e89b0d780c09edb3" > /dev/null
```

(replace the token with your real `CRON_SECRET`).

## Recommended cadence

- **Hourly** — the default in the snippets above. Good balance: Meta updates
  insights every ~15 min but polling more often burns your 200 calls/user/hour
  rate limit fast across multiple workspaces.
- **Every 30 min** — fine if you have < 5 workspaces.
- **Daily** — if you don't mind ~24h latency on new creatives appearing.

## What happens on a run

1. Reads every row in `public.workspaces`.
2. For each workspace, iterates its active Meta accounts (skipping demo-seed
   account ids that don't start with `act_`).
3. Calls Graph API v21.0 `/ads` with all required fields + pagination.
4. Merges by `ad_id`: new ads → append with `pending` AI record, existing ads
   → refresh metrics + status, AI analysis preserved.
5. Writes the updated state back to `workspaces.state_json`.
6. Logs a per-workspace + per-account summary in the response JSON.

The next time the user opens the app (hot-reload via the Supabase-backed
persist storage), they see the fresh creatives without having clicked anything.
