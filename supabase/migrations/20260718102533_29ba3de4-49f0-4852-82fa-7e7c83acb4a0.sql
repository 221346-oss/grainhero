
CREATE POLICY "super admin manages payout receipts" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'payout-receipts' AND public.is_super_admin(auth.uid()))
  WITH CHECK (bucket_id = 'payout-receipts' AND public.is_super_admin(auth.uid()));

CREATE POLICY "super admin manages finance statements" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'finance-statements' AND public.is_super_admin(auth.uid()))
  WITH CHECK (bucket_id = 'finance-statements' AND public.is_super_admin(auth.uid()));
