-- ============================================================
-- GrainHero n8n Alert Engine — Database Changes
-- Run this ONCE in Supabase SQL Editor before testing Phase 1
-- ============================================================

-- 1. Add ai_recommendation column to grain_alerts
--    Stores the RAG-generated action text for each alert
--    (used in Phase 2 when we add the RAG node to n8n)
ALTER TABLE public.grain_alerts
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;

-- 2. Add notification_sent flag to grain_alerts
--    n8n sets this to TRUE after sending all notifications.
--    Prevents duplicate sends if the webhook fires twice (Supabase retries).
ALTER TABLE public.grain_alerts
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- 3. Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'grain_alerts'
  AND column_name IN ('ai_recommendation', 'notification_sent');
