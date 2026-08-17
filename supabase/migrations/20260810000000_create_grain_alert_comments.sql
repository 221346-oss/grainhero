-- Create grain_alert_comments table for monitoring incident discussions
CREATE TABLE IF NOT EXISTS public.grain_alert_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.grain_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  message TEXT NOT NULL CHECK (length(message) >= 1 AND length(message) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.grain_alert_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see comments for incidents they're involved in
CREATE POLICY "grain_alert_comments_select_policy" ON public.grain_alert_comments
  FOR SELECT
  USING (
    -- Check if user is a participant in the incident
    EXISTS (
      SELECT 1 FROM public.grain_alerts ga
      WHERE ga.id = incident_id
      AND (
        -- Field incidents: only reporter and recipient can see
        (ga.source = 'field_incident' AND (ga.created_by = auth.uid() OR ga.recipient_id = auth.uid()))
        OR
        -- System incidents: reporter, assignee, and managers/admins can see
        (ga.source != 'field_incident' AND (
          ga.created_by = auth.uid() 
          OR ga.assigned_to = auth.uid()
          OR ga.admin_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'manager', 'super_admin')
          )
        ))
      )
    )
  );

-- Policy: Users can only insert comments for incidents they're involved in
CREATE POLICY "grain_alert_comments_insert_policy" ON public.grain_alert_comments
  FOR INSERT
  WITH CHECK (
    -- Must be their own comment
    user_id = auth.uid()
    AND
    -- Check if user is a participant in the incident
    EXISTS (
      SELECT 1 FROM public.grain_alerts ga
      WHERE ga.id = incident_id
      AND ga.status != 'resolved' -- No comments on resolved incidents
      AND (
        -- Field incidents: only reporter and recipient can comment
        (ga.source = 'field_incident' AND (ga.created_by = auth.uid() OR ga.recipient_id = auth.uid()))
        OR
        -- System incidents: reporter, assignee, and managers/admins can comment
        (ga.source != 'field_incident' AND (
          ga.created_by = auth.uid() 
          OR ga.assigned_to = auth.uid()
          OR ga.admin_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'manager', 'super_admin')
          )
        ))
      )
    )
  );

-- Policy: No updates allowed (comments are immutable)
CREATE POLICY "grain_alert_comments_no_update" ON public.grain_alert_comments
  FOR UPDATE
  USING (false);

-- Policy: No deletes allowed (comments are permanent)
CREATE POLICY "grain_alert_comments_no_delete" ON public.grain_alert_comments
  FOR DELETE
  USING (false);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_grain_alert_comments_incident_id ON public.grain_alert_comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_grain_alert_comments_created_at ON public.grain_alert_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_grain_alert_comments_user_id ON public.grain_alert_comments(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_grain_alert_comments_updated_at 
  BEFORE UPDATE ON public.grain_alert_comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();