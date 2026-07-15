-- Migration: auto_register_support
-- Adds last_ping_at to sensor_devices (used by cron heartbeat + offline detection)
-- and removes the non-existent silo columns the cron was trying to write.

-- 1. Add last_ping_at to sensor_devices
--    The cron uses this for both heartbeat writes and offline threshold detection.
--    last_heartbeat already exists but carries different semantics (health_metrics).
ALTER TABLE public.sensor_devices
  ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sensor_devices_last_ping_at
  ON public.sensor_devices (last_ping_at);

-- 2. online status alias
--    sensor_devices.status is an Enum: "active"|"offline"|"error"|"maintenance"
--    The cron writes status="online" which is NOT a valid enum value.
--    Correct value is "active". This constraint is enforced by the existing enum.
--    No schema change needed — the cron code will be fixed to write "active".

-- 3. connection_status column check
--    sensor_devices.connection_status is TEXT (no enum), so any value is accepted.
--    No schema change needed.
