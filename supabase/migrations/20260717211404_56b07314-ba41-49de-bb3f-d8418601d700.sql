CREATE POLICY "logistics receipts read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'logistics-receipts' AND (
    public.is_super_admin(auth.uid())
    OR (split_part(name,'/',1))::uuid = public.get_tenant_admin_id(auth.uid())
  ));
CREATE POLICY "logistics receipts write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logistics-receipts' AND (
    public.is_super_admin(auth.uid())
    OR (split_part(name,'/',1))::uuid = public.get_tenant_admin_id(auth.uid())
  ));
CREATE POLICY "logistics receipts update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logistics-receipts' AND (
    public.is_super_admin(auth.uid())
    OR (split_part(name,'/',1))::uuid = public.get_tenant_admin_id(auth.uid())
  ));
CREATE POLICY "logistics receipts delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logistics-receipts' AND (
    public.is_super_admin(auth.uid())
    OR (split_part(name,'/',1))::uuid = public.get_tenant_admin_id(auth.uid())
  ));
