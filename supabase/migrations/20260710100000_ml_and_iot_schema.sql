-- 1. Create spoilage_predictions table
CREATE TABLE IF NOT EXISTS public.spoilage_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.grain_batches(id) ON DELETE CASCADE,
    silo_id UUID REFERENCES public.silos(id) ON DELETE CASCADE,
    prediction_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    temperature NUMERIC,
    humidity NUMERIC,
    moisture NUMERIC,
    voc NUMERIC,
    co2 NUMERIC,
    storage_days INTEGER,
    risk_score NUMERIC CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_class TEXT CHECK (risk_class IN ('low', 'moderate', 'high', 'critical')),
    confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
    factors JSONB
);

-- Enable RLS
ALTER TABLE public.spoilage_predictions ENABLE ROW LEVEL SECURITY;

-- Policy for spoilage_predictions (Admins can view their tenant's predictions, but for simplicity here we just allow authenticated users to view)
CREATE POLICY "Enable read access for authenticated users" ON public.spoilage_predictions
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Derived metrics trigger on sensor_readings
CREATE OR REPLACE FUNCTION public.calculate_derived_metrics()
RETURNS TRIGGER AS $$
DECLARE
    prev_voc NUMERIC;
BEGIN
    -- Calculate Dew Point
    IF NEW.temperature_value IS NOT NULL AND NEW.humidity_value IS NOT NULL AND NEW.humidity_value > 0 THEN
        NEW.dew_point := NEW.temperature_value - ((100 - NEW.humidity_value) / 5.0);
    END IF;

    -- Calculate Pest Risk Score (simple heuristic)
    IF NEW.temperature_value IS NOT NULL AND NEW.humidity_value IS NOT NULL THEN
        IF NEW.temperature_value BETWEEN 25 AND 32 AND NEW.humidity_value > 65 THEN
            NEW.pest_presence_score := 80;
        ELSEIF NEW.temperature_value BETWEEN 20 AND 35 AND NEW.humidity_value > 50 THEN
            NEW.pest_presence_score := 40;
        ELSE
            NEW.pest_presence_score := 10;
        END IF;
    END IF;

    -- Calculate VOC rate of change over the last 5 minutes
    IF NEW.voc_value IS NOT NULL AND NEW.device_id IS NOT NULL THEN
        SELECT voc_value INTO prev_voc
        FROM public.sensor_readings
        WHERE device_id = NEW.device_id
          AND reading_timestamp >= (NEW.reading_timestamp - INTERVAL '5 minutes')
          AND reading_timestamp < NEW.reading_timestamp
        ORDER BY reading_timestamp ASC
        LIMIT 1;

        IF prev_voc IS NOT NULL THEN
            NEW.voc_rate_5min := NEW.voc_value - prev_voc;
        ELSE
            NEW.voc_rate_5min := 0;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_derived_metrics ON public.sensor_readings;
CREATE TRIGGER trg_calculate_derived_metrics
    BEFORE INSERT ON public.sensor_readings
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_derived_metrics();


-- 3. Aggregated Sensor Readings 5m Materialized View
-- We'll use a standard view or materialized view.
DROP MATERIALIZED VIEW IF EXISTS public.aggregated_sensor_readings_5m;
CREATE MATERIALIZED VIEW public.aggregated_sensor_readings_5m AS
SELECT
    device_id,
    batch_id,
    silo_id,
    date_trunc('hour', reading_timestamp) + date_part('minute', reading_timestamp)::int / 5 * interval '5 min' AS time_bucket,
    COUNT(*) as reading_count,
    AVG(temperature_value) as avg_temp,
    MIN(temperature_value) as min_temp,
    MAX(temperature_value) as max_temp,
    AVG(humidity_value) as avg_humidity,
    MIN(humidity_value) as min_humidity,
    MAX(humidity_value) as max_humidity,
    AVG(moisture_value) as avg_moisture,
    AVG(co2_value) as avg_co2,
    AVG(voc_value) as avg_voc
FROM
    public.sensor_readings
WHERE 
    reading_timestamp IS NOT NULL
GROUP BY
    device_id, batch_id, silo_id, time_bucket;

CREATE UNIQUE INDEX idx_agg_sensor_5m ON public.aggregated_sensor_readings_5m(device_id, time_bucket);

-- 4. LDR Tampering Alert Trigger
CREATE OR REPLACE FUNCTION public.check_ldr_tampering()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id UUID;
    v_warehouse_id UUID;
BEGIN
    -- If ambient_light is high (e.g. > 100 lux inside a sealed silo)
    IF NEW.ambient_light IS NOT NULL AND NEW.ambient_light > 100 THEN
        -- Get admin and warehouse context
        SELECT admin_id, warehouse_id INTO v_admin_id, v_warehouse_id
        FROM public.silos
        WHERE id = NEW.silo_id;

        IF v_admin_id IS NOT NULL THEN
            INSERT INTO public.grain_alerts (
                alert_type,
                title,
                message,
                priority,
                source,
                status,
                admin_id,
                silo_id,
                batch_id,
                device_id,
                warehouse_id,
                triggered_at
            ) VALUES (
                'tampering',
                'Silo Tampering Detected (Light Ingress)',
                'High ambient light detected inside silo. Lid may be open or compromised.',
                'critical',
                'sensor_system',
                'active',
                v_admin_id,
                NEW.silo_id,
                NEW.batch_id,
                NEW.device_id,
                v_warehouse_id,
                NEW.reading_timestamp
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_ldr_tampering ON public.sensor_readings;
CREATE TRIGGER trg_check_ldr_tampering
    AFTER INSERT ON public.sensor_readings
    FOR EACH ROW
    EXECUTE FUNCTION public.check_ldr_tampering();
