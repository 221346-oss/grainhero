-- ============================================================
-- Pinned Tickets Schema Extension
-- Adds pinned_by and pinned_at columns to field_tickets table
-- to support super-admin ticket pinning on the business page.
--
-- Requirements: 14.1, 14.2, 14.3, 14.4
-- ============================================================

-- Add pinned_by: UUID reference to the super_admin who pinned the ticket.
-- NULL means the ticket is not pinned.
ALTER TABLE public.field_tickets
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add pinned_at: timestamp of when the ticket was pinned.
-- NULL when ticket is not pinned.
ALTER TABLE public.field_tickets
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Partial index for efficient lookup of pinned tickets:
-- Only indexes rows where pinned_by IS NOT NULL, keeping the index small.
-- Supports the query: SELECT * FROM field_tickets WHERE pinned_by IS NOT NULL
-- ordered by pinned_at DESC.
CREATE INDEX IF NOT EXISTS idx_pinned_tickets
  ON public.field_tickets (pinned_by, pinned_at DESC)
  WHERE pinned_by IS NOT NULL;

-- Comment the new columns for documentation
COMMENT ON COLUMN public.field_tickets.pinned_by IS
  'UUID of the super_admin who pinned this ticket. NULL = not pinned.';

COMMENT ON COLUMN public.field_tickets.pinned_at IS
  'Timestamp when this ticket was pinned by a super_admin. NULL = not pinned.';
