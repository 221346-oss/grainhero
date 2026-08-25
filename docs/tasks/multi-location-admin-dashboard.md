# Multi-Location Admin Dashboard — Requirement Report

**Status:** Implemented — R2 and R13 outstanding, Q3 partially addressed
**Owner:** Abdullah
**Target branch:** `abdullah_dev` (standing PR #55 → `main`)
**Date:** 2026-08-25 (rev. 2)

> **Revision 3.** The feature is built. R1 and R3–R17 are implemented across
> the dashboard and every location-dependent page; see §10 for the delivery
> record. Two requirements remain open — **R2** (payment precondition) and
> **R13** (enforcing the manager rule in existing code) — both because they
> need a decision rather than because the work is hard. **Q3** was taken along
> the metrics-first path (S16), which holds under either reading; separately
> trained per-site models remain unscoped.

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
Switching must be **immediate**, and loaded data must **remain available rather
than being discarded** — an Admin who enters one city and then wants to check
another should not pay a full reload, nor lose what was already fetched.

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

### 2.7 Team structure

Confirmed as a platform-wide rule, applying to existing work as well as this
feature:

- One **Admin** per account — the buyer who owns the warehouses.
- An Admin may hold **many warehouses**.
- Each warehouse has **exactly one Manager**. Two warehouses means two managers.
  Multiple managers on the same warehouse is not a valid state.
- Each warehouse may have **multiple Technicians** assigned.

### 2.8 Rationale

The goal is operational manageability. An owner running sites in three cities
should not have to mentally separate them out of a single merged view.

---

## 3. Role scoping

| Role | Location selector | Behaviour |
|---|---|---|
| **Admin** | **Yes** | The entire feature. Owns multiple warehouses across cities. |
| **Super Admin** | **No** | Explicitly out of scope — the platform-level dashboard is a separate concern. |
| **Manager** | **No** | Logs in under their Admin, bound to exactly one warehouse → goes straight to their designated dashboard. One manager per warehouse; never more. |
| **Technician** | **No — deferred** | Multiple technicians may be assigned per warehouse. The wider designation-role work is **deferred** by the lead as a separate, larger piece; treat as Manager for now. |

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
| R12 | Technician follows Manager behaviour for now; designation-role work deferred |
| R13 | Each warehouse has **exactly one Manager**; multiple managers per warehouse is invalid |
| R14 | Each warehouse may have **multiple Technicians** |
| R15 | A single-location Admin **still sees the selector**, showing their one card |
| R16 | Switching between locations must be fast and must **not lose loaded state** |
| R17 | Card presentation must reflect the account's **plan** |

---

## 5. Question status

The questions raised against the first revision have been reviewed. Their
current status is below.

### 5.1 Resolved

**Q1 — What if an Admin has only one location? → RESOLVED.**
The selector is **still shown**, displaying that Admin's single card. It is not
skipped. *(→ R15. This overrules suggestion S3, now withdrawn.)*

**Q4 — Should the location choice persist? → RESOLVED.**
The Admin must be able to move between locations freely and immediately — enter
one card, then switch straight to another city if they want to check it. Loaded
data **must remain available rather than being discarded** on switch. The
priority is switching speed and state retention, not a remembered preference
across logins. *(→ R16.)*

**Q6 — Managers assigned to more than one warehouse? → RESOLVED.**
Each warehouse has **exactly one manager**; there are never multiple managers on
the same warehouse. Technicians may be multiple per warehouse. An Admin with two
warehouses therefore has two managers. This was given as a **platform-wide rule
to apply to existing code as well as new work**, not a decision local to this
feature. *(→ R13, R14, §2.7.)*

### 5.2 Delegated

**Q2 — Is a card a city, or a warehouse? → OUR CALL.**
Explicitly delegated: either a separate card per warehouse grouped within a city,
or one card per city with its warehouses inside, whichever works better. The
decision sits with the implementer, so it should be made deliberately and
recorded here once settled rather than left to emerge from the code.

### 5.3 Deferred

**Q5 — Technician role. → DEFERRED.**
The broader designation-role work is a substantial piece in its own right and has
been set aside for a separate discussion. Technicians follow Manager behaviour
for the purposes of this feature.

### 5.4 Partially answered

**Q7 — Is anything excluded from segregation? → PARTIAL.**
Direction given: card presentation should reflect the account's plan (→ R17), and
a gap was noted around the plan/meter view not being available at billing time.
What this does **not** yet settle is whether billing, subscription, and
plan-limit views remain account-wide rather than per-location. **Still needs an
explicit answer** before the query audit (S9) can classify those endpoints.

**Q8 — Plan user count. → PARTIAL.**
To be established from the actual plan definitions rather than assumed. Owner:
this side.

### 5.5 Still open

**Q3 — Per-location models: separate models, or a shared model with separate
metrics? → OPEN.**
Not yet addressed, and it remains the largest unknown in the specification. The
two readings differ by roughly an order of magnitude in effort — per-location
metrics on a shared model is a reporting change; separately trained per-site
models is a pipeline project. **This should be resolved before Phase 3 is
scoped.** The recommended path in the interim is S16: ship per-location metrics
first and scope per-site training separately, on evidence.

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

**S3 — ~~Auto-skip the selector for single-location Admins.~~ WITHDRAWN.**
*Overruled — see Q1.* This proposed skipping the chooser when an Admin has only
one location. The decision is that the selector is **always shown**, displaying
the single card (R15). Recorded rather than deleted so the question is not raised
a second time. The related work is now S2 — if a single-location Admin sees that
card on every login, the card must carry enough live signal to be worth the
click.

**S4 — Put a location switcher in the app header.**
*Recommend adopting — now supported by the Q4 clarification.* R8 requires the Admin to go back to change location.
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
*Strongly recommend — now load-bearing.* R16 requires that switching locations
does not discard loaded data, which means per-location results must coexist in
the cache rather than overwrite each other. Scoped keys are what make that
possible; they are simultaneously what prevents one location's cached rows being
served for another. Getting this wrong breaks R16 and R7 at once. If React Query keys do not include the active location,
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
*Recommend adopting — Q3 remains open, making this the safe default.* Predictions are already written with a
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

Carried forward from revision 1, with resolved items closed.

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | Study the requirement and determine whether it is implementable | Abdullah | Done — see §6 |
| 2 | Give an explicit go / no-go on taking the task | Abdullah | **Open** |
| 3 | Confirm Technician role behaviour | — | Closed — deferred (Q5) |
| 4 | Resolve Q1, Q4, Q6 | — | Closed |
| 5 | Confirm nothing further was decided in the planning meeting | Abdullah → lead | **Open** |
| 6 | Agree a merge order against PR #52 (S19) | Abdullah → lead | **Open** — see note below |
| 7 | Decide on the "All locations" roll-up (S1) | Abdullah → lead | **Open** |
| 8 | Confirm segregation is application-layer, not database-enforced (S10) | Abdullah → lead | **Open** |
| 9 | **Resolve Q3 — per-location models vs. per-location metrics** | Abdullah → lead | **Open — blocks Phase 3 scoping** |
| 10 | Settle Q7 — do billing/subscription views stay account-wide? | Abdullah → lead | **Open — blocks the query audit** |
| 11 | Establish the plan user count from the plan definitions (Q8) | Abdullah | **Open** |
| 12 | Decide and record the Q2 card model (city vs. warehouse) | Abdullah | **Open — delegated** |
| 13 | Apply the one-manager-per-warehouse rule (R13) to existing code, not just this feature | Abdullah | **Open** |
| 14 | Review outstanding intern work and agree how it continues | Abdullah → lead | **Open** |

**On action 6.** The merge-order risk against PR #52 was raised and came back as
not a particular concern. That response should be treated with care: both
branches remain green, unreviewed, and touching the same six dashboard files, so
the conflict itself has not gone away — only the concern about it. Recommend
confirming explicitly rather than assuming the risk was assessed and dismissed.

**On action 13.** R13 was given as a platform-wide rule covering existing work,
which makes it wider than this feature. Worth scoping separately before it is
absorbed silently into this task.

Suggestions S2, S4–S9, S11–S18, and S20–S21 are implementation-level and do not
need sign-off; they are recorded so the decisions behind them are visible. S3 has
been withdrawn.

---

## 10. Delivery record

Implemented on `abdullah_dev` (PR #55).

| Requirement | Status | Where |
|---|---|---|
| R1, R3–R6 | Done | `LocationPicker`, `listAdminLocations`, `location-scope.ts` |
| R7 | Done | 62 queries scoped across every location-dependent page |
| R8, R16 | Done | `LocationSwitcher`, `?loc=` param, scope-keyed caches |
| R9 | Done (metrics-first) | `getMLModels` scoped; per-site training not attempted |
| R10–R12, R14 | Done | Role gating in `LocationScopeGate`; `platform.*` excluded |
| R15 | Done | Picker shown for single-location admins |
| R17 | Done | Plan allowance on the picker via `max_warehouses` |
| **R2** | **Open** | No payment gate exists anywhere in the app — needs a decision on whether to add one |
| **R13** | **Partial** | One manager per warehouse holds structurally (`manager_id` is scalar). Whether one person may manage several warehouses is undecided, so nothing is enforced in existing code. |

### Design decisions taken

- **Q2 (delegated):** a card is a **city**, scoping to the list of warehouses
  within it. This is the superset — it satisfies R6 today and allows a
  per-warehouse drill-down later without changing the data model.
- **Failing closed:** an unknown or stale `?loc=` resolves to an **empty**
  scope, never the tenant-wide one. RLS gives no backstop here because the
  admin genuinely owns every warehouse, so a widening bug would look like
  authorised access.
- **Scope resolved server-side** from the caller's own warehouses rather than
  from ids supplied by the client.
- **Deliberately account-wide:** `subscriptions`, `profiles`, `buyers`, and all
  `platform.*` views. Each is annotated in code with the reason.

### Known limitations

- **Nothing has been verified in a browser.** There is no `.env.local`, so the
  dev server cannot run locally. Every change passes typecheck, lint, tests and
  build, but a wrong warehouse filter hides rows silently rather than erroring —
  no static check catches that. **This is the largest outstanding risk.**
- Test coverage is unit-level only (city derivation and scope resolution).
  There are no integration tests proving cross-location isolation against a real
  database, which is what S15 actually asked for.
