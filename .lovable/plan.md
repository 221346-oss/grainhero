## Goal

Replace the confusing free-form status dropdown with a single, forward-only 6-stage install lifecycle that spans the whole order journey, with clear ownership per step and a compact visual tracker.

## Unified stages

```
1 Paid  →  2 Assigned  →  3 En route  →  4 On-site  →  5 Installed  →  6 Completed
 (Stripe)   (SuperAdmin) (SuperAdmin)   (SuperAdmin) (SuperAdmin)     (Admin)
```

- **Forward-only.** Once a step is reached, it cannot be moved backward from the UI. (Guarded server-side.)
- **Silo/warehouse provisioning fires only when Admin confirms step 6 (Completed).** Not on "Installed".
- **"Blocked"** stays available as an off-flow state (with a required note) so a stalled install is visible without regressing the stage.

## Ownership

- Steps 2–5: only `super_admin` can advance.
- Step 6 (Completed): only the order's `admin_id` can confirm — this is the buyer signing off that hardware is live. This is what runs the auto-provision trigger.
- The stale "installed" order-level field on `hardware_orders` gets aligned so the /orders page never shows a downgrade like "installed → pending payment" again.

## Visual tracker

- **Compact pill row** in the orders table + drawer header: 6 tiny dots/pills, filled up to the current stage, current one glowing emerald, blocked = amber outline. Hover shows stage name + timestamp.
- **Expandable timeline** inside the drawer: each stage as a row with icon, actor, timestamp, and optional note. Reuses existing `hardware_order_visit_events` rows keyed by `event_type` (`assigned`, `en_route`, `onsite`, `installed`, `completed`, `blocked`).
- Replaces the free-form status `<select>` entirely.

## Technical changes

**Database migration**
- Extend `hardware_order_installations_status_check` to include `installed` in addition to existing values.
- Add `installed_at timestamptz` (already exists on `hardware_orders`; add on installations too for the timeline).
- Update `auto_provision_from_install()` trigger: fire on transition to `completed` only when the previous status was `installed` (guards accidental double provisioning and enforces the order of steps).
- Add trigger `enforce_install_status_forward()` that rejects backward transitions (allow to/from `blocked` from any prior stage, but never past `completed`).
- Add helper RPC `advance_install_stage(order_id, next_stage, note)` that:
  - Verifies the caller's role vs. required actor for `next_stage`.
  - Writes the new status + timestamp column.
  - Inserts a matching `hardware_order_visit_events` row (`event_type = next_stage`).

**Server functions (`src/lib/installations.functions.ts`)**
- Replace `upsertInstallation`'s free-form status write with `advanceInstallStage` calling the new RPC.
- Keep other patch fields (address, devices, coordinates) editable independently — they no longer touch status.
- Add `getInstallLifecycle(orderId)` returning `{ stage, history: Array<{stage, actor, at, note}> }` derived from `hardware_orders` + installation + visit events.

**Components**
- New `src/components/app/orders/InstallStageTracker.tsx`
  - Props: `stage`, `history`, `canAdvance`, `onAdvance(nextStage, note?)`, `variant: "row" | "full"`.
  - Row variant = pill row (used in orders tables).
  - Full variant = pill row + vertical timeline + "Advance to X" button gated by role.
- Refactor `InstallationDrawer.tsx`:
  - Drop the `<select>` for status.
  - Show `InstallStageTracker variant="full"` at top.
  - Remove the "Mark complete & provision silos" custom button; it becomes the tracker's Advance button on the `installed → completed` step, and is only enabled for the Admin.
  - Keep devices + address + map + notes as-is (unchanged responsibilities).
- Refactor `src/routes/_authenticated/platform.orders.tsx` (SuperAdmin table) and `src/routes/_authenticated/orders.tsx` (Admin table) to render `InstallStageTracker variant="row"` in the status column so both sides see the same lifecycle.

**Role gating**
- Reuse existing `has_role` + order `admin_id` to compute `canAdvance` client-side; the RPC re-checks server-side (source of truth).
- Admin's "Confirm Completed" button also fires the existing provisioning trigger (unchanged) — no separate provisioning UI.

## Out of scope

- No changes to the checkout flow, Stripe webhook, technician assignment UI, marketplace, or dashboards.
- No changes to the auto-provisioning logic itself — only *when* it fires (on Admin's Completed step, not SuperAdmin's Installed step).
