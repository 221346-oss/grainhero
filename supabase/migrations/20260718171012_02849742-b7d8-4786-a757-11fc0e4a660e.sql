
CREATE TABLE IF NOT EXISTS public.field_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  silo_id uuid REFERENCES public.silos(id) ON DELETE SET NULL,
  reporter_user_id uuid NOT NULL,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  notes text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  location_lat numeric, location_lng numeric,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz, resolved_by uuid, resolution_notes text,
  source text NOT NULL DEFAULT 'mobile',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_incidents TO authenticated;
GRANT ALL ON public.field_incidents TO service_role;
ALTER TABLE public.field_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_incidents_tenant_read" ON public.field_incidents FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_admin_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "field_incidents_reporter_insert" ON public.field_incidents FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid() AND tenant_id = public.get_tenant_admin_id(auth.uid()));
CREATE POLICY "field_incidents_reporter_or_admin_update" ON public.field_incidents FOR UPDATE TO authenticated
  USING (
    reporter_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "field_incidents_super_admin_delete" ON public.field_incidents FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_field_incidents_updated BEFORE UPDATE ON public.field_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_field_incidents_tenant_updated ON public.field_incidents(tenant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.mobile_field_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  default_page_size int NOT NULL DEFAULT 100,
  max_attachment_mb int NOT NULL DEFAULT 10,
  offline_window_hours int NOT NULL DEFAULT 48,
  geofence_enforced boolean NOT NULL DEFAULT false,
  actuator_override_allowed boolean NOT NULL DEFAULT true,
  required_photo_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  incident_categories jsonb NOT NULL DEFAULT
    '["equipment_fault","safety","spillage","pest","temperature","humidity","access","other"]'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mobile_field_settings TO authenticated;
GRANT ALL ON public.mobile_field_settings TO service_role;
ALTER TABLE public.mobile_field_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mobile_field_settings_auth_read" ON public.mobile_field_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "mobile_field_settings_super_admin_write" ON public.mobile_field_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_mobile_field_settings_updated BEFORE UPDATE ON public.mobile_field_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.mobile_field_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE VIEW public.mobile_field_task_v AS
SELECT
  ('alert:' || a.id::text) AS task_key, 'alert'::text AS task_type,
  a.admin_id AS tenant_id, a.assigned_to AS assignee_user_id,
  a.silo_id, NULL::uuid AS order_id,
  COALESCE(a.title::text, a.alert_type::text) AS title,
  COALESCE(a.message::text, '') AS body,
  a.priority::text AS priority, a.status::text AS status, a.updated_at
FROM public.grain_alerts a
WHERE a.status::text IN ('open','acknowledged','triggered')
UNION ALL
SELECT
  ('install:' || i.id::text), 'install'::text,
  h.admin_id, i.technician_id, i.silo_id, i.order_id,
  ('Install visit ' || substr(h.id::text, 1, 8)),
  COALESCE(i.blocker_note, ''),
  'medium'::text, i.status::text,
  COALESCE(i.updated_at, i.created_at)
FROM public.hardware_order_installations i
JOIN public.hardware_orders h ON h.id = i.order_id
WHERE i.status::text NOT IN ('completed','cancelled');
GRANT SELECT ON public.mobile_field_task_v TO authenticated;

CREATE TABLE IF NOT EXISTS public.mobile_marketplace_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  hero_headline text NOT NULL DEFAULT 'Fresh grain, direct from verified farms',
  hero_subheadline text NOT NULL DEFAULT 'Browse listings, chat with sellers, close deals in minutes.',
  featured_commodities jsonb NOT NULL DEFAULT '["wheat","rice","maize","barley"]'::jsonb,
  min_app_build int NOT NULL DEFAULT 1,
  kill_switch boolean NOT NULL DEFAULT false,
  kill_switch_message text,
  allowed_attachment_types jsonb NOT NULL DEFAULT '["image/jpeg","image/png","application/pdf"]'::jsonb,
  max_message_length int NOT NULL DEFAULT 2000,
  moderation_banner text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mobile_marketplace_settings TO anon, authenticated;
GRANT ALL ON public.mobile_marketplace_settings TO service_role;
ALTER TABLE public.mobile_marketplace_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mobile_marketplace_settings_public_read" ON public.mobile_marketplace_settings FOR SELECT USING (true);
CREATE POLICY "mobile_marketplace_settings_super_admin_write" ON public.mobile_marketplace_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_mobile_marketplace_settings_updated BEFORE UPDATE ON public.mobile_marketplace_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.mobile_marketplace_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE VIEW public.mobile_marketplace_v AS
SELECT
  l.id, l.slug, l.title, l.description,
  l.price_per_kg, l.currency, l.available_kg, l.min_order_kg,
  l.cover_image_url, l.status, l.visibility, l.updated_at,
  l.admin_id AS seller_id,
  p.name AS seller_name,
  b.grain_type::text AS commodity,
  b.grade::text AS grade
FROM public.grain_listings l
LEFT JOIN public.profiles p ON p.id = l.admin_id
LEFT JOIN public.grain_batches b ON b.id = l.batch_id
WHERE l.visibility::text = 'public' AND l.status::text = 'active';
GRANT SELECT ON public.mobile_marketplace_v TO anon, authenticated;

CREATE OR REPLACE VIEW public.mobile_buyer_summary_v AS
SELECT
  o.buyer_id AS buyer_user_id,
  count(*) FILTER (WHERE o.status::text NOT IN ('completed','cancelled','refunded')) AS active_orders,
  count(*) FILTER (WHERE o.status::text IN ('paid','dispatched','delivered'))         AS in_flight_orders,
  coalesce(sum(o.unread_buyer_messages), 0)                                          AS unread_messages,
  max(o.updated_at)                                                                  AS updated_at
FROM public.buyer_orders o
WHERE o.buyer_id IS NOT NULL
GROUP BY o.buyer_id;
GRANT SELECT ON public.mobile_buyer_summary_v TO authenticated;

INSERT INTO public.mobile_deep_link_routes (key, native_route, web_fallback, description, active) VALUES
  ('market.listing',  '/marketplace/listing/:slug', '/marketplace/listing/:slug', 'Public listing detail', true),
  ('market.order',    '/orders/:id',                '/marketplace/orders/:id',    'Buyer order detail', true),
  ('market.message',  '/orders/:id/messages',       '/marketplace/orders/:id',    'Order message thread', true),
  ('market.dispute',  '/orders/:id/dispute',        '/marketplace/orders/:id',    'Order dispute', true),
  ('seller.listing',  '/listings/:id',              '/listings',                  'Seller listing detail', true),
  ('seller.order',    '/sales/orders/:id',          '/sales',                     'Seller order detail', true),
  ('field.incident',  '/field/incidents/:id',       '/incidents',                 'Field incident detail', true),
  ('field.task',      '/field/tasks/:id',           '/technician/installs',       'Field task detail', true)
ON CONFLICT (key) DO NOTHING;
