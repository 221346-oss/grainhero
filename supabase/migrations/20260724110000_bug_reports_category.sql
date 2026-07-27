-- Adds a category so the floating "Report a bug" popup can also be used to
-- flag a maintenance need, without building a second form.
ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'bug' CHECK (category IN ('bug', 'maintenance'));

CREATE INDEX IF NOT EXISTS idx_bug_reports_category ON public.bug_reports (category);
