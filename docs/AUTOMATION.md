# Automation setup

The `/automation` page has 5 tabs — each one a workflow that runs end-to-end
as soon as you supply the credentials/connections listed below. RLS keeps
every workspace's data isolated.

## 0 · Apply the migration

Before any tab works, run `supabase/migrations/0003_automation.sql` in the
Supabase SQL editor. It creates:

- `public.twilio_calls` — ingested Twilio call webhooks
- `public.google_oauth_tokens` — one row per workspace (per Entiore user)
- `public.calendar_events` — events pulled from Google Calendar
- `public.lead_activity` — audit log of every stage change + lead creation

All four tables have RLS `workspace_id = auth.uid()`.

## 1 · Leads

Already working. Make sure:

1. `public_api_key` is populated on your `workspaces` row (migration 0002 did
   this).
2. The Leads tab displays the key + endpoint URL + script + `<form>` snippet.
3. Drop `<script src="…/mca-tracker.js" async defer>` on every landing.
4. POST the form payload to `/api/leads/capture`.

Every capture writes a `lead_activity` row with `event_type = "lead_created"`
and fires Meta CAPI `Lead` if Pixel + Token are saved.

## 2 · Call recordings (Twilio)

Add your Twilio creds in Settings or the Twilio tab:

```
accountSid = AC…
authToken  = <Twilio Auth Token>
```

In the Twilio console for your phone number, set:

```
A CALL COMES IN (Webhook)
URL:    https://YOUR_APP/api/webhooks/twilio/call?workspace_id=<WS_UUID>
Method: POST
```

Also set the Status Callback URL to the same endpoint. Twilio posts
`CallStatus`, `CallDuration`, `RecordingUrl`, `From`, `To`, etc. We verify
the signature using the saved Auth Token, upsert the call by
`twilio_call_sid`, and match it to a lead when a phone number matches.

## 3 · Calendrier (Google Calendar)

Each Entiore user connects their own Google account — events are pulled only
for their workspace.

### One-time app-level setup

1. Google Cloud Console → Create project → APIs & Services → Library →
   enable **Google Calendar API**.
2. Credentials → Create → OAuth 2.0 Client ID → Web application.
3. Authorized redirect URIs:
   ```
   http://localhost:4137/api/auth/google/callback
   https://YOUR_PROD_DOMAIN/api/auth/google/callback
   ```
4. Copy Client ID + Client Secret into `.env.local`:
   ```
   GOOGLE_OAUTH_CLIENT_ID=…
   GOOGLE_OAUTH_CLIENT_SECRET=…
   GOOGLE_OAUTH_REDIRECT_URI=http://localhost:4137/api/auth/google/callback
   ```
5. Restart `npm run dev`.

### Per-user flow

1. Go to Automation → Calendrier → **Connect Google Calendar**.
2. Google consent screen → you authorize read-only Calendar + profile.
3. Callback stores your tokens in `public.google_oauth_tokens`.
4. **Sync now** pulls the last 30 / next 60 days into `calendar_events`.
5. Tokens are auto-refreshed on each sync via the stored refresh token.

## 4 · Pipeline automation

Already wired. Every stage transition — from the UI, the CRM webhook, or the
Leads detail drawer — writes to `lead_activity` with actor + from_stage +
to_stage, and fires the mapped Meta CAPI event if one is set for that stage.

## 5 · Ad analyst

Surfaces the end-to-end chain already in place:

- Closed-won leads carry `utm_content` and `fbclid`
- We match `utm_content` against creative names from the Meta sync
- CAPI events for each stage transition appear with `sent`/`failed` status
- When you set Pixel ID + CAPI Token in Settings → Attribution, every
  `closed_won` transition fires a Meta `Purchase` event with the lead's
  `fbc` + email, which Meta attributes back to the clicked ad.

## Lifecycle summary

```
Ad click → landing tracker captures fbclid + utm_*
    → form submit → POST /api/leads/capture
    → lead row created + lead_activity("lead_created")
    → Meta CAPI `Lead` fired

CRM stage change → POST /api/webhooks/crm (HMAC signed)
    → lead.stage updated
    → lead_activity("stage_changed")
    → Meta CAPI event fired per stageMap

In-app stage move (Pipeline kanban) → POST /api/leads/:id/stage
    → same outcome as CRM webhook

Twilio call completes → Twilio POSTs /api/webhooks/twilio/call
    → signature verified against saved authToken
    → call upserted, linked to lead if phone matches

Google Calendar sync → user clicks Sync or cron hits endpoint
    → refresh access token if stale
    → fetch events, upsert to calendar_events
```
