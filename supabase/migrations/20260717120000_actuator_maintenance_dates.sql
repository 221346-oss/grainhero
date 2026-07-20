-- Code (getMaintenanceOverview, markMaintenanceDone) tracks maintenance dates
-- on actuators, but the table never had the columns sensor_devices has.
ALTER TABLE public.actuators
  ADD COLUMN IF NOT EXISTS last_maintenance_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_maintenance_date TIMESTAMPTZ;
