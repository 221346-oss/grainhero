-- Create field_incident_comments table for ticket discussion thread
CREATE TABLE IF NOT EXISTS public.field_incident_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.field_incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_incident_comments TO authenticated;
GRANT ALL ON public.field_incident_comments TO service_role;
ALTER TABLE public.field_incident_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_incident_comments_read" ON public.field_incident_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "field_incident_comments_insert" ON public.field_incident_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_field_incident_comments_incident_id
  ON public.field_incident_comments(incident_id, created_at ASC);
