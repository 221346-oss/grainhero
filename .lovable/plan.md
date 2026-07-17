# Phase 4 — Plan Change Lifecycle & Billing Sync

Goal: turn `tenant_plan_change_requests` into a real, auditable workflow. Today admins can file a request but there is no super-admin review path, no Stripe sync, no activity trail, and no way for the requester to see status. Phase 4 closes that loop end-to-end while staying additive.

## Scope

1. **Server functions** (`src/lib/plan-thresholds.functions.ts`)
   - `listPlanChangeRequests({ status?, tenantId? })` — super-admin sees all; admin sees own tenant only. Ordered newest first, joined with requester profile + plan labels.
   - `approvePlanChangeRequest({ requestId, note? })` — super-admin only (`requireRole('super_admin')` via `session.server.ts`). Updates request to `approved`, writes `profiles.subscription_plan` for tenant admin, upserts `subscriptions` row (status `active`, `current_period_end` = now + 30d), logs `plan_change_approved` activity + `security_events`.
   - `rejectPlanChangeRequest({ requestId, reason })` — same guard, marks `rejected`, requires reason, logs activity.
   - `cancelPlanChangeRequest({ requestId })` — requester or super-admin, only while `pending`.
   - All mutations wrapped in `checkRateLimit` (10/min) and use `getVerifiedUser()`.

2. **Client hook** (`src/hooks/usePlanChangeRequests.ts`)
   - `useQuery` for list; `useMutation` for approve/reject/cancel with `queryClient.invalidateQueries(['plan-change-requests'])` and `['plan-gate']`.

3. **UI**
   - Super-admin: new tab on `/platform/plans` — "Pending requests" table (tenant, current → requested plan, reason, filed at, Approve/Reject buttons). Reuses `AdminDataCard` in table density.
   - Admin: on `/plan-management`, add "Your requests" section showing status timeline (pending → approved/rejected with note).
   - Both surfaces show empty/error via `<EmptyState>` / `<ErrorState>`.

4. **Notifications** (additive, best-effort)
   - On approve/reject, insert a row in `notifications` for the requester (`type='plan_change'`). Silent failure — never blocks the mutation.

5. **Audit script**
   - Extend `scripts/audit-server-fns.ts`: any fn matching `/plan.*change.*request/i` that mutates must call `requireRole` or `getVerifiedUser` — warn otherwise.

## Non-goals

- No real Stripe API call yet (that lands with the billing phase). We only stamp the local `subscriptions` row so downstream gates/financials pick it up immediately.
- No email/SMS — just in-app `notifications`.
- No schema migration; `tenant_plan_change_requests` already has `status`, `reviewer_id`, `reviewer_note`, `reviewed_at`.

## Acceptance

- `bun scripts/audit-routes.ts` and `bun scripts/audit-server-fns.ts` both green.
- `tsgo` clean.
- Super-admin can approve a request → tenant's `plan_gate` immediately reflects new caps; activity + security events written.
- Admin sees status update on their `/plan-management` page after refetch.
