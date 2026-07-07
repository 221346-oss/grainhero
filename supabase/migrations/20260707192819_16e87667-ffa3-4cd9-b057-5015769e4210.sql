
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'system',
  entity_type text,
  entity_id text,
  action_url text,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_admin ON public.notifications (admin_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Tenant insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = get_tenant_admin_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  user_id uuid,
  user_name text,
  user_role text,
  action text NOT NULL,
  category text NOT NULL DEFAULT 'system',
  entity_type text,
  entity_id text,
  entity_ref text,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'info',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_logs_admin_created ON public.activity_logs (admin_id, created_at DESC);
CREATE INDEX idx_activity_logs_category ON public.activity_logs (category);
CREATE INDEX idx_activity_logs_severity ON public.activity_logs (severity);
CREATE INDEX idx_activity_logs_entity_ref ON public.activity_logs (entity_ref);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (admin_id = get_tenant_admin_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Tenant insert activity logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = get_tenant_admin_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));
