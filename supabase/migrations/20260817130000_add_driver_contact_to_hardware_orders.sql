-- Driver contact + vehicle info for hardware order deliveries so the
-- super-admin can keep in touch with the truck driver while a silo is in transit.
ALTER TABLE public.hardware_orders
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS vehicle_plate text;
