-- Add probe_type to sensor_readings for Dual Probe Monitoring

ALTER TABLE public.sensor_readings
ADD COLUMN IF NOT EXISTS probe_type text DEFAULT 'ambient';

-- Add an index to speed up comparisons between ambient and core probes
CREATE INDEX IF NOT EXISTS idx_sensor_readings_probe_type ON public.sensor_readings(probe_type);
