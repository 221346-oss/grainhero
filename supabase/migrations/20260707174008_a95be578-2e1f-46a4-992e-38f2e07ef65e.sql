create table public.waitlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

grant insert on public.waitlist_emails to anon;
grant select, insert on public.waitlist_emails to authenticated;
grant all on public.waitlist_emails to service_role;

alter table public.waitlist_emails enable row level security;

create policy "Anyone can join the waitlist"
on public.waitlist_emails
for insert
to anon, authenticated
with check (true);

create policy "Authenticated users can view waitlist"
on public.waitlist_emails
for select
to authenticated
using (auth.uid() is not null);