-- Bug reports submitted by users from anywhere in the app (floating
-- "Report a bug" button — see src/components/app/BugReportButton.tsx).
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid,
  description text NOT NULL,
  page_path text,
  user_agent text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'resolved', 'wont_fix')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bug reports"
  ON public.bug_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can submit their own bug reports"
  ON public.bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can update bug reports"
  ON public.bug_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON public.bug_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports (status);

CREATE TRIGGER trg_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
