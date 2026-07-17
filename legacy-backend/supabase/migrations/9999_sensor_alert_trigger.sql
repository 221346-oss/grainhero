-- =============================================================================
-- GrainHero – Migration 9999: sensor_alert_trigger
-- =============================================================================
-- Creates a PostgreSQL AFTER INSERT trigger on `sensor_readings` that
-- automatically generates entries in `grain_alerts` whenever a reading
-- breaches critical grain-storage thresholds.
--
-- Thresholds (science-backed):
--   Temperature  > 30°C  → high risk of mould & insect activity
--   Humidity     > 75 %  → high risk of condensation & mycotoxin formation
--   Condensation risk    → independent of above thresholds
--
-- References:
--   ASABE D245.6 – Moisture Relationships of Plant-Based Agricultural Products
--   FAO Grain Storage Techniques Ch.4
--   Magan & Aldred (2007) Int. J. Food Microbiology 119(1-2), 131-139
-- =============================================================================

-- ─── 1. Trigger function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_sensor_thresholds()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_alert_level  TEXT;
  v_alert_title  TEXT;
  v_alert_body   TEXT;
BEGIN
  -- -----------------------------------------------------------------
  -- Temperature breach  (> 30°C)
  -- -----------------------------------------------------------------
  IF NEW.temperature_value > 30 THEN

    v_alert_level := CASE
                       WHEN NEW.temperature_value > 38 THEN 'critical'
                       WHEN NEW.temperature_value > 34 THEN 'high'
                       ELSE                                 'medium'
                     END;

    v_alert_title := format(
      'High Temperature: %.1f°C in device %s',
      NEW.temperature_value,
      NEW.device_id
    );

    v_alert_body := format(
      'Sensor reading at %s recorded a temperature of %.1f°C (threshold: 30°C). '
      'Grain spoilage risk is elevated. Consider activating ventilation.',
      NEW.ingested_at,
      NEW.temperature_value
    );

    INSERT INTO grain_alerts (
      device_id,
      sensor_reading_id,
      alert_type,
      alert_level,
      title,
      body,
      temperature_value,
      humidity_value,
      is_read,
      created_at
    ) VALUES (
      NEW.device_id,
      NEW.id,
      'temperature_breach',
      v_alert_level,
      v_alert_title,
      v_alert_body,
      NEW.temperature_value,
      NEW.humidity_value,
      FALSE,
      NOW()
    );

  END IF;

  -- -----------------------------------------------------------------
  -- Humidity breach  (> 75 %)
  -- -----------------------------------------------------------------
  IF NEW.humidity_value > 75 THEN

    v_alert_level := CASE
                       WHEN NEW.humidity_value > 90 THEN 'critical'
                       WHEN NEW.humidity_value > 82 THEN 'high'
                       ELSE                               'medium'
                     END;

    v_alert_title := format(
      'High Humidity: %.1f%% in device %s',
      NEW.humidity_value,
      NEW.device_id
    );

    v_alert_body := format(
      'Sensor reading at %s recorded humidity of %.1f%% (threshold: 75%%). '
      'Risk of mould growth and mycotoxin formation. Ventilate immediately.',
      NEW.ingested_at,
      NEW.humidity_value
    );

    INSERT INTO grain_alerts (
      device_id,
      sensor_reading_id,
      alert_type,
      alert_level,
      title,
      body,
      temperature_value,
      humidity_value,
      is_read,
      created_at
    ) VALUES (
      NEW.device_id,
      NEW.id,
      'humidity_breach',
      v_alert_level,
      v_alert_title,
      v_alert_body,
      NEW.temperature_value,
      NEW.humidity_value,
      FALSE,
      NOW()
    );

  END IF;

  -- -----------------------------------------------------------------
  -- Condensation risk  (dew_point within 2°C of temperature)
  -- -----------------------------------------------------------------
  IF NEW.condensation_risk = TRUE THEN

    INSERT INTO grain_alerts (
      device_id,
      sensor_reading_id,
      alert_type,
      alert_level,
      title,
      body,
      temperature_value,
      humidity_value,
      is_read,
      created_at
    ) VALUES (
      NEW.device_id,
      NEW.id,
      'condensation_risk',
      'high',
      format('Condensation Risk in device %s', NEW.device_id),
      format(
        'Dew point (%.1f°C) is within 2°C of ambient temperature (%.1f°C). '
        'Moisture will condense on grain surfaces. Activate drying or reduce humidity.',
        NEW.dew_point,
        NEW.temperature_value
      ),
      NEW.temperature_value,
      NEW.humidity_value,
      FALSE,
      NOW()
    );

  END IF;

  RETURN NEW;
END;
$$;

-- ─── 2. Bind trigger to sensor_readings ─────────────────────────────────────
-- Drop existing trigger first so re-running this migration is idempotent.
DROP TRIGGER IF EXISTS sensor_alert_trigger ON sensor_readings;

CREATE TRIGGER sensor_alert_trigger
AFTER INSERT ON sensor_readings
FOR EACH ROW
EXECUTE FUNCTION check_sensor_thresholds();

-- ─── 3. Helpful comment for future maintainers ───────────────────────────────
COMMENT ON FUNCTION check_sensor_thresholds() IS
  'GrainHero auto-alert trigger: fires after every sensor_readings INSERT and '
  'raises entries in grain_alerts for temperature > 30°C, humidity > 75%, '
  'or condensation_risk = TRUE.  Thresholds are based on ASABE D245.6 and FAO guidelines.';
