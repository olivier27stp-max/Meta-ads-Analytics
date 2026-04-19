-- Meta Ads Creative Analytics — attribution system
-- Captures landing-page signal, persists CRM lead state, and audits every
-- Conversions API event sent to Meta.

-- 1) Public API key for landing-page form posts (workspace-scoped).
alter table public.workspaces
  add column if not exists public_api_key text unique;

update public.workspaces
set public_api_key = encode(gen_random_bytes(24), 'hex')
where public_api_key is null;

alter table public.workspaces
  alter column public_api_key set not null;

-- Regenerate the public api key (invalidates prior key)
create or replace function public.rotate_workspace_api_key()
returns text language plpgsql security definer set search_path = public as $$
declare
  new_key text;
begin
  new_key := encode(gen_random_bytes(24), 'hex');
  update public.workspaces set public_api_key = new_key where id = auth.uid();
  return new_key;
end $$;

-- 2) Leads table — one row per captured form submission.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  external_id text, -- CRM record id once synced
  email text,
  phone text,
  first_name text,
  last_name text,
  company text,

  -- Attribution captured at form submit
  fbclid text,
  fbc text,
  fbp text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_url text,
  referrer text,
  client_ip text,
  user_agent text,

  -- Pipeline state
  stage text not null default 'lead',
  value numeric,
  currency text not null default 'USD',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_workspace_idx on public.leads (workspace_id);
create index if not exists leads_email_idx on public.leads (workspace_id, email);
create index if not exists leads_external_idx on public.leads (workspace_id, external_id);

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch
  before update on public.leads
  for each row execute function public.touch_updated_at();

-- 3) CAPI events audit log — every POST to Meta is logged.
create table if not exists public.capi_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,

  event_name text not null,
  event_time timestamptz not null,
  event_id text not null,
  value numeric,
  currency text default 'USD',

  status text not null default 'queued', -- queued | sent | failed
  http_status int,
  meta_response jsonb,
  retry_count int not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists capi_events_workspace_idx on public.capi_events (workspace_id, created_at desc);

-- 4) Row-level security
alter table public.leads enable row level security;
alter table public.capi_events enable row level security;

drop policy if exists leads_self_read on public.leads;
create policy leads_self_read on public.leads
  for select using (auth.uid() = workspace_id);

drop policy if exists leads_self_write on public.leads;
create policy leads_self_write on public.leads
  for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);

drop policy if exists capi_self_read on public.capi_events;
create policy capi_self_read on public.capi_events
  for select using (auth.uid() = workspace_id);

drop policy if exists capi_self_write on public.capi_events;
create policy capi_self_write on public.capi_events
  for all using (auth.uid() = workspace_id) with check (auth.uid() = workspace_id);
