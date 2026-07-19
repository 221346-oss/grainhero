
ALTER TABLE public.hardware_orders
  ADD COLUMN IF NOT EXISTS install_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS install_lng DOUBLE PRECISION;

-- When an installation row exists but has no destination coords, auto-fill from the order.
CREATE OR REPLACE FUNCTION public.default_installation_destination()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ord RECORD;
BEGIN
  IF NEW.destination_address IS NULL OR NEW.destination_lat IS NULL OR NEW.destination_lng IS NULL THEN
    SELECT install_address, install_lat, install_lng
      INTO ord
      FROM public.hardware_orders
     WHERE id = NEW.order_id;
    IF ord.install_address IS NOT NULL AND NEW.destination_address IS NULL THEN
      NEW.destination_address := ord.install_address;
    END IF;
    IF ord.install_lat IS NOT NULL AND NEW.destination_lat IS NULL THEN
      NEW.destination_lat := ord.install_lat;
    END IF;
    IF ord.install_lng IS NOT NULL AND NEW.destination_lng IS NULL THEN
      NEW.destination_lng := ord.install_lng;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_installation_destination ON public.hardware_order_installations;
CREATE TRIGGER trg_default_installation_destination
  BEFORE INSERT OR UPDATE ON public.hardware_order_installations
  FOR EACH ROW EXECUTE FUNCTION public.default_installation_destination();
