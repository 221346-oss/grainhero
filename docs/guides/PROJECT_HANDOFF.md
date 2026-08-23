# GrainHero 2 Project Handoff

## 1. Project Overview

- **Purpose of the application**: GrainHero is an AI-powered Grain Storage Management SaaS platform. It monitors, predicts, and optimizes grain storage using sensor readings, actuators, and ML risk scoring.
- **Tech stack**: React 19, TypeScript, TanStack Start (SSR), TanStack Router, TanStack Query, Tailwind CSS v4, Radix UI (shadcn-ui), Supabase (Auth + DB), Firebase (Actuator Bridge).
- **Architecture**: A full-stack SSR application. The frontend communicates with the backend via TanStack Start Server Functions (`createServerFn`).
- **Important libraries**: `@tanstack/react-start`, `@supabase/supabase-js`, `zod` for validation, `lucide-react` for icons, `recharts` for charts, `framer-motion`.

## 2. Folder Structure

- `src/components/ui/` - Shadcn UI components (buttons, dialogs, sidebars, etc.).
- `src/components/app/` - Core application components (Sidebar, SessionGuard, ThemeInit).
- `src/lib/` - Server functions (`*.functions.ts`), utilities, and external integrations (Stripe, Firebase).
- `src/routes/` - TanStack Router file-based routing.
- `src/routes/_authenticated/` - All protected pages that require a user session.
- `supabase/` - Supabase configurations and migrations (if applicable).

## 3. Routing

- Uses **TanStack Router** file-based routing.
- **Protected routes**: Any route inside the `_authenticated` directory is protected. The `beforeLoad` function in `_authenticated/route.tsx` enforces authentication via `supabase.auth.getUser()`.
- **Role-based routing**: Handled primarily on the UI layer. The `AppSidebar` filters navigation items based on the user's role using the `getMyRole` query. Server functions enforce authorization at the data level.

## 4. Authentication

- **Supabase auth flow**: The app uses Supabase for authentication.
- **Middleware**: A `requireSupabaseAuth` middleware is injected into every protected `createServerFn` to ensure the user is authenticated and to pass `context.supabase` and `context.userId`.
- **Session handling**: Checked on the client side via `SessionGuard` and route `beforeLoad`.
- **Role resolution**: Roles are resolved by fetching from the `user_roles` and `profiles` tables in `src/lib/roles.functions.ts`.

## 5. Roles

- **Roles**: `super_admin`, `admin`, `manager`, `technician`, `pending`.
- **Hierarchy**: `super_admin` > `admin` > `manager` > `technician` > `pending`.
- **Permissions**: `super_admin` has global platform access. `admin` manages the tenant/warehouse. `manager` oversees daily operations. `technician` manages hardware (sensors/actuators).
- **Pending role behavior**: The `pending` role is the fallback when a user has no assigned role. They are largely restricted from performing mutations or seeing sensitive data until an admin upgrades them.

## 6. Current UI

- **Design system**: Custom theme over shadcn-ui with Tailwind CSS v4.
- **Layout**: Main dashboard layout consists of a collapsible left sidebar (`AppSidebar`) and a top header containing global search, notifications, and profile.
- **Sidebar**: Features pinned apps, a "More" popover for categorized operations (Operations, Insights, Business), and a bottom admin strip.
- **Navigation**: Instant navigation with a `defaultPendingComponent` skeleton.
- **Theme**: Light/Dark mode via CSS variables (e.g., `--fusion-grape`, `--fusion-mint`).
- **Responsive behavior**: Flexbox-based layouts. The sidebar collapses into a drawer/hamburger menu on mobile screens.

## 7. Reusable Components

- Found in `src/components/ui/`.
- **Key components**: `Sidebar`, `Button`, `Card`, `Badge`, `Table`, `Dialog`, `Popover`, `Select`.
- These are primitive building blocks and must be used to build any new forms or data views.

## 8. Server Functions

- Structured using `@tanstack/react-start`'s `createServerFn`.
- **Pattern**: Every protected function uses `.middleware([requireSupabaseAuth])`.
- **Input Validation**: Uses `.inputValidator` with Zod schemas and a `parseOrThrow` helper for clean client errors.
- **Logic**: Performs the DB mutation/query via `context.supabase` and returns the data directly.

## 9. Database

- **Main tables**: `profiles`, `user_roles`, `warehouses`, `silos`, `grain_batches`, `buyers`, `sensor_devices`, `sensor_readings`, `actuators`, `grain_alerts`.
- **Relationships**: `warehouses` have many `silos`. `silos` hold `grain_batches`. `sensor_devices` and `actuators` are linked to specific `silos` and `warehouses`.
- **Important RLS assumptions**: Supabase Row Level Security is active. Queries must use the authenticated `context.supabase` client provided by the middleware so RLS rules apply correctly.
- **Multi-tenant structure**: Scoped via `admin_id` or `warehouse_id`.

## 10. Current Features

- **Operations**: Warehouses, Silos, Grain Batches, Actuator Control, Environmental Monitoring.
- **Insights**: Data Visualization, AI Predictions, ML Models, Traceability, Reports.
- **Business**: Buyers, Revenue, Insurance, Subscriptions.

## 11. Features That Are Already Working

- Authentication and Role Management.
- CRUD operations for Warehouses, Silos, Actuators, and Sensors.
- Grain Batch intake, dispatching, and spoilage logging.
- Sidebar navigation and responsive layout wrapper.
- Actuator real-time bridging (Firebase integration).

## 12. Features That Are Incomplete

- Needs comprehensive UI polish and layout standardization across complex data grids and forms.

## 13. Known Bugs

- None documented that block current development.

## 14. Things That Must NEVER Be Changed

- Do **NOT** bypass the `createServerFn` architecture for backend calls.
- Do **NOT** remove the `requireSupabaseAuth` middleware from secure server functions.
- Do **NOT** alter the Supabase Auth session flow or TanStack Router `beforeLoad` auth checks.
- Do **NOT** change the `AppRole` hierarchy or the `user_roles` fetching logic.
- Do **NOT** mutate database relationships (e.g., breaking the Silo -> Grain Batch link).

## 15. Current Task

- The primary task is UI enhancement across the application while perfectly preserving all existing backend contracts, data structures, and functionality.

## 16. UI Improvement Rules

- **Design Language**: Premium, data-dense, modern SaaS.
- **Consistency**: Exclusively use `src/components/ui/` primitives (shadcn). Do not introduce custom raw HTML structures when a shadcn component exists.
- **Spacing & Typography**: Maintain tight but breathable data tables. Use clear visual hierarchy (muted colors for secondary text, bold for primary metrics).
- **Colors**: Leverage existing theme variables (`--fusion-grape`, `--fusion-mint`, `--fusion-ink`).
- **Responsiveness**: Ensure forms and tables degrade gracefully on mobile (stacking columns, using cards instead of wide tables).

## 17. Existing Design Problems

- Complex forms lack consistent spacing and validation feedback presentation.
- Data tables are unoptimized for mobile viewports (horizontal scrolling vs card-stacking).
- Dashboard widgets and charts can feel disjointed or lack unified card padding.

## 18. Recommended Order of UI Improvements

1. Standardize Card paddings, headers, and layouts on the main Dashboard.
2. Refactor core Data Tables (Silos, Batches, Sensors) to be responsive and visually unified.
3. Polish Create/Edit Forms (spacing, input alignment, error states).
4. Enhance Analytics and Data Visualization chart containers.

## 19. Coding Rules

- Strictly use **TypeScript** and resolve all type errors.
- All new server functions must use **Zod** for input validation.
- Do not use client-side Supabase calls for data mutations; always route through a server function.
- Keep components small; extract complex table rows or form sections into their own files.

## 20. Important Notes

- Server functions are co-located in `src/lib/*.functions.ts`. Look there first to understand how data is modified.
- Always check the allowed roles for a feature before exposing a button or route link.
- Review `AppSidebar.tsx` to understand how the application structures its navigation.
