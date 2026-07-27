-- RPC: delete a field_ticket, bypassing RLS.
-- Validates that:
--   1. The ticket exists
--   2. It is closed (only closed tickets can be deleted)
--   3. The calling user is a super_admin
-- Returns an error string on failure, empty string on success.

create or replace function public.delete_field_ticket(
  p_ticket_id uuid,
  p_user_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_is_super_admin boolean;
begin
  -- Check caller is super_admin
  select exists (
    select 1 from public.user_roles
    where user_id = p_user_id and role = 'super_admin'
  ) into v_is_super_admin;

  if not v_is_super_admin then
    raise exception 'Only super admins can delete tickets.';
  end if;

  -- Check ticket exists and is closed
  select status into v_status
  from public.field_tickets
  where id = p_ticket_id;

  if not found then
    raise exception 'Ticket not found.';
  end if;

  if v_status != 'closed' then
    raise exception 'Only closed tickets can be deleted. Current status: %', v_status;
  end if;

  -- Delete
  delete from public.field_tickets where id = p_ticket_id;
end;
$$;

grant execute on function public.delete_field_ticket to authenticated;
