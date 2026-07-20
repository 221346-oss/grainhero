
ALTER TABLE public.buyer_reviews
  ADD COLUMN IF NOT EXISTS seller_response text,
  ADD COLUMN IF NOT EXISTS seller_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reported_at timestamptz,
  ADD COLUMN IF NOT EXISTS reported_reason text;

CREATE TABLE IF NOT EXISTS public.buyer_review_helpful (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.buyer_reviews(id) ON DELETE CASCADE,
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, buyer_account_id)
);
GRANT SELECT, INSERT, DELETE ON public.buyer_review_helpful TO authenticated;
GRANT ALL ON public.buyer_review_helpful TO service_role;
ALTER TABLE public.buyer_review_helpful ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "helpful: buyer manages own" ON public.buyer_review_helpful;
CREATE POLICY "helpful: buyer manages own"
ON public.buyer_review_helpful FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.buyer_accounts ba WHERE ba.id = buyer_review_helpful.buyer_account_id AND ba.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.buyer_accounts ba WHERE ba.id = buyer_review_helpful.buyer_account_id AND ba.user_id = auth.uid()));

DROP POLICY IF EXISTS "helpful: public read counts" ON public.buyer_review_helpful;
CREATE POLICY "helpful: public read counts"
ON public.buyer_review_helpful FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.favorite_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.grain_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_account_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorite_listings TO authenticated;
GRANT ALL ON public.favorite_listings TO service_role;
ALTER TABLE public.favorite_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites: buyer manages own" ON public.favorite_listings;
CREATE POLICY "favorites: buyer manages own"
ON public.favorite_listings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.buyer_accounts ba WHERE ba.id = favorite_listings.buyer_account_id AND ba.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.buyer_accounts ba WHERE ba.id = favorite_listings.buyer_account_id AND ba.user_id = auth.uid()));

CREATE OR REPLACE VIEW public.seller_reputation AS
WITH review_stats AS (
  SELECT r.admin_id,
         AVG(r.rating)::numeric(3,2) AS avg_rating,
         COUNT(*) FILTER (WHERE r.created_at > now() - interval '90 days') AS review_count_90d,
         COUNT(*) AS review_count_total
  FROM public.buyer_reviews r
  WHERE r.status = 'published'
  GROUP BY r.admin_id
),
delivered_stats AS (
  SELECT o.admin_id,
         COUNT(*) AS delivered_count,
         COUNT(*) FILTER (
           WHERE s.delivered_at IS NOT NULL
             AND (s.expected_delivery_at IS NULL OR s.delivered_at <= s.expected_delivery_at)
         ) AS on_time_count,
         (AVG(EXTRACT(EPOCH FROM (s.delivered_at - s.dispatched_at)) / 3600)
           FILTER (WHERE s.delivered_at IS NOT NULL AND s.dispatched_at IS NOT NULL))::numeric(6,2) AS avg_transit_hours
  FROM public.buyer_orders o
  LEFT JOIN public.buyer_shipments s ON s.order_id = o.id
  WHERE o.status IN ('completed','dispatched','paid')
  GROUP BY o.admin_id
),
dispute_stats AS (
  SELECT admin_id, COUNT(*) AS dispute_count
  FROM public.buyer_disputes
  GROUP BY admin_id
),
seller_admins AS (
  SELECT DISTINCT admin_id FROM public.buyer_orders
)
SELECT
  sa.admin_id,
  COALESCE(rs.avg_rating, 0)::numeric(3,2) AS avg_rating,
  COALESCE(rs.review_count_90d, 0)::int AS review_count_90d,
  COALESCE(rs.review_count_total, 0)::int AS review_count_total,
  COALESCE(ds.delivered_count, 0)::int AS delivered_count,
  COALESCE(ds.on_time_count, 0)::int AS on_time_count,
  CASE WHEN COALESCE(ds.delivered_count,0) = 0 THEN 0
       ELSE ROUND(ds.on_time_count::numeric / ds.delivered_count, 4) END AS on_time_rate,
  COALESCE(ds.avg_transit_hours, 0)::numeric(6,2) AS avg_transit_hours,
  COALESCE(dp.dispute_count, 0)::int AS dispute_count,
  CASE WHEN COALESCE(ds.delivered_count,0) = 0 THEN 0
       ELSE ROUND(dp.dispute_count::numeric / GREATEST(ds.delivered_count,1), 4) END AS dispute_rate,
  LEAST(100, GREATEST(0, ROUND(
    (COALESCE(rs.avg_rating,0) / 5.0) * 40
    + (CASE WHEN COALESCE(ds.delivered_count,0)=0 THEN 0
            ELSE ds.on_time_count::numeric / ds.delivered_count END) * 30
    + (1 - LEAST(1, CASE WHEN COALESCE(ds.delivered_count,0)=0 THEN 0
                         ELSE dp.dispute_count::numeric / GREATEST(ds.delivered_count,1) END)) * 20
    + (CASE WHEN COALESCE(ds.avg_transit_hours,0) = 0 THEN 0
            WHEN ds.avg_transit_hours <= 48 THEN 10
            WHEN ds.avg_transit_hours <= 96 THEN 6
            WHEN ds.avg_transit_hours <= 168 THEN 3
            ELSE 1 END)
  )))::int AS fulfillment_score
FROM seller_admins sa
LEFT JOIN review_stats rs ON rs.admin_id = sa.admin_id
LEFT JOIN delivered_stats ds ON ds.admin_id = sa.admin_id
LEFT JOIN dispute_stats dp ON dp.admin_id = sa.admin_id;

GRANT SELECT ON public.seller_reputation TO anon, authenticated;
