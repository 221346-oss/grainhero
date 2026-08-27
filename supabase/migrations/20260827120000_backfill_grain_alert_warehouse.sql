-- =========================================================================
-- Backfill grain_alerts.warehouse_id where the tenant makes it unambiguous
-- =========================================================================
--
-- Alerts predating 20260720120000_multi_warehouse_support.sql carry no
-- warehouse. Once a location is active, rows with a null warehouse are excluded
-- — unattributed data belongs to no city, and showing it under one would be the
-- mixing the location feature exists to prevent. So these rows are invisible on
-- every scoped page.
--
-- A tenant that owns exactly ONE warehouse has only one possible answer, so
-- those rows can be attributed with certainty. A tenant with several has no
-- recoverable answer: nothing on the row points at a silo, a batch or a
-- warehouse, so any choice would be invented. Those are left null deliberately.
--
-- At the time of writing this resolves 2 of 10 legacy rows. The other 8 belong
-- to a tenant that owns no warehouses at all and can never be attributed; they
-- are `source = 'field_incident'`, `alert_type = 'in-app'` — closer to an
-- in-app notice than a silo alert, which is worth settling separately before
-- anyone tries harder to force them into a location.
--
-- Written to be safe to re-run.
-- =========================================================================

UPDATE public.grain_alerts AS a
SET warehouse_id = sole.warehouse_id,
    updated_at = now()
FROM (
  SELECT w.admin_id, MIN(w.id) AS warehouse_id
  FROM public.warehouses w
  WHERE w.deleted_at IS NULL
  GROUP BY w.admin_id
  HAVING COUNT(*) = 1
) AS sole
WHERE a.warehouse_id IS NULL
  AND a.admin_id = sole.admin_id;

-- The silo stays null on purpose. A tenant's single warehouse is determined;
-- which of its silos an alert concerned is not, and guessing would put a real
-- alert against the wrong silo on the cockpit.

COMMENT ON COLUMN public.grain_alerts.warehouse_id IS
  'Warehouse this alert belongs to. Null means unattributed — excluded from every location-scoped view rather than shown under an arbitrary city. Writers must set this; see 20260827120000 for the legacy backfill.';
