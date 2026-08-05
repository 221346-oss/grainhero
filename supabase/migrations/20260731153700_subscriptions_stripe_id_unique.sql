-- subscriptions.stripe_subscription_id was never given a uniqueness
-- constraint, but every upsert in the codebase (billing-sync.server.ts's
-- syncSubscriptionFromStripe, stripe-checkout.functions.ts's
-- claimPaidCheckoutForUser) targets `onConflict: "stripe_subscription_id"`.
-- Without a matching unique index, Postgres rejects those upserts with
-- 42P10 ("no unique or exclusion constraint matching the ON CONFLICT
-- specification"), so the subscriptions table silently never gets written
-- for any paid signup, plan change, or renewal. Partial index so multiple
-- NULLs (rows created before a Stripe subscription exists) remain legal.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
