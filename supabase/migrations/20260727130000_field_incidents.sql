-- Open Field Incident — a lightweight, any-role-to-any-person ticket, layered
-- onto the existing grain_alerts table alongside (not replacing) the
-- technician->manager->super_admin escalation chain (reportIncident /
-- assignIncident / escalateIncident in monitoring.functions.ts).
--
-- Distinguishing marker: recipient_id IS NOT NULL + source = 'field_incident'.
-- The escalation-chain rows never set recipient_id, so the two features never
-- collide in queries, and the auto-escalation cron (alerts-escalation.ts) is
-- updated in the same change to skip recipient_id rows — field incidents have
-- no auto-escalation, they only move pending -> closed.

ALTER TABLE public.grain_alerts
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grain_alerts_recipient ON public.grain_alerts (recipient_id) WHERE recipient_id IS NOT NULL;

-- New ticket-closed state, distinct from 'resolved' (which keeps its existing
-- meaning for automated sensor/threshold alerts).
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'closed';

-- New source marker for these tickets, alongside the existing values.
ALTER TABLE public.grain_alerts DROP CONSTRAINT IF EXISTS grain_alerts_source_check;
ALTER TABLE public.grain_alerts ADD CONSTRAINT grain_alerts_source_check
  CHECK (source IN ('sensor','ai','manual','system','threshold','insurance','subscription','batch','payment','user','field_incident'));
