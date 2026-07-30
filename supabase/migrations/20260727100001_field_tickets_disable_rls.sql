-- ============================================================
-- Disable RLS on field_tickets.
-- Access control is handled entirely in the server functions
-- (listTickets, closeTicket, createTicket) which verify the
-- caller's role before executing any query.
-- This avoids the need for SUPABASE_SERVICE_ROLE_KEY.
-- ============================================================

-- Drop the old policies first
drop policy if exists "field_tickets_select" on public.field_tickets;
drop policy if exists "field_tickets_insert" on public.field_tickets;
drop policy if exists "field_tickets_update" on public.field_tickets;

-- Disable row level security entirely
alter table public.field_tickets disable row level security;
