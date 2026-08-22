-- ============================================================================
-- Auto-Sync Plan Upgrades
-- ============================================================================
-- This migration creates a trigger that automatically syncs subscriptions
-- when a user's profile plan changes (upgrade/downgrade).
--
-- Whenever profiles.subscription_plan is updated, the trigger:
-- 1. Maps the plan_id to the proper plan_name
-- 2. Updates the subscriptions table to match
-- 3. Sets status to 'active' if it was pending
--
-- ============================================================================

-- Step 1: Create a function to sync subscription when profile plan changes
CREATE OR REPLACE FUNCTION sync_subscription_on_plan_change()
RETURNS TRIGGER AS $$
DECLARE
  plan_name_mapped TEXT;
BEGIN
  -- Only sync if subscription_plan actually changed
  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan THEN
    -- Map plan_id to plan_name
    plan_name_mapped := CASE 
      WHEN LOWER(NEW.subscription_plan) IN ('starter', 'basic') THEN 'Grain Starter'
      WHEN LOWER(NEW.subscription_plan) IN ('professional', 'intermediate', 'growth') THEN 'Grain Professional'
      WHEN LOWER(NEW.subscription_plan) IN ('enterprise', 'pro', 'scale') THEN 'Grain Enterprise'
      ELSE NEW.subscription_plan -- fallback to original if not recognized
    END;
    
    -- Update the user's subscription record(s) to match
    UPDATE subscriptions
    SET 
      plan_name = plan_name_mapped,
      status = 'active',
      updated_at = NOW()
    WHERE 
      admin_id = NEW.id
      AND status != 'cancelled'; -- don't touch cancelled subscriptions
    
    -- Log the sync in activity log if it exists
    INSERT INTO activity_logs (
      admin_id,
      user_id,
      action,
      description,
      entity_type,
      entity_id,
      metadata,
      severity,
      created_at
    ) VALUES (
      NEW.id,
      NEW.id,
      'subscription.plan_synced',
      'Subscription plan auto-synced: ' || OLD.subscription_plan || ' → ' || NEW.subscription_plan,
      'profile',
      NEW.id,
      jsonb_build_object(
        'old_plan', OLD.subscription_plan,
        'new_plan', NEW.subscription_plan,
        'mapped_plan_name', plan_name_mapped
      ),
      'info',
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger on profiles table
DROP TRIGGER IF EXISTS tr_sync_subscription_on_plan_change ON profiles;

CREATE TRIGGER tr_sync_subscription_on_plan_change
AFTER UPDATE OF subscription_plan ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_on_plan_change();

-- ============================================================================
-- Step 3: Immediate Fix - Sync all misaligned subscriptions
-- ============================================================================
-- This syncs any existing records where profile plan doesn't match subscription plan

UPDATE subscriptions s
SET 
  plan_name = CASE 
    WHEN LOWER(p.subscription_plan) IN ('starter', 'basic') THEN 'Grain Starter'
    WHEN LOWER(p.subscription_plan) IN ('professional', 'intermediate', 'growth') THEN 'Grain Professional'
    WHEN LOWER(p.subscription_plan) IN ('enterprise', 'pro', 'scale') THEN 'Grain Enterprise'
    ELSE p.subscription_plan
  END,
  status = 'active',
  updated_at = NOW()
FROM profiles p
WHERE 
  s.admin_id = p.id
  AND s.status IN ('active', 'trialing')
  AND p.admin_id IS NULL  -- only top-level admins
  AND (
    s.plan_name IS NULL 
    OR LOWER(s.plan_name) NOT LIKE CASE 
      WHEN LOWER(p.subscription_plan) IN ('starter', 'basic') THEN '%starter%'
      WHEN LOWER(p.subscription_plan) IN ('professional', 'intermediate', 'growth') THEN '%professional%'
      WHEN LOWER(p.subscription_plan) IN ('enterprise', 'pro', 'scale') THEN '%enterprise%'
      ELSE LOWER(p.subscription_plan)
    END
  );

-- ============================================================================
-- Step 4: Verification Queries
-- ============================================================================

-- Check if trigger was created
SELECT 
  'Trigger Status' as check_name,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_name = 'tr_sync_subscription_on_plan_change';

-- Show synchronized subscriptions
SELECT 
  'Synced Subscriptions' as summary,
  p.email,
  p.subscription_plan,
  s.plan_name,
  s.status,
  s.updated_at
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.admin_id
WHERE p.admin_id IS NULL
ORDER BY p.subscription_plan DESC, p.email;

-- Summary by plan
SELECT 
  'Plan Distribution (after sync)' as summary,
  p.subscription_plan,
  COUNT(*) as user_count,
  COUNT(s.id) as with_subscription,
  COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.admin_id
WHERE p.admin_id IS NULL
GROUP BY p.subscription_plan
ORDER BY user_count DESC;
