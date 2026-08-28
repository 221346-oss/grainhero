-- Create bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('ticket-attachments', 'ticket-attachments', true, false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ticket_read" ON storage.objects;
DROP POLICY IF EXISTS "ticket_write" ON storage.objects;
DROP POLICY IF EXISTS "ticket_delete" ON storage.objects;

-- Policy 1: Allow all authenticated users to read
CREATE POLICY "ticket_read" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments');

-- Policy 2: Allow all authenticated users to upload
CREATE POLICY "ticket_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ticket-attachments');

-- Policy 3: Allow all authenticated users to delete
CREATE POLICY "ticket_delete" ON storage.objects FOR DELETE USING (bucket_id = 'ticket-attachments');
