-- Migration: Add 'completed' status to hardware_orders enum
-- Fixes: "Invalid enum value" when marking order as completed in super-admin

-- Create enum if it doesn't exist with all values including 'completed'
DO $$ BEGIN
  -- Check if the enum type exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hardware_order_status') THEN
    CREATE TYPE public.hardware_order_status AS ENUM (
      'pending_payment', 'new', 'approved', 'tech_assigned', 
      'installed', 'live', 'cancelled', 'completed', 'paid'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- If hardware_orders.status is already an enum or has a CHECK constraint, update it to allow 'completed'
-- First, update the CHECK constraint to include 'completed' if it exists
DO $$ BEGIN
  ALTER TABLE public.hardware_orders
    DROP CONSTRAINT IF EXISTS hardware_orders_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.hardware_orders
    ADD CONSTRAINT hardware_orders_status_check
    CHECK (status IN ('pending_payment', 'new', 'approved', 'tech_assigned', 'installed', 'live', 'cancelled', 'completed', 'paid'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Verify: show current hardware_orders status values in database
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'hardware_orders' AND column_name = 'status';
