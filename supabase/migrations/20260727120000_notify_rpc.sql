-- RPC: insert a notification for any target user, bypassing RLS.
-- Used by server functions that can't use the service role key.
-- SECURITY DEFINER means it runs as the function owner (postgres/supabase),
-- not as the calling user, so it can write to any user_id row.
create or replace function public.insert_notification(
  p_user_id     uuid,
  p_admin_id    uuid,
  p_title       text,
  p_message     text,
  p_category    text default 'info',
  p_type        text default 'info',
  p_action_url  text default null,
  p_entity_type text default null,
  p_entity_id   uuid default null,
  p_metadata    jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id, admin_id, title, message,
    category, type, read,
    action_url, entity_type, entity_id, metadata
  ) values (
    p_user_id, p_admin_id, p_title, p_message,
    p_category, p_type, false,
    p_action_url, p_entity_type, p_entity_id, p_metadata
  );
end;
$$;

-- Grant execute to authenticated users (server functions run as authenticated)
grant execute on function public.insert_notification to authenticated;
