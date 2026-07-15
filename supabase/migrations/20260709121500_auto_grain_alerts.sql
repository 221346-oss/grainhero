-- =========================================================================
-- TRIGGER: auto_grain_alerts
-- Automatically generates alerts when sensor readings exceed silo thresholds.
-- Includes deduplication to avoid spamming alerts for ongoing conditions.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.check_sensor_thresholds()
RETURNS TRIGGER AS $$
DECLARE
  v_silo_thresholds jsonb;
  v_metric_thresholds jsonb;
  v_priority text;
  v_msg text;
  v_threshold numeric;
  v_alert_exists boolean;
BEGIN
  -- Only proceed if the reading is linked to a silo
  IF NEW.silo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch silo thresholds
  SELECT thresholds INTO v_silo_thresholds
  FROM public.silos
  WHERE id = NEW.silo_id;

  IF v_silo_thresholds IS NULL OR v_silo_thresholds = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- =========================================================================
  -- TEMPERATURE EVALUATION
  -- =========================================================================
  IF NEW.temperature_value IS NOT NULL AND v_silo_thresholds ? 'temperature' THEN
    v_metric_thresholds := v_silo_thresholds->'temperature';
    v_priority := NULL;
    v_threshold := NULL;

    IF v_metric_thresholds ? 'critical_max' AND NEW.temperature_value >= (v_metric_thresholds->>'critical_max')::numeric THEN
      v_priority := 'critical';
      v_threshold := (v_metric_thresholds->>'critical_max')::numeric;
      v_msg := 'Temperature is ' || NEW.temperature_value || '°C (exceeds critical max of ' || v_threshold || '°C)';
    ELSIF v_metric_thresholds ? 'critical_min' AND NEW.temperature_value <= (v_metric_thresholds->>'critical_min')::numeric THEN
      v_priority := 'critical';
      v_threshold := (v_metric_thresholds->>'critical_min')::numeric;
      v_msg := 'Temperature is ' || NEW.temperature_value || '°C (below critical min of ' || v_threshold || '°C)';
    ELSIF v_metric_thresholds ? 'max' AND NEW.temperature_value >= (v_metric_thresholds->>'max')::numeric THEN
      v_priority := 'high';
      v_threshold := (v_metric_thresholds->>'max')::numeric;
      v_msg := 'Temperature is ' || NEW.temperature_value || '°C (exceeds max of ' || v_threshold || '°C)';
    ELSIF v_metric_thresholds ? 'min' AND NEW.temperature_value <= (v_metric_thresholds->>'min')::numeric THEN
      v_priority := 'high';
      v_threshold := (v_metric_thresholds->>'min')::numeric;
      v_msg := 'Temperature is ' || NEW.temperature_value || '°C (below min of ' || v_threshold || '°C)';
    END IF;

    IF v_priority IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.grain_alerts 
        WHERE silo_id = NEW.silo_id 
          AND status IN ('pending', 'acknowledged') 
          AND trigger_conditions->>'metric' = 'temperature'
      ) INTO v_alert_exists;

      IF NOT v_alert_exists THEN
        INSERT INTO public.grain_alerts (
          alert_id, admin_id, warehouse_id, silo_id, batch_id, device_id,
          title, message, alert_type, priority, source, sensor_type,
          trigger_conditions, status
        ) VALUES (
          'ALRT-' || gen_random_uuid()::text,
          NEW.admin_id, NEW.warehouse_id, NEW.silo_id, NEW.batch_id, NEW.device_id,
          'Temperature Alert', v_msg, 'in-app', v_priority::public.alert_priority, 'threshold', 'temperature',
          jsonb_build_object('metric', 'temperature', 'value', NEW.temperature_value, 'threshold', v_threshold),
          'pending'
        );
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- HUMIDITY EVALUATION
  -- =========================================================================
  IF NEW.humidity_value IS NOT NULL AND v_silo_thresholds ? 'humidity' THEN
    v_metric_thresholds := v_silo_thresholds->'humidity';
    v_priority := NULL;
    v_threshold := NULL;

    IF v_metric_thresholds ? 'critical_max' AND NEW.humidity_value >= (v_metric_thresholds->>'critical_max')::numeric THEN
      v_priority := 'critical';
      v_threshold := (v_metric_thresholds->>'critical_max')::numeric;
      v_msg := 'Humidity is ' || NEW.humidity_value || '% (exceeds critical max of ' || v_threshold || '%)';
    ELSIF v_metric_thresholds ? 'critical_min' AND NEW.humidity_value <= (v_metric_thresholds->>'critical_min')::numeric THEN
      v_priority := 'critical';
      v_threshold := (v_metric_thresholds->>'critical_min')::numeric;
      v_msg := 'Humidity is ' || NEW.humidity_value || '% (below critical min of ' || v_threshold || '%)';
    ELSIF v_metric_thresholds ? 'max' AND NEW.humidity_value >= (v_metric_thresholds->>'max')::numeric THEN
      v_priority := 'high';
      v_threshold := (v_metric_thresholds->>'max')::numeric;
      v_msg := 'Humidity is ' || NEW.humidity_value || '% (exceeds max of ' || v_threshold || '%)';
    ELSIF v_metric_thresholds ? 'min' AND NEW.humidity_value <= (v_metric_thresholds->>'min')::numeric THEN
      v_priority := 'high';
      v_threshold := (v_metric_thresholds->>'min')::numeric;
      v_msg := 'Humidity is ' || NEW.humidity_value || '% (below min of ' || v_threshold || '%)';
    END IF;

    IF v_priority IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.grain_alerts 
        WHERE silo_id = NEW.silo_id 
          AND status IN ('pending', 'acknowledged') 
          AND trigger_conditions->>'metric' = 'humidity'
      ) INTO v_alert_exists;

      IF NOT v_alert_exists THEN
        INSERT INTO public.grain_alerts (
          alert_id, admin_id, warehouse_id, silo_id, batch_id, device_id,
          title, message, alert_type, priority, source, sensor_type,
          trigger_conditions, status
        ) VALUES (
          'ALRT-' || gen_random_uuid()::text,
          NEW.admin_id, NEW.warehouse_id, NEW.silo_id, NEW.batch_id, NEW.device_id,
          'Humidity Alert', v_msg, 'in-app', v_priority::public.alert_priority, 'threshold', 'humidity',
          jsonb_build_object('metric', 'humidity', 'value', NEW.humidity_value, 'threshold', v_threshold),
          'pending'
        );
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- CO2 EVALUATION
  -- =========================================================================
  IF NEW.co2_value IS NOT NULL AND v_silo_thresholds ? 'co2' THEN
    v_metric_thresholds := v_silo_thresholds->'co2';
    v_priority := NULL;
    v_threshold := NULL;

    IF v_metric_thresholds ? 'critical_max' AND NEW.co2_value >= (v_metric_thresholds->>'critical_max')::numeric THEN
      v_priority := 'critical';
      v_threshold := (v_metric_thresholds->>'critical_max')::numeric;
      v_msg := 'CO2 is ' || NEW.co2_value || ' ppm (exceeds critical max of ' || v_threshold || ' ppm)';
    ELSIF v_metric_thresholds ? 'max' AND NEW.co2_value >= (v_metric_thresholds->>'max')::numeric THEN
      v_priority := 'high';
      v_threshold := (v_metric_thresholds->>'max')::numeric;
      v_msg := 'CO2 is ' || NEW.co2_value || ' ppm (exceeds max of ' || v_threshold || ' ppm)';
    END IF;

    IF v_priority IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.grain_alerts 
        WHERE silo_id = NEW.silo_id 
          AND status IN ('pending', 'acknowledged') 
          AND trigger_conditions->>'metric' = 'co2'
      ) INTO v_alert_exists;

      IF NOT v_alert_exists THEN
        INSERT INTO public.grain_alerts (
          alert_id, admin_id, warehouse_id, silo_id, batch_id, device_id,
          title, message, alert_type, priority, source, sensor_type,
          trigger_conditions, status
        ) VALUES (
          'ALRT-' || gen_random_uuid()::text,
          NEW.admin_id, NEW.warehouse_id, NEW.silo_id, NEW.batch_id, NEW.device_id,
          'CO2 Alert', v_msg, 'in-app', v_priority::public.alert_priority, 'threshold', 'co2',
          jsonb_build_object('metric', 'co2', 'value', NEW.co2_value, 'threshold', v_threshold),
          'pending'
        );
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- MOISTURE EVALUATION
  -- =========================================================================
  IF NEW.moisture_value IS NOT NULL AND v_silo_thresholds ? 'moisture' THEN
    v_metric_thresholds := v_silo_thresholds->'moisture';
    v_priority := NULL;
    v_threshold := NULL;

    IF v_metric_thresholds ? 'critical_max' AND NEW.moisture_value >= (v_metric_thresholds->>'critical_max')::numeric THEN
      v_priority := 'critical';
      v_threshold := (v_metric_thresholds->>'critical_max')::numeric;
      v_msg := 'Grain Moisture is ' || NEW.moisture_value || '% (exceeds critical max of ' || v_threshold || '%)';
    ELSIF v_metric_thresholds ? 'max' AND NEW.moisture_value >= (v_metric_thresholds->>'max')::numeric THEN
      v_priority := 'high';
      v_threshold := (v_metric_thresholds->>'max')::numeric;
      v_msg := 'Grain Moisture is ' || NEW.moisture_value || '% (exceeds max of ' || v_threshold || '%)';
    END IF;

    IF v_priority IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.grain_alerts 
        WHERE silo_id = NEW.silo_id 
          AND status IN ('pending', 'acknowledged') 
          AND trigger_conditions->>'metric' = 'moisture'
      ) INTO v_alert_exists;

      IF NOT v_alert_exists THEN
        INSERT INTO public.grain_alerts (
          alert_id, admin_id, warehouse_id, silo_id, batch_id, device_id,
          title, message, alert_type, priority, source, sensor_type,
          trigger_conditions, status
        ) VALUES (
          'ALRT-' || gen_random_uuid()::text,
          NEW.admin_id, NEW.warehouse_id, NEW.silo_id, NEW.batch_id, NEW.device_id,
          'Moisture Alert', v_msg, 'in-app', v_priority::public.alert_priority, 'threshold', 'moisture',
          jsonb_build_object('metric', 'moisture', 'value', NEW.moisture_value, 'threshold', v_threshold),
          'pending'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to sensor_readings table
DROP TRIGGER IF EXISTS trg_auto_grain_alerts ON public.sensor_readings;
CREATE TRIGGER trg_auto_grain_alerts
AFTER INSERT ON public.sensor_readings
FOR EACH ROW
EXECUTE FUNCTION public.check_sensor_thresholds();
