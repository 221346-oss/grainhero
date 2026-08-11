-- ============================================================================
-- Enterprise Subscriptions Fix Script
-- ============================================================================
-- This script fixes the enterprise subscriptions issue by:
-- 1. Populating the plan_thresholds table with missing plans
-- 2. Ensuring all required plan configurations are present
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Verify current state
-- SELECT COUNT(*) as enterprise_profiles FROM profiles WHERE subscription_plan = 'enterprise' AND admin_id IS NULL;
-- SELECT COUNT(*) as total_plan_thresholds FROM plan_thresholds;

-- Step 2: Insert missing plan thresholds
-- This is the critical fix - the business platform likely queries this table
INSERT INTO plan_thresholds (
  plan_name, 
  warning_threshold, 
  critical_threshold, 
  is_active, 
  created_at, 
  updated_at
) VALUES 
  ('enterprise', 85, 95, true, NOW(), NOW()),
  ('Enterprise', 85, 95, true, NOW(), NOW()),
  ('Grain Enterprise', 85, 95, true, NOW(), NOW()),
  ('professional', 80, 90, true, NOW(), NOW()),
  ('Professional', 80, 90, true, NOW(), NOW()),
  ('Grain Professional', 80, 90, true, NOW(), NOW()),
  ('starter', 75, 85, true, NOW(), NOW()),
  ('Starter', 75, 85, true, NOW(), NOW()),
  ('Grain Starter', 75, 85, true, NOW(), NOW()),
  ('basic', 70, 80, true, NOW(), NOW()),
  ('Basic', 70, 80, true, NOW(), NOW()),
  ('Grain Basic', 70, 80, true, NOW(), NOW()),
  ('intermediate', 75, 85, true, NOW(), NOW()),
  ('Intermediate', 75, 85, true, NOW(), NOW()),
  ('pro', 80, 90, true, NOW(), NOW()),
  ('Pro', 80, 90, true, NOW(), NOW())
ON CONFLICT (plan_name) DO UPDATE 
SET is_active = true, updated_at = NOW();

-- Step 3: Verify the fix
SELECT 
  'After Fix - Plan Thresholds' as check_name,
  COUNT(*) as total_plans,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_plans,
  COUNT(CASE WHEN plan_name ILIKE '%enterprise%' THEN 1 END) as enterprise_plans
FROM plan_thresholds;

-- Step 4: Check enterprise profiles (should still be 0 until users sign up)
SELECT 
  'Enterprise Profiles Summary' as summary,
  COUNT(*) as total_count,
  COUNT(CASE WHEN admin_id IS NULL THEN 1 END) as top_level_admins
FROM profiles
WHERE subscription_plan = 'enterprise';

-- Step 5: Check active subscriptions
SELECT 
  'Active Subscriptions by Plan' as check_name,
  plan_name,
  COUNT(*) as subscription_count
FROM subscriptions
WHERE status = 'active'
GROUP BY plan_name
ORDER BY subscription_count DESC;

-- ============================================================================
-- OPTIONAL: Create/Update Test Enterprise User
-- ============================================================================
-- Uncomment and modify this section to create a test enterprise user
-- Replace 'test@example.com' with an actual user email

-- -- Update user to enterprise tier
-- UPDATE profiles 
-- SET subscription_plan = 'enterprise'
-- WHERE email = 'test@example.com' 
--   AND admin_id IS NULL;

-- -- Ensure they have an active subscription
-- INSERT INTO subscriptions (user_id, plan_name, status, stripe_subscription_id, created_at, updated_at)
-- SELECT 
--   p.id,
--   'Grain Enterprise',
--   'active',
--   'test-' || MD5(p.id::text),
--   NOW(),
--   NOW()
-- FROM profiles p
-- WHERE p.email = 'test@example.com'
--   AND p.admin_id IS NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM subscriptions s 
--     WHERE s.user_id = p.id AND s.status = 'active'
--   );

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Final verification: Enterprise user count
SELECT 
  'Final Check: Enterprise Users' as check,
  COUNT(*) as enterprise_user_count
FROM profiles
WHERE subscription_plan = 'enterprise'
  AND admin_id IS NULL;

-- All users by subscription plan
SELECT 
  'User Distribution by Plan' as check,
  subscription_plan,
  COUNT(*) as user_count
FROM profiles
WHERE admin_id IS NULL
GROUP BY subscription_plan
ORDER BY user_count DESC;
