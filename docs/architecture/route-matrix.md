# Route Matrix

Canonical map of every route → allowed roles, data scope, plan gate.
Any new route MUST add a row here in the same change.

Roles: `super_admin` (SA), `admin` (A), `manager` (M), `technician` (T), `public` (P = unauthenticated).
Scope: `platform` (all tenants), `tenant` (rows where `admin_id = tenant_admin`), `self` (rows owned by `auth.uid()`).

## Public

| Route                                     | File            | Roles  | Scope | Plan gate | Notes              |
| ----------------------------------------- | --------------- | ------ | ----- | --------- | ------------------ |
| `/`                                       | `index.tsx`     | P      | —     | —         | Marketing landing  |
| `/about`                                  | `about.tsx`     | P      | —     | —         |                    |
| `/blog`                                   | `blog.tsx`      | P      | —     | —         |                    |
| `/contact`                                | `contact.tsx`   | P      | —     | —         |                    |
| `/docs`                                   | `docs.tsx`      | P      | —     | —         |                    |
| `/help`                                   | `help.tsx`      | P      | —     | —         |                    |
| `/team`                                   | `team.tsx`      | P      | —     | —         |                    |
| `/pricing` (in `plans.tsx` public mirror) | `plans.tsx`     | P/A/SA | —     | —         | Public catalog     |
| `/privacy`, `/terms`, `/cookies`          | \*.tsx          | P      | —     | —         | Legal              |
| `/checkout`, `/checkout/success`          | `checkout*.tsx` | A      | self  | —         | Stripe flow        |
| `/auth/*`                                 | `auth.*.tsx`    | P      | —     | —         | Login/signup/reset |

## Authenticated — All roles

| Route            | Roles    | Scope       | Plan gate |
| ---------------- | -------- | ----------- | --------- |
| `/dashboard`     | SA/A/M/T | role-aware  | —         |
| `/notifications` | SA/A/M/T | self        | —         |
| `/settings`      | SA/A/M/T | self+tenant | —         |
| `/not-allowed`   | any      | —           | —         |

## Authenticated — Admin (tenant scope)

| Route                 | Roles | Scope  | Plan gate                     |
| --------------------- | ----- | ------ | ----------------------------- |
| `/silos`              | A/M/T | tenant | `max_silos`                   |
| `/sensors`            | A/M/T | tenant | `max_sensors`                 |
| `/actuators`          | A/M/T | tenant | `max_actuators`               |
| `/grain-batches`      | A/M   | tenant | `max_batches`                 |
| `/grain-alerts`       | A/M/T | tenant | —                             |
| `/buyers`             | A/M   | tenant | `max_buyers`                  |
| `/orders`             | A/M   | tenant | —                             |
| `/insurance`          | A/M   | tenant | `features.insurance`          |
| `/reports`            | A/M   | tenant | `features.exports`            |
| `/analytics`          | A/M   | tenant | `features.analytics`          |
| `/ai-predictions`     | A/M   | tenant | `features.analytics=advanced` |
| `/ml-models`          | A     | tenant | `features.api`                |
| `/data-visualization` | A/M   | tenant | —                             |
| `/environmental`      | A/M/T | tenant | —                             |
| `/maintenance`        | A/M/T | tenant | —                             |
| `/incidents`          | A/M/T | tenant | —                             |
| `/activity-logs`      | A/M   | tenant | —                             |
| `/subscription`       | A     | self   | —                             |
| `/plan-management`    | A     | self   | —                             |
| `/plans`              | A     | —      | —                             |
| `/security-center`    | A     | tenant | —                             |
| `/server-monitoring`  | A     | tenant | —                             |

## Authenticated — Super Admin (platform scope)

| Route                  | Roles | Scope    | Plan gate                   |
| ---------------------- | ----- | -------- | --------------------------- |
| `/platform` (index)    | SA    | platform | —                           |
| `/platform/plans`      | SA    | platform | —                           |
| `/platform/financials` | SA    | platform | —                           |
| `/platform/orders`     | SA    | platform | —                           |
| `/platform/users`      | SA    | platform | —                           |
| `/platform/tenants`    | SA    | platform | —                           |
| `/platform/leads`      | SA    | platform | —                           |
| `/platform/pipeline`   | SA    | platform | —                           |
| `/platform/health`     | SA    | platform | —                           |
| `/platform/logs`       | SA    | platform | —                           |
| `/platform/audit-logs` | SA    | platform | —                           |
| `/admins/$adminId`     | SA    | platform | —                           |
| `/revenue`             | SA    | platform | — (deprecated → financials) |

## API / Server routes

See `src/routes/api/`. Public webhooks live under `/api/public/*` and MUST verify signatures.
