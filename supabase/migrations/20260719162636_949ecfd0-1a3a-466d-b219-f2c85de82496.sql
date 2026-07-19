
-- 1) Backfill any paid orders still stuck at pending_payment.
UPDATE public.hardware_orders
   SET status = 'new'
 WHERE status = 'pending_payment'
   AND (admin_id IS NOT NULL OR stripe_session_id IS NOT NULL);

-- 2) Trigger: whenever admin_id or stripe_session_id gets set, promote status.
CREATE OR REPLACE FUNCTION public.promote_paid_hardware_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending_payment'
     AND (NEW.admin_id IS NOT NULL OR NEW.stripe_session_id IS NOT NULL) THEN
    NEW.status := 'new';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_paid_hardware_order ON public.hardware_orders;
CREATE TRIGGER trg_promote_paid_hardware_order
  BEFORE INSERT OR UPDATE ON public.hardware_orders
  FOR EACH ROW EXECUTE FUNCTION public.promote_paid_hardware_order();

-- 3) Allow the order owner (admin) to reply in the message thread.
DROP POLICY IF EXISTS "Order owner can insert messages" ON public.hardware_order_messages;
CREATE POLICY "Order owner can insert messages"
  ON public.hardware_order_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.hardware_orders o
      WHERE o.id = order_id AND o.admin_id = auth.uid()
    )
  );
