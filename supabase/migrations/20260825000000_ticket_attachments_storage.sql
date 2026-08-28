-- Create ticket-attachments storage bucket for incident report file uploads

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true,
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access for ticket attachments
DROP POLICY IF EXISTS "Public read access for ticket attachments" ON storage.objects;
CREATE POLICY "Public read access for ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

-- Policy: Allow authenticated users to upload ticket attachments
DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow users to delete their own uploaded files
DROP POLICY IF EXISTS "Users can delete own ticket attachments" ON storage.objects;
CREATE POLICY "Users can delete own ticket attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments'
  AND auth.role() = 'authenticated'
);
