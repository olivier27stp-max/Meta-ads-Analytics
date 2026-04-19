-- Meta Ads Creative Analytics — initial schema
-- One workspace per authenticated user. RLS isolates every row.

create extension if not exists "pgcrypto";

-- Workspaces: jsonb blob of the per-user app state.
-- This keeps the migration pragmatic: the client's zustand store is serialized
-- into state_json. If / when relational querying is needed, this table can be
-- split into typed tables without changing auth or isolation.
create table if not exists public.workspaces (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  state_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists workspaces_touch on public.workspaces;
create trigger workspaces_touch
  before update on public.workspaces
  for each row execute function public.touch_updated_at();

-- Trigger: auto-provision a workspace row when a new auth user is created.
-- Runs with SECURITY DEFINER so it can insert past RLS as the system user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspaces (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security: every row is scoped to the owning user.
alter table public.workspaces enable row level security;

drop policy if exists "workspaces_self_select" on public.workspaces;
create policy "workspaces_self_select"
  on public.workspaces for select
  using (auth.uid() = id);

drop policy if exists "workspaces_self_update" on public.workspaces;
create policy "workspaces_self_update"
  on public.workspaces for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "workspaces_self_insert" on public.workspaces;
create policy "workspaces_self_insert"
  on public.workspaces for insert
  with check (auth.uid() = id);

-- (Optional) backfill workspaces for any existing users who were created
-- before this migration.
insert into public.workspaces (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;
