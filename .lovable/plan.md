# Phase 5 — Notifications & Realtime Unification

## Goal
Single, reliable notification pipeline with realtime delivery, unified read/unread state, and consistent UI across roles.

## Problems today
- Notifications inserted from multiple call sites with inconsistent shape (`type`, `severity`, `link`, `metadata`).
- No realtime subscription — users must refresh to see new notifications.
- `activity_logs` vs `notifications` overlap; super-admin activity feed duplicates entries.
- No unread badge in header; no "mark all read".
- Email/SMS side-channel not wired to the same event source, so users get in-app-only alerts for critical events.

## Deliverables

### 1. Schema hardening (migration)
- Add missing columns to `notifications` if absent: `category` (enum: `billing | plan | order | install | security | system | ops`), `severity` (`info | success | warning | critical`), `link`, `metadata jsonb`, `read_at timestamptz`.
- Backfill defaults for existing rows.
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;`
- RLS: recipient can `SELECT`/`UPDATE own`; service_role full; super_admin `SELECT` all.
- Index: `(recipient_id, read_at, created_at desc)`.

### 2. Unified emitter — `src/lib/notify.ts` (server)
- `emitNotification({ recipientId, category, severity, title, body, link?, metadata? })`
- `emitToRole({ tenantAdminId, role, ... })` — fan-out to all users with a role under a tenant.
- `emitToSuperAdmins(...)` — for platform-wide events (plan requests, new signups, churn).
- Internally: insert row + optional email dispatch (via existing Resend helper) when `severity >= warning` and user has email opt-in.
- All existing call sites in `plan-thresholds.functions.ts`, `billing.functions.ts`, `hardware-orders`, `installations`, `security_events` refactored to call this.

### 3. Realtime hook — `src/hooks/useNotifications.ts` (client)
- Subscribes to `postgres_changes` on `notifications` filtered by `recipient_id=eq.<me>`.
- Merges into React Query cache (`['notifications', userId]`) — no refetch storm.
- Returns `{ items, unreadCount, markRead, markAllRead }`.
- Cleanup via `removeChannel` (per realtime rules).

### 4. Header notification bell
- Reusable `<NotificationBell />` in `src/components/app/notifications/`.
- Badge with unread count (99+ cap), popover list (last 20), severity color dot, click → navigate to `link` and mark read.
- "Mark all read" and "View all" → `/notifications` page.
- Mounted in `AppSidebar` header slot for all authenticated layouts.

### 5. `/notifications` page
- Full list with filters (category, severity, unread only).
- Uses shared `AdminPageShell` + `AdminDataCard` for consistency.
- Pagination (20/page).

### 6. Activity vs Notifications separation
- `activity_logs` = immutable audit trail (who did what) — logged via `logActivity`.
- `notifications` = actionable inbox for a specific recipient — via `emitNotification`.
- Super-admin dashboard "Activity" feed reads from `activity_logs` only. Notification bell reads from `notifications` only. Remove the duplicate merge in `SuperAdminDashboard`.

### 7. Wired events (Phase-5 scope)
- Plan change requested → super-admins
- Plan change approved/rejected → requester
- Subscription created/canceled/renewed → tenant admin
- Hardware order placed / status change → admin + assigned technician
- Installation scheduled / completed → admin
- Security event (`critical`) → tenant admin + super-admins
- Plan limit hit (from `assertPlanAllows`) → tenant admin

### 8. Audit script
Extend `audit-server-fns.ts` to flag direct `supabase.from('notifications').insert(...)` outside `src/lib/notify.ts`.

## Non-goals (deferred)
- Push notifications (web-push / FCM) — Phase 12.
- SMS via Twilio — Phase 8 (billing/critical only).
- User-configurable notification preferences UI — Phase 9.

## Verification
- `tsgo` + `audit-routes` + `audit-server-fns` green.
- Manual: place a plan request → super-admin bell shows unread within 2s without refresh.
- RLS: user A cannot select user B's notifications (verified via `supabase--read_query`).
