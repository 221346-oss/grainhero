-- Add missing status values for field incidents
-- The alert_status enum currently has: pending, acknowledged, resolved, escalated, closed
-- We need to add: open, investigating, dismissed
-- These are used by field incidents and the monitoring page UI

-- Add 'open' status (initial state for field incidents)
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'open';

-- Add 'investigating' status (intermediate state when looking into the incident)
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'investigating';

-- Add 'dismissed' status (closed without action)
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'dismissed';

-- Note: The order of enum values cannot be changed after creation
-- New values are appended to the end of the enum
-- Current order will be: pending, acknowledged, resolved, escalated, closed, open, investigating, dismissed
