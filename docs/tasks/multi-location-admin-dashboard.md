# Multi-Location Admin Dashboard — Requirement Report

**Status:** Feasibility study — awaiting go/no-go
**Owner:** Abdullah
**Target branch:** `abdullah_dev` (standing PR #55 → `main`)
**Date:** 2026-08-25

---

## 1. Background

This requirement was agreed in a regional web/app planning meeting and is
recorded here as a written specification so it can be reviewed, checked, and
signed off before implementation begins.

An **Admin** in GrainHero is a warehouse owner. Their subscription plan covers a
number of users and a number of warehouses, and those warehouses may be spread
across multiple cities. The working example used throughout this document is an
Admin operating in **three cities: Karachi, Hyderabad, and Rawalpindi (Pindi)**.

Today such an Admin logs in and lands on a single dashboard covering their entire
account, with every site's data merged into one view. This document specifies
splitting that into a per-location experience.

---

## 2. Requirement

### 2.1 Location selection at login

After the Admin logs in — and once payment and onboarding are complete — they do
**not** land directly on the dashboard. They first see a **card grid, one card
per location**. An Admin with warehouses in three cities sees three cards, each
carrying that location's name and summary information.

The payment precondition is explicit: this screen sits after billing is settled,
not before.

### 2.2 Entering a location

Clicking a card opens **the main dashboard**, scoped to that location. This is
specifically the dashboard currently being redesigned — the same design language
as the superadmin work already in progress, not the existing dashboard.

### 2.3 Scoped content

The dashboard shows only the selected location's data: its silos and its
warehouses. A single city may contain **more than one warehouse** — if Pindi
holds two, both appear together under the Pindi card. The card therefore
represents a **city**, and scopes to the set of warehouses within it.

### 2.4 Switching location

The Admin can return from a location dashboard and select a different card.

### 2.5 Data segregation

**Data from one location must never appear in another location's view.** Silos
belonging to different warehouses must not be rendered in the same set, and
moving from the Pindi card to the Karachi card must produce cleanly separated
data with no bleed between them.

This is the central constraint of the feature and the primary source of
implementation difficulty.

### 2.6 Per-location AI models

The AI/ML models **and their reported performance metrics** should be
per-location. The rationale is that each site has its own dataset, so predictions
and accuracy will legitimately differ between locations.

### 2.7 Rationale

The goal is operational manageability. An owner running sites in three cities
should not have to mentally separate them out of a single merged view.

---

## 3. Role scoping

| Role | Location selector | Behaviour |
|---|---|---|
| **Admin** | **Yes** | The entire feature. Owns multiple warehouses across cities. |
| **Super Admin** | **No** | Explicitly out of scope — the platform-level dashboard is a separate concern. |
| **Manager** | **No** | Logs in under their Admin and is already bound to one city and one warehouse → goes straight to their designated dashboard. |
| **Technician** | **Presumed no** | Expected to behave as Manager does — **but this must be confirmed, not assumed.** |

---

## 4. Requirement summary

| # | Requirement |
|---|---|
| R1 | An Admin (warehouse owner) may hold warehouses in multiple cities |
| R2 | After login and once payment is complete, the Admin sees a card grid, one card per location |
| R3 | Each card carries that location's name and information |
| R4 | Clicking a card opens the main dashboard — the redesigned one |
| R5 | That dashboard shows only the selected location's silos and warehouses |
| R6 | One city may hold multiple warehouses; all appear together under that city |
| R7 | Data from different locations must never be mixed in one view |
| R8 | The Admin can go back and switch to a different location |
| R9 | AI models and their performance metrics are per-location |
| R10 | Feature applies to Admin only — not Super Admin, not Manager |
| R11 | Manager and Technician go straight to their designated single-location dashboard |
| R12 | Technician behaviour to be **confirmed**, not assumed |

---

## 5. Open questions

These are unresolved in the specification as agreed and need answers before
implementation.

**Q1 — What if an Admin has only one location?**
The requirement only describes the multi-city case. It is unclear whether a
single-warehouse Admin should still be shown a one-card screen, or be taken
straight to the dashboard.

**Q2 — Is a card a city, or a warehouse?**
The requirement describes one card per city, with all of that city's warehouses
shown together (R6). But segregation is also described as applying "by each city,
by each warehouse" — both levels. Whether the warehouse level is a further
drill-down inside a city, or simply loose phrasing, is unresolved. This changes
whether a selection is a single id or a list.

**Q3 — Per-location models: separate models, or a shared model with separate
metrics?**
R9 supports either reading, and the difference in effort is substantial —
per-location metrics on a shared model is a modest change; separately trained
models per site is a pipeline project. This is the largest unknown.

**Q4 — Should the location choice persist?**
A switch path exists (R8), but it is not specified whether the selection is
remembered between sessions or re-prompted on every login.

**Q5 — Technician role.**
Flagged for confirmation (R12).

**Q6 — Managers assigned to more than one warehouse?**
R11 assumes one manager belongs to exactly one city and one warehouse. A manager
covering several sites is not addressed.

**Q7 — Is anything excluded from segregation?**
A plan is purchased at the account level, not per site. Whether billing,
subscription, and plan-limit views remain account-wide is not specified.

**Q8 — Plan user count.**
The number of users included in the example plan tier is not established here and
should be confirmed against the actual plan definitions.

---

## 6. Suggestions

The following are **proposals, not agreed requirements.** They came out of a
review of the existing codebase against the specification above, and are offered
to improve the result. Each is marked with a recommendation.

### 6.1 Product suggestions

**S1 — Add an "All locations" roll-up alongside the per-location cards.**
*Recommend adopting.* The specification segregates data, but an owner running
three sites still needs to compare them — which site is filling fastest, where
spoilage risk is highest, which is underperforming. Strict segregation with no
bird's-eye view removes something the current merged dashboard already provides.
Suggest a persistent "All locations" card or tab that presents a comparison
roll-up, clearly labelled as cross-site so it can never be mistaken for one
location's data. This satisfies R7 (no accidental mixing) while preserving
oversight. **Worth raising explicitly — it may have been assumed, or may have
been deliberately excluded.**

**S2 — Make the cards informative, not just navigational.**
*Recommend adopting.* R3 asks only for name and information. A card showing live
signal — silo count, total capacity and current occupancy, open alerts, a
"needs attention" badge — turns the selector from a speed bump into a daily
triage screen. Without this, an Admin who logs in three times a day pays a click
each time for no information gain.

**S3 — Auto-skip the selector for single-location Admins.**
*Recommend adopting, pending Q1.* Showing a one-card chooser on every login is
friction with no purpose. Suggest: exactly one location → go straight to the
dashboard, with the switcher (S4) still available if a second site is added
later.

**S4 — Put a location switcher in the app header.**
*Recommend adopting.* R8 requires the Admin to go back to change location.
Forcing a return to a full-screen chooser on every switch is slow. A compact
switcher in the header — showing the active location at all times — both speeds
this up and keeps the current scope permanently visible, which materially
reduces the risk of misreading one site's numbers as another's.

**S5 — Show the active location prominently on the dashboard itself.**
*Recommend adopting.* The main defence against a user misattributing data is not
technical, it is visual. A persistent, unmissable location label on the scoped
dashboard is cheap and directly serves the intent behind R7.

**S6 — Encode the selected location in the URL.**
*Recommend adopting.* This makes a scoped dashboard linkable and shareable
("look at Karachi's numbers"), survives refresh, and gives the switcher clean
back/forward behaviour. It also answers part of Q4 without needing a stored
preference.

**S7 — Handle the empty and partial states.**
*Recommend adopting.* Not covered by the specification: an Admin whose plan
allows warehouses but who has provisioned none yet, a location with warehouses
but no silos, and an Admin whose plan warehouse limit is already reached. Each
needs a defined screen.

### 6.2 Technical suggestions

**S8 — Consolidate scope resolution into one helper before adding warehouse
scoping.**
*Strongly recommend.* Ten files under `src/lib/` currently resolve tenant scope
independently, via a locally redefined `resolveTenantAdminId()` or a direct
`get_tenant_admin_id()` RPC. There is no shared chokepoint, so adding a warehouse
filter means ten separate edits with ten chances to miss one — and a missed one
is a silent data leak, the exact failure R7 forbids.

`src/lib/page-scope.server.ts` already defines the right abstraction
(`PageScope`, with platform/tenant modes and impersonation handling) and
currently has **zero call sites**. Suggest reviving it, extending it with a
warehouse dimension, and routing all scope resolution through it. This converts
the audit from "find every query" into "find every scope resolution."

**S9 — Treat the query audit as the main body of work.**
*Recommend adopting.* 33 files reference `warehouse_id` today. Some dashboard
queries — the silo and actuator queries in `dashboard-extras.functions.ts`
among them — carry no application-level tenant filter at all and rely entirely on
row-level security. Every such query needs to either take the warehouse filter or
be explicitly annotated as intentionally account-wide. The card screen is a small
piece of work; this is not.

**S10 — Do not rely on RLS to enforce location boundaries.**
*Important.* Row-level security currently scopes by tenant — an Admin
legitimately owns every warehouse in their account, so **RLS will not stop one
location's rows reaching another location's view.** Location segregation is an
application-layer guarantee unless new policies are added. This should be a
conscious, recorded decision rather than an assumption, because the natural
expectation is that the database is protecting us here, and it is not.

**S11 — Consider database-level enforcement as a follow-up.**
*Recommend deferring, not dropping.* If segregation must be guaranteed rather
than trusted, a session-variable-driven policy predicate would enforce it below
the application. Suggest shipping the application-layer version first and
treating this as a hardening pass, with S10 recorded as an accepted risk in the
interim.

**S12 — Include the location scope in all client cache keys.**
*Recommend adopting.* If React Query keys do not include the active location,
switching sites will serve the previous site's cached data — producing exactly
the cross-contamination R7 forbids, with no server-side bug to find. This is an
easy defect to introduce and an unpleasant one to diagnose.

**S13 — Normalise city values before grouping.**
*Recommend adopting.* Warehouse location data is stored as JSONB with `city`,
`address`, and `description` keys all in circulation. Grouping cards on a raw
value will split one city into several cards where the data is inconsistent.
Existing migrations already normalise this for warehouse deduplication —
the card grouping should use the same normalisation rather than a second,
divergent one.

**S14 — Reuse the existing region-grouping component.**
*Recommend adopting.* `MultiRegionWarehousesView.tsx` already groups an Admin's
warehouses by region and renders per-warehouse detail. The card selector should
lift and restyle this rather than reimplement the grouping logic, which avoids a
second source of truth for how locations are derived.

**S15 — Add regression tests specifically for cross-location bleed.**
*Strongly recommend.* Given R7 is the defining constraint, it should be enforced
by tests, not review. Suggest fixtures with two warehouses in two cities under
one Admin, asserting that every scoped endpoint returns only the selected
location's rows. This is the only mechanism that will keep the guarantee true as
other work lands.

### 6.3 AI/ML suggestions

**S16 — Start with per-location metrics on the shared model.**
*Recommend adopting, pending Q3.* Predictions are already written with a
warehouse reference, so aggregating performance by location is a reporting change
rather than a modelling one. This delivers the visible half of R9 quickly and
lets the far larger question of per-site training be scoped separately on
evidence.

**S17 — Show cross-location model comparison.**
*Recommend adopting.* The stated rationale for R9 is that different datasets
produce different results. That is most useful when the differences are visible
side by side — a comparison view answers "why is Karachi's accuracy lower?",
which per-location metrics in isolation cannot.

**S18 — Guard against thin-data locations.**
*Recommend adopting.* A newly provisioned site will have little history, so its
metrics will be volatile or meaningless. Per-location figures should carry a
sample-size indicator and suppress or caveat results below a threshold, rather
than presenting an unreliable number with the same confidence as an established
site's.

### 6.4 Delivery suggestions

**S19 — Sequence this against the in-flight dashboard PR.**
*Act on this before starting.* PR #52 modifies `AdminDashboard.tsx`,
`DashboardBlocks.tsx`, `RangeChip.tsx`, `DispatchSaleWizard.tsx`,
`RevenueSection.tsx`, and `BatchLifecycleActions.tsx` — all of which are in scope
for this work, and all of which have already been rewritten on `abdullah_dev`.
Both branches are currently green and awaiting review. Whichever merges second
will conflict substantially. **Agree a merge order before this work starts** —
this is the largest schedule risk and it is entirely avoidable.

**S20 — Ship behind a feature flag.**
*Recommend adopting.* The change alters the post-login landing for every Admin.
A flag allows the selector to be enabled for one account first and rolled back
instantly without a redeploy if segregation problems surface in production.

**S21 — Stage the delivery.**
*Recommend adopting.* Suggested order: (1) scope consolidation and query audit,
(2) selector and switcher, (3) per-location ML metrics, (4) database-level
hardening. Putting the audit first means the UI is built on a scoping model that
is already trustworthy, rather than retrofitting correctness underneath a
shipped screen.

---

## 7. Actions

| # | Action | Owner |
|---|---|---|
| 1 | Study the requirement and determine whether it is implementable | Abdullah |
| 2 | Give an explicit go / no-go on taking the task | Abdullah |
| 3 | Confirm Technician role behaviour (R12 / Q5) | Abdullah → lead |
| 4 | Resolve open questions Q1–Q4, Q6–Q8 | Abdullah → lead |
| 5 | Confirm no further decisions were taken in the planning meeting beyond those recorded here | Abdullah → lead |
| 6 | **Agree a merge order against PR #52 before starting** (S19) — largest schedule risk | Abdullah → lead |
| 7 | Decide on the "All locations" roll-up (S1) — changes the shape of the feature | Abdullah → lead |
| 8 | Confirm the accepted position that segregation is application-layer, not database-enforced (S10) | Abdullah → lead |

Suggestions S2–S9, S11–S18, and S20–S21 are implementation-level and do not need
sign-off; they are recorded so the decisions behind them are visible.
