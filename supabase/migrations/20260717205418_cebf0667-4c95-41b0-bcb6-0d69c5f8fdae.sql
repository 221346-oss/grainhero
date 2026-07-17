
-- return-attachments: owner-scoped read/write; server uses service role for signed URLs.
CREATE POLICY "return-attach owner rw"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'return-attachments' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'return-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- quality-certificates: owner-scoped upload; server signs URLs for cross-user reads.
CREATE POLICY "quality-cert owner rw"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'quality-certificates' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'quality-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);
