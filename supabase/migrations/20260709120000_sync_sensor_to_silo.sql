-- =========================================================================
-- TRIGGER: sync_sensor_to_silo_conditions
-- Automatically updates silo.current_conditions whenever a new sensor
-- reading is inserted into sensor_readings.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.sync_sensor_to_silo_conditions()
RETURNS TRIGGER AS $$
DECLARE
  updates jsonb := '{}'::jsonb;
BEGIN
  -- Only proceed if the reading is linked to a silo
  IF NEW.silo_id IS NOT NULL THEN
    
    -- Accumulate updates for each tracked metric
    IF NEW.temperature_value IS NOT NULL THEN
      updates := jsonb_set(updates, '{temperature}', jsonb_build_object('value', NEW.temperature_value));
    END IF;
    
    IF NEW.humidity_value IS NOT NULL THEN
      updates := jsonb_set(updates, '{humidity}', jsonb_build_object('value', NEW.humidity_value));
    END IF;
    
    IF NEW.co2_value IS NOT NULL THEN
      updates := jsonb_set(updates, '{co2}', jsonb_build_object('value', NEW.co2_value));
    END IF;
    
    IF NEW.voc_value IS NOT NULL THEN
      updates := jsonb_set(updates, '{voc}', jsonb_build_object('value', NEW.voc_value));
    END IF;
    
    IF NEW.moisture_value IS NOT NULL THEN
      updates := jsonb_set(updates, '{moisture}', jsonb_build_object('value', NEW.moisture_value));
    END IF;
    
    -- Always update the last_updated timestamp if we got a new reading
    updates := jsonb_set(updates, '{last_updated}', to_jsonb(NEW.reading_timestamp));
    
    -- Only update the silo if there are actual updates to merge
    IF updates != '{}'::jsonb THEN
      UPDATE public.silos
      SET current_conditions = coalesce(current_conditions, '{}'::jsonb) || updates
      WHERE id = NEW.silo_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to sensor_readings table
DROP TRIGGER IF EXISTS trg_sync_sensor_to_silo ON public.sensor_readings;
CREATE TRIGGER trg_sync_sensor_to_silo
AFTER INSERT ON public.sensor_readings
FOR EACH ROW
EXECUTE FUNCTION public.sync_sensor_to_silo_conditions();
