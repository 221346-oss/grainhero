-- Add resolved state to field_tickets
-- Super admin marks a ticket "resolved" (with optional note) to signal the
-- admin that action is complete. Admin then closes it from their side.

alter table public.field_tickets
  add column if not exists resolved_at  timestamptz,
  add column if not exists resolved_by  uuid references auth.users(id),
  add column if not exists resolved_note text;

-- Update the status check to include "resolved"
alter table public.field_tickets
  drop constraint if exists field_tickets_status_check;

alter table public.field_tickets
  add constraint field_tickets_status_check
    check (status in ('open', 'resolved', 'closed'));
