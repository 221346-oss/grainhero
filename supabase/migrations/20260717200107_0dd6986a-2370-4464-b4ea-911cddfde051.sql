
CREATE POLICY "invoices_read_own" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.buyer_orders o
      WHERE o.invoice_pdf_url LIKE '%' || storage.objects.name || '%'
        AND (
          o.admin_id = public.get_tenant_admin_id(auth.uid())
          OR o.buyer_id IN (SELECT buyer_id FROM public.buyer_accounts WHERE user_id = auth.uid())
        )
    )
  )
);
