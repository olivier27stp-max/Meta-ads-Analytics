-- Entiore Sales Dashboard — automation tables
-- Run this in Supabase SQL Editor after 0001 and 0002.

-- 1) Twilio call recordings
create table if not exists public.twilio_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,

  twilio_call_sid text,
  account_sid text,
  direction text, -- inbound | outbound | outbound-api | outbound-dial
  from_number text,
  to_number text,
  status text, -- queued | ringing | in-progress | completed | busy | failed | no-answer | canceled
  duration_sec int,
  recording_url text,
  recording_sid text,
  transcription text,
  price_usd numeric,
  started_at timestamptz,
  ended_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (workspace_id, twilio_call_sid)
);

create index if not exists twilio_calls_workspace_idx on public.twilio_calls (workspace_id, created_at desc);
create index if not exists twilio_calls_lead_idx on public.twilio_calls (workspace_id, lead_id);

drop trigger if exists twilio_calls_touch on public.twilio_calls;
create trigger twilio_calls_touch
  before update on public.twilio_calls
  for each row execute function public.touch_updated_at();

alter table public.twilio_calls enable row level security;

drop policy if exists twilio_calls_self_read on public.twilio_calls;
create policy twilio_calls_self_read on public.twilio_calls
  for select using (auth.uid() = workspace_id);

drop policy if exists twilio_calls_self_write on public.twilio_calls;
create policy twilio_calls_self_write on public.twilio_calls
  for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);

-- 2) Google OAuth tokens (one row per workspace; per-user)
create table if not exists public.google_oauth_tokens (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  google_email text,
  google_sub text, -- Google account id ("sub" from ID token)
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text,
  connected_at timestamptz,
  last_synced_at timestamptz,
  last_sync_error text,
  updated_at timestamptz not null default now()
);

drop trigger if exists google_oauth_tokens_touch on public.google_oauth_tokens;
create trigger google_oauth_tokens_touch
  before update on public.google_oauth_tokens
  for each row execute function public.touch_updated_at();

alter table public.google_oauth_tokens enable row level security;

drop policy if exists google_oauth_self_read on public.google_oauth_tokens;
create policy google_oauth_self_read on public.google_oauth_tokens
  for select using (auth.uid() = workspace_id);

drop policy if exists google_oauth_self_write on public.google_oauth_tokens;
create policy google_oauth_self_write on public.google_oauth_tokens
  for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);

-- 3) Calendar events (synced from Google Calendar)
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  google_event_id text not null,
  calendar_id text,
  title text,
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  is_all_day boolean default false,
  status text,
  attendees jsonb,
  organizer_email text,
  html_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, google_event_id)
);

create index if not exists calendar_events_workspace_time_idx on public.calendar_events (workspace_id, start_time);

drop trigger if exists calendar_events_touch on public.calendar_events;
create trigger calendar_events_touch
  before update on public.calendar_events
  for each row execute function public.touch_updated_at();

alter table public.calendar_events enable row level security;

drop policy if exists calendar_events_self_read on public.calendar_events;
create policy calendar_events_self_read on public.calendar_events
  for select using (auth.uid() = workspace_id);

drop policy if exists calendar_events_self_write on public.calendar_events;
create policy calendar_events_self_write on public.calendar_events
  for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);

-- 4) Lead activity log (for Pipeline automation audit trail)
create table if not exists public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,

  actor text not null, -- 'user' | 'crm_webhook' | 'pipeline_ui' | 'cron' | 'api' | 'system'
  event_type text not null, -- 'lead_created' | 'stage_changed' | 'capi_fired' | 'value_updated'
  from_stage text,
  to_stage text,
  value numeric,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_activity_workspace_idx on public.lead_activity (workspace_id, created_at desc);
create index if not exists lead_activity_lead_idx on public.lead_activity (workspace_id, lead_id);

alter table public.lead_activity enable row level security;

drop policy if exists lead_activity_self_read on public.lead_activity;
create policy lead_activity_self_read on public.lead_activity
  for select using (auth.uid() = workspace_id);

drop policy if exists lead_activity_self_write on public.lead_activity;
create policy lead_activity_self_write on public.lead_activity
  for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);
