-- ============================================================
-- Field Tickets
-- Run this in the Supabase SQL editor if not applied via CLI.
-- Admins create open-field incident tickets → notified to super_admin.
-- Visible to: the creating admin + all super_admins.
-- Closed tickets remain in super_admin records; disappear from admin view.
-- ============================================================

create table if not exists public.field_tickets (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid not null references auth.users(id) on delete cascade,

  -- Ticket fields
  title         text not null check (char_length(title) >= 3 and char_length(title) <= 200),
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  reporter_name text not null check (char_length(reporter_name) >= 1 and char_length(reporter_name) <= 120),
  reporter_role text not null default 'admin' check (reporter_role in ('admin', 'manager', 'technician')),
  description   text not null check (char_length(description) >= 1 and char_length(description) <= 4000),

  -- Lifecycle
  status        text not null default 'open' check (status in ('open', 'closed')),
  closed_at     timestamptz,
  closed_by     uuid references auth.users(id),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Keep updated_at fresh automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists field_tickets_set_updated_at on public.field_tickets;
create trigger field_tickets_set_updated_at
  before update on public.field_tickets
  for each row execute procedure public.set_updated_at();

-- ──────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────
alter table public.field_tickets enable row level security;

-- Helper: is the current session user a super_admin?
-- security definer so it can always read user_roles
create or replace function public.is_super_admin_user()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

-- Drop existing policies if re-running this script
drop policy if exists "field_tickets_select" on public.field_tickets;
drop policy if exists "field_tickets_insert" on public.field_tickets;
drop policy if exists "field_tickets_update" on public.field_tickets;

-- SELECT: admin sees their own tickets (all statuses); super_admin sees all
create policy "field_tickets_select" on public.field_tickets
  for select using (
    auth.uid() = admin_id
    or public.is_super_admin_user()
  );

-- INSERT: only non-super_admin users can create tickets for themselves
create policy "field_tickets_insert" on public.field_tickets
  for insert with check (
    auth.uid() = admin_id
    and not public.is_super_admin_user()
  );

-- UPDATE: admin can update their own; super_admin can update any
create policy "field_tickets_update" on public.field_tickets
  for update using (
    auth.uid() = admin_id
    or public.is_super_admin_user()
  );

-- Allow service role to do everything (used for notification fan-out)
-- Service role bypasses RLS by default, no explicit policy needed.

-- ──────────────────────────────────────────────
-- Realtime
-- ──────────────────────────────────────────────
alter publication supabase_realtime add table public.field_tickets;
