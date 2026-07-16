-- Migration: Setup pg_cron for MQTT Edge Function Bridge
-- Description: Schedules the mqtt-bridge Edge Function to run every minute.
-- Note: Replace '<YOUR_PROJECT_REF>' and '<YOUR_SERVICE_ROLE_KEY>' with actual values 
-- before applying this in production, or better yet, store them in Supabase Vault.

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule the MQTT bridge to be invoked every minute
-- Note: Edge functions have a max execution time (usually 30s-60s on free tier). 
-- Our mqtt-bridge is designed to run for ~25s and exit cleanly.

SELECT cron.schedule(
  'invoke-mqtt-bridge-minutely',  -- name of the cron job
  '* * * * *',                    -- run every minute
  $$
    SELECT net.http_post(
        url:='https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/mqtt-bridge',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb
    );
  $$
);

-- Note: If you need to stop the job later, run:
-- SELECT cron.unschedule('invoke-mqtt-bridge-minutely');
