-- Business -> Revenue: Batch 5 audit, Item 5. Adds an explicit "buyer
-- confirmed" checkpoint between "send to buyer" (dispatch draft submitted)
-- and "admin approves sale" (approveDispatch). Buyers have no account/login
-- in this system, so this is recorded by an admin/manager on the buyer's
-- behalf — see confirmDispatchBuyer in dispatches.functions.ts and the
-- buyer_confirmation_recorded_by_admin security_events entry it writes.

ALTER TABLE public.grain_dispatches
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_by uuid;

CREATE INDEX IF NOT EXISTS idx_grain_dispatches_buyer_confirmed_at ON public.grain_dispatches(buyer_confirmed_at);
