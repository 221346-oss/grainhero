# GrainHero Migration Report — Fresh Analysis
**Date:** July 9, 2026 | **Analyst:** Complete fresh codebase read after latest changes

---

## 1. Tech Stack Comparison

| Concern | GrainHero 1 | GrainHero 2 |
|---|---|---|
| **Framework** | Next.js 15 (App Router) + Express.js (separate backend) | TanStack Start (React 19, Vite 8, Nitro SSR — unified fullstack) |
| **Routing** | Next.js file-system routing with `[locale]` prefix | TanStack Router v1 — type-safe file-based routes, `/_authenticated/*` guard |
| **State Management** | `useState`/`useEffect` + manual `api.get()` REST calls | TanStack Query v5 — all data via `useServerFn` + `useQuery`/`useMutation` |
| **Authentication** | Custom JWT (`jsonwebtoken` + `bcryptjs`), stored in `localStorage` | Supabase Auth — session cookies, `requireSupabaseAuth` middleware |
| **Database** | MongoDB + Mongoose ODM (29 models) | Supabase (PostgreSQL) with RLS, 12 migrations, TypeScript `types.ts` |
| **Backend Communication** | REST API at `localhost:5000/api/*` via `axios` | TanStack Server Functions co-located in `src/lib/*.functions.ts` |
| **Real-time / IoT** | Firebase RTDB + Socket.IO + MQTT broker | Firebase RTDB only (`useFirebaseSensor`, `useFirebaseAllSensors` hooks) |
| **Actuator Commands** | MQTT publish + Firebase mirror | Firebase RTDB write via `actuator-bridge.server.ts` (no MQTT) |
| **Push Notifications** | Firebase FCM + Web Push (VAPID), `UserPushSubscription` model | ❌ Not implemented |
| **UI Libraries** | Radix UI + Tailwind CSS v4 + shadcn/ui + Framer Motion + Recharts | Identical — Radix UI + Tailwind CSS v4 + shadcn/ui + Framer Motion + Recharts |
| **Payments** | Stripe (checkout, webhooks, portal) | Stripe (checkout sessions, billing portal, plan change, cancel/resume) |
| **AI / ML** | Python process (XGBoost ensemble via `child_process.spawn`) | LLM-based insight via `ai-insights.functions.ts`; no Python subprocess |
| **PDF Export** | `pdfkit` + `puppeteer` (server-side PDF) | CSV download only — no PDF |
| **i18n** | `next-intl` (English + Arabic) | ❌ Not present |
| **Project Structure** | Two separate repos: `farmHomeFrontend-main` + `farmHomeBackend-main` | Single monorepo: frontend + server functions in one Vite/Nitro project |
| **Runtime / Build** | Node.js + nodemon (backend), Next.js (frontend) | Bun + Vite 8 |

---

## 2. Feature Comparison

| Feature | GH1 | GH2 | Status |
|---|---|---|---|
| **Dashboard — role-based (5 roles)** | ✅ | ✅ | ✅ Complete |
| **Authentication — login/signup/forgot/reset** | ✅ | ✅ | ✅ Complete |
| **Authentication — 2FA (email TOTP)** | ✅ | ❌ | ❌ Missing |
| **Authentication — invitation-based signup** | ✅ | ❌ | ❌ Missing |
| **User Management — profile/settings** | ✅ | ✅ | ✅ Complete |
| **User Management — avatar upload** | ✅ Cloudinary | 🟡 Base64 in DB | 🟡 Partial |
| **Roles & Permissions — RBAC** | ✅ | ✅ RLS + `user_roles` | ✅ Complete |
| **Roles & Permissions — plan limits enforced** | ✅ | 🟡 Team invite limit only | 🟡 Partial |
| **Subscription Plans — browse** | ✅ | ✅ | ✅ Complete |
| **Subscription — view/cancel/upgrade/resume** | ✅ | ✅ | ✅ Complete |
| **Subscription — Stripe billing portal** | ✅ | ✅ | ✅ Complete |
| **Billing history / invoices** | ✅ | ✅ | ✅ Complete |
| **Checkout / payment** | ✅ | ✅ | ✅ Complete |
| **Warehouses — full CRUD** | ✅ | ✅ | ✅ Complete |
| **Warehouses — manager/tech assignment** | ✅ | ❌ | ❌ Missing |
| **Warehouses — financials** | ✅ | ❌ | ❌ Missing |
| **Silos — full CRUD** | ✅ | ✅ | ✅ Complete |
| **Silos — live conditions from sensors** | ✅ real-time | 🟡 Shows stale DB snapshot | 🟡 Partial |
| **Silos — plan/warehouse limits** | ✅ max 3/warehouse | ❌ | ❌ Missing |
| **Grain Batches — full CRUD + dispatch** | ✅ | ✅ | ✅ Complete |
| **Grain Batches — QR code (scannable image)** | ✅ PNG via `qrcode` | 🟡 Stores JSON string only | 🟡 Partial |
| **Grain Batches — spoilage event log** | ✅ | ✅ | ✅ Complete |
| **Grain Batches — dispatch transaction audit** | ✅ `DispatchTransaction` model | ❌ | ❌ Missing |
| **Grain Batches — available-silos filter by grain type** | ✅ | ❌ Shows all silos | ❌ Missing |
| **Buyers — full CRUD** | ✅ | ✅ | ✅ Complete |
| **Sensors — full CRUD + live readings** | ✅ | ✅ | ✅ Complete |
| **Sensors — calibration trigger** | ✅ | ❌ | ❌ Missing |
| **Sensors — threshold alerts** | ✅ auto-alert on readings | ❌ | ❌ Missing |
| **Actuators — full CRUD + control** | ✅ | ✅ | ✅ Complete |
| **Actuators — Firebase bridge (commands)** | ✅ MQTT + Firebase | 🟡 Firebase only | 🟡 Partial |
| **Actuators — AI trigger endpoint** | ✅ `/ai-trigger` | ❌ | ❌ Missing |
| **Actuators — schedule (cron)** | ✅ | ❌ | ❌ Missing |
| **Actuators — bulk control** | ✅ | 🟡 Emergency stop only | 🟡 Partial |
| **Grain Alerts — full CRUD + acknowledge/resolve/escalate** | ✅ | ✅ | ✅ Complete |
| **Grain Alerts — realtime invalidation** | ✅ Socket.IO | ✅ Supabase postgres_changes | ✅ Complete |
| **Notifications — in-app CRUD** | ✅ | ✅ | ✅ Complete |
| **Notifications — push (FCM + Web Push)** | ✅ Full implementation | ❌ | ❌ Missing |
| **Notifications — preferences (quiet hours etc.)** | ✅ | 🟡 Basic toggles only | 🟡 Partial |
| **Reports — CSV export** | ✅ | ✅ | ✅ Complete |
| **Reports — PDF export** | ✅ | ❌ | ❌ Missing |
| **Analytics — business KPIs + charts** | ✅ | ✅ | ✅ Complete |
| **AI Predictions — per-batch risk scoring** | ✅ | ✅ | ✅ Complete |
| **AI Predictions — LLM insight per batch** | ❌ | ✅ GH2-exclusive | ✅ GH2 Only |
| **AI — Python ML model (XGBoost)** | ✅ subprocess | ❌ | ❌ Missing |
| **AI — model retrain trigger** | ✅ | ❌ | ❌ Missing |
| **AI — training history / model performance** | ✅ | 🟡 Derived from DB readings | 🟡 Partial |
| **AI — data-visualization (IoT real-time charts)** | ✅ Full page | ❌ | ❌ Missing |
| **ML Models page** | ✅ | ✅ | ✅ Complete |
| **Environmental — weather + AQI + forecast** | ✅ | ✅ OpenWeather | ✅ Complete |
| **Environmental — live silo microclimate** | ✅ Firebase | ✅ Firebase | ✅ Complete |
| **Team Management — invite/edit/remove** | ✅ | ✅ | ✅ Complete |
| **Team Management — plan staff limit** | ✅ | ✅ | ✅ Complete |
| **Settings — profile, location, notifications, theme** | ✅ | ✅ | ✅ Complete |
| **Activity Logs — paginated audit trail** | ✅ | ✅ Full with filters + CSV export | ✅ Complete |
| **Incidents — critical/high alert triage** | ✅ | ✅ MTTA/MTTR stats | ✅ Complete |
| **Maintenance — device/actuator schedule** | ✅ | ✅ Overdue/due-soon tracking | ✅ Complete |
| **Insurance — policies + claims CRUD** | ✅ | ✅ | ✅ Complete |
| **Insurance — claim lifecycle (review/approve/reject)** | ✅ Full workflow | 🟡 Basic status update only | 🟡 Partial |
| **Revenue — buyer invoices + payments** | ✅ | ✅ | ✅ Complete |
| **Security Center — user access + events** | ✅ | ✅ | ✅ Complete |
| **Server / Device Monitoring** | ✅ | ✅ Heartbeat, battery, signal | ✅ Complete |
| **Traceability — supply chain timeline** | ✅ | ✅ | ✅ Complete |
| **Traceability — QR scan** | ✅ | 🟡 Shows raw string, not scannable | 🟡 Partial |
| **Platform Admin — overview, tenants, users** | ✅ | ✅ | ✅ Complete |
| **Platform Admin — SaaS revenue analytics** | ✅ | ✅ MRR/ARR charts, expiry reminders | ✅ Complete |
| **Platform Admin — system logs** | ✅ | ✅ | ✅ Complete |
| **Platform Admin — install orders** | ✅ | ✅ | ✅ Complete |
| **Hardware install orders (admin view)** | ✅ | ✅ | ✅ Complete |
| **Onboarding tour** | ❌ | ✅ GH2-exclusive | ✅ GH2 Only |
| **Multi-theme system** | ❌ | ✅ GH2-exclusive | ✅ GH2 Only |
| **i18n (English + Arabic)** | ✅ | ❌ | ❌ Missing |
| **Chatbot / AI assistant** | ✅ | ❌ | ❌ Missing |
| **Silo SVG visualization** | ✅ | ❌ | ❌ Missing |
| **Dual-probe monitoring** | ✅ | ❌ | ❌ Missing |
| **Offline data sync** | ✅ | ❌ | ❌ Missing |
| **Global analytics (super-admin cross-tenant)** | ✅ | ❌ (covered by platform/revenue) | ❌ Missing |


---

## 3. Screen Comparison

| Screen | GH1 | GH2 | UI Complete | Backend Integrated | IoT Integrated | Production Ready |
|---|---|---|---|---|---|---|
| Landing / Home | ✅ | ✅ | ✅ | N/A | N/A | ✅ |
| Auth — Login | ✅ | ✅ | ✅ | ✅ Supabase | N/A | ✅ |
| Auth — Signup | ✅ | ✅ | ✅ | ✅ Supabase | N/A | ✅ |
| Auth — Forgot Password | ✅ | ✅ | ✅ | ✅ Supabase | N/A | ✅ |
| Auth — Reset Password | ✅ | ✅ | ✅ | ✅ Supabase | N/A | ✅ |
| Checkout | ✅ | ✅ | ✅ | ✅ Stripe | N/A | ✅ |
| Checkout Success | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Plans / Pricing | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Dashboard — Super Admin | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Dashboard — Admin | ✅ | ✅ | ✅ | ✅ | 🟡 No heartbeat widget | 🟡 |
| Dashboard — Manager | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Dashboard — Technician | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Dashboard — Pending | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Warehouses | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Silos | ✅ | ✅ | ✅ | ✅ | 🟡 "no live feed" badge — conditions stale | 🟡 |
| Sensors | ✅ | ✅ | ✅ | ✅ Realtime | ✅ Firebase RTDB | ✅ |
| Actuators | ✅ | ✅ | ✅ | ✅ + Firebase bridge | ✅ | ✅ |
| Grain Batches | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Buyers | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Grain Alerts | ✅ | ✅ | ✅ | ✅ Realtime | N/A | ✅ |
| AI Predictions | ✅ | ✅ | ✅ | ✅ | ✅ Uses sensor readings | ✅ |
| ML Models | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Analytics | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Environmental | ✅ | ✅ | ✅ | ✅ OpenWeather | ✅ Firebase microclimate | ✅ |
| Reports | ✅ | ✅ | 🟡 CSV only | ✅ | N/A | 🟡 No PDF |
| Notifications | ✅ | ✅ | ✅ | ✅ Realtime | N/A | ✅ |
| Activity Logs | ✅ | ✅ | ✅ Full timeline + filters | ✅ | N/A | ✅ |
| Incidents | ✅ | ✅ | ✅ MTTA/MTTR | ✅ | N/A | ✅ |
| Maintenance | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Insurance | ✅ | ✅ | 🟡 Basic CRUD only | ✅ | N/A | 🟡 |
| Revenue | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Traceability | ✅ | ✅ | ✅ | ✅ | N/A | 🟡 QR not scannable |
| Security Center | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Server / Device Monitoring | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Team Management | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Settings | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Subscription | ✅ | ✅ | ✅ | ✅ Stripe + Supabase | N/A | ✅ |
| Platform — Overview | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Platform — Tenants | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Platform — Users | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Platform — Revenue / SaaS | ✅ | ✅ | ✅ Charts + expiry reminders | ✅ | N/A | ✅ |
| Platform — Logs | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Platform — Install Orders | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| My Install Orders (admin) | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| Data Visualization (IoT charts) | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI Analytics (training/retrain) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Global Analytics (cross-tenant) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Chatbot / AI assistant | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notification Settings (dedicated page) | ✅ | 🟡 Tab in Settings | ✅ | ✅ | N/A | ✅ |
| Profile (dedicated page) | ✅ | 🟡 Tab in Settings | ✅ | ✅ | N/A | ✅ |
| Billing (dedicated page) | ✅ | 🟡 Merged into Subscription | ✅ | ✅ | N/A | ✅ |
| Mobile / PWA dedicated view | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System Health | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System Logs (super-admin) | ✅ | ✅ platform/logs | ✅ | ✅ | N/A | ✅ |
| Not Allowed | ✅ | ✅ | ✅ | N/A | N/A | ✅ |


---

## 4. Component Comparison

### Shared / Already Equivalent in Both Projects
Both projects use an identical shadcn/ui component set built on Radix UI + Tailwind CSS v4. No migration needed:
- All `src/components/ui/*` primitives (Button, Card, Dialog, Badge, Input, Select, Tabs, Slider, Switch, Progress, etc.)
- `recharts` for all charts
- `sonner` for toast notifications
- `framer-motion` for animations
- `lucide-react` for icons
- `zod` for validation

### GH2-Exclusive Components (Do Not Exist in GH1)
| Component | Path | Notes |
|---|---|---|
| `AppSidebar` | `src/components/app/AppSidebar.tsx` | Slack-style collapsible sidebar with "More" popover — superior to GH1 |
| `OnboardingTour` | `src/components/app/OnboardingTour.tsx` | Step-by-step guided walkthrough |
| `SessionGuard` | `src/components/app/SessionGuard.tsx` | Supabase session expiry detection |
| `ThemeInit` | `src/components/app/ThemeInit.tsx` | Multi-theme CSS variable application |
| `DashboardBlocks` | `src/components/dashboards/DashboardBlocks.tsx` | Role-specific stat card blocks |
| `DataListPage` / `StatusBadge` | `src/components/app/DataListPage.tsx` | Reusable list page skeleton + status badge |
| `skeletons` | `src/components/app/skeletons.tsx` | Loading skeletons for all page types |

### Components in GH1 That Need Migration to GH2

| GH1 Component | Action | Reason |
|---|---|---|
| `silo-visualization.tsx` | **Rebuild** | Tightly coupled to GH1 state; integrate with `useFirebaseSensor` |
| `chatbot-popup.tsx` + `chatbot-provider.tsx` | **Rebuild** | Calls GH1 Express API; rebuild using GH2 server functions + LLM |
| `push-notification-permission.tsx` | **Rebuild** | Must use Supabase user model + VAPID from GH2 env |
| `QRCodeDisplay.tsx` | **Migrate** | Self-contained; install `qrcode` package |
| `WelcomeNotification.tsx` | **Migrate** | Wire to GH2 `notifications` table insert |
| `PasswordStrengthIndicator.tsx` | **Migrate** | Fully self-contained, zero external deps |
| `LocationAutocomplete.tsx` | **Migrate** | Replace internal API call with GH2 server function |
| `actuator-quick-actions.tsx` | **Rebuild** | Already covered more completely in GH2 actuators page |
| `language-selector.tsx` | **Hold** | Only needed when i18n is added |
| `AuthGuard.tsx` | **Skip** | Superseded by GH2's `SessionGuard` + TanStack `beforeLoad` |
| `CartProvider.tsx` | **Skip** | Not needed — Stripe checkout handles cart |
| `AnimatedBackground` | **Optional** | GH2 uses cleaner gradient backgrounds |
| `DataTable`, `StatCard` (dashboard/) | **Skip** | GH2 has inline equivalents already |

### Components to NOT Copy (Architecture Mismatch)
Any component in GH1 that:
1. Calls `api.get()` / `api.post()` — GH1's REST wrapper — must be rewritten using `useServerFn`
2. Reads `localStorage.getItem("token")` — JWT pattern, incompatible with Supabase sessions
3. Uses `next/navigation` (`useRouter`, `Link`) — Next.js only, replace with TanStack Router equivalents

---

## 5. Backend Integration Status

| Feature | GH2 Status | Detail |
|---|---|---|
| Auth (login, signup, reset) | ✅ Real — Supabase Auth | Fully integrated |
| User profile CRUD | ✅ Real — `profiles` table | `getMySettings` / `updateMySettings` |
| Warehouses CRUD | ✅ Real | `listWarehouses`, `upsertWarehouse`, `deleteWarehouse` |
| Silos CRUD | ✅ Real | Full CRUD + occupancy update on batch create |
| Sensor devices CRUD | ✅ Real | Full CRUD + latest readings query |
| Sensor readings (realtime) | ✅ Real | `listLatestSensorReadings` + postgres_changes |
| Grain Batches CRUD + dispatch | ✅ Real | Full CRUD, dispatch (partial), spoilage log |
| Grain Batches — QR image | 🟡 Mock | Stores JSON string; no actual QR image generated |
| Actuators CRUD + control | ✅ Real | CRUD + `controlActuator` + Firebase bridge |
| Grain Alerts CRUD + lifecycle | ✅ Real | Create/acknowledge/resolve/escalate/reopen |
| Buyers CRUD | ✅ Real | `listBuyers`, `upsertBuyer`, `deleteBuyer` |
| AI Predictions | ✅ Real | Risk scored from sensor_readings via `getBatchPredictions` |
| AI LLM Insight | ✅ Real | `getSpoilageInsight` — per-batch LLM call |
| ML Models metadata | ✅ Real | Derived from `sensor_readings` in `getMLModels` |
| ML model retrain | ❌ Missing | GH1 spawned Python; no equivalent |
| Analytics overview | ✅ Real | Aggregates batches, alerts, revenue, env data |
| Environmental / Weather | ✅ Real | OpenWeather API (current + AQI + forecast) |
| Reports data | ✅ Real | Batches, alerts, invoices, silos |
| PDF reports | ❌ Missing | GH1 used pdfkit/puppeteer |
| Notifications CRUD | ✅ Real | Full CRUD, mark read, realtime invalidation |
| Push Notifications | ❌ Missing | Zero implementation in GH2 |
| Activity Logs | ✅ Real | Paginated, filtered, CSV export, category counts |
| Team Management (invite/edit/remove) | ✅ Real | `supabaseAdmin.auth.admin.inviteUserByEmail` |
| Subscription view/cancel/upgrade | ✅ Real | Stripe + Supabase `subscriptions` table |
| Stripe billing portal | ✅ Real | `createStripeBillingPortalSession` |
| Checkout | ✅ Real | Stripe checkout sessions |
| Revenue (buyer invoices) | ✅ Real | `getRevenueOverview`, `markInvoicePaid` |
| Insurance (policies + claims) | ✅ Real | `listPolicies`, `upsertPolicy`, `listClaims`, `upsertClaim` |
| Insurance claim lifecycle | 🟡 Basic | Status updates only; no review/investigate workflow |
| Incidents (MTTA/MTTR) | ✅ Real | Reads `grain_alerts` (priority: critical/high) |
| Maintenance schedule | ✅ Real | Reads `sensor_devices` + `actuators` next_maintenance_date |
| Security Center | ✅ Real | `profiles` + `user_roles` + `activity_logs` |
| Server/Device Monitoring | ✅ Real | Heartbeat-based online/offline detection |
| Traceability | ✅ Real | Reads `grain_batches` with full supply chain data |
| Platform overview | ✅ Real | `getPlatformMetrics` — system-wide counts |
| Platform tenants | ✅ Real | `listAllTenants` with team + batch counts |
| Platform SaaS revenue | ✅ Real | MRR/ARR, charts, expiry reminders trigger |
| Platform logs | ✅ Real | `getPlatformLogs` with severity filter |
| Install orders | ✅ Real | `listMyHardwareOrders`, platform orders management |
| Expiry email reminders | ✅ Real | `expiry-reminders.server.ts` cron + manual trigger |
| Firebase sync (manual) | ✅ Real | `syncFirebaseSnapshot` server function |
| MQTT commands | ❌ Missing | GH1 published MQTT; GH2 only uses Firebase |
| Sensor threshold auto-alerts | ❌ Missing | GH1 auto-created `GrainAlert` on threshold breach |
| Dispatch notification | ❌ Missing | GH1 called `NotificationService.notifyDispatch` |
| Silo conditions auto-update | ❌ Missing | GH1 updated `silo.current_conditions` on sensor reading |


---

## 6. IoT Integration Status

| IoT Feature | Status | Detail |
|---|---|---|
| Firebase RTDB client (browser) | ✅ Complete | `src/integrations/firebase/client.ts` — env-var driven |
| Firebase Admin SDK (server) | ✅ Complete | `firebase-admin.server.ts` for actuator bridge |
| Live sensor — single device | ✅ Complete | `useFirebaseSensor(deviceId)` hook |
| Live sensor — all devices | ✅ Complete | `useFirebaseAllSensors()` hook |
| Live readings on Sensors page | ✅ Complete | 30s refetch + postgres_changes + pulsing "Live" badge |
| Live microclimate on Environmental page | ✅ Complete | Firebase feed shown alongside weather data |
| Actuator control → Firebase RTDB write | ✅ Complete | `actuator-bridge.server.ts` writes to `/devices/{id}/commands` |
| Actuator control → MQTT publish | ❌ Missing | GH1 had MQTT broker; GH2 Firebase-only |
| Firebase manual snapshot → `sensor_readings` | ✅ Complete | `syncFirebaseSnapshot` server function |
| Silo live conditions update from readings | ❌ Missing | GH1 called `updateSiloConditions()` on every sensor reading; GH2 has no trigger |
| Sensor threshold auto-alert generation | ❌ Missing | GH1 auto-created `GrainAlert` when threshold breached |
| IoT data history charts (temp/hum/VOC/risk) | ❌ Missing | GH1 `/data-visualization` page — no equivalent in GH2 |
| AI → MQTT LED/fan control | ❌ Missing | GH1 published MQTT topic with LED + fan states on ML prediction |
| Dual-probe monitoring | ❌ Missing | GH1 had dedicated `dualProbeMonitoring.js` route |
| IoT device simulator (for testing) | ❌ Missing | GH1 had `scripts/iotDeviceSimulator.js` |
| Offline data sync | ❌ Missing | GH1 had `offlineDataService.js` for poor connectivity |
| Push notifications on IoT alert | ❌ Missing | GH1 sent FCM push on critical alerts |

---

## 7. Missing Functionality

### 🔴 High Priority

| Missing | GH1 Location | Impact |
|---|---|---|
| **Push Notifications (FCM + Web Push)** | `services/pushNotificationAdapter.js`, `services/notificationService.js`, `models/UserPushSubscription.js`, `routes/notifications.js` (`/subscribe`, `/unsubscribe`, `/test-push`) | Users receive no alerts on mobile or browser. Critical for grain spoilage warnings. |
| **Silo live-conditions auto-update** | `routes/sensors.js` → `updateSiloConditions()` | Silo cards permanently show stale conditions. Operators cannot see real-time temperature/humidity on the silo view. |
| **Sensor threshold → auto GrainAlert** | `routes/sensors.js` → `checkThresholds()` + `createAlert()` | Automated alerts are never triggered. All alerts must be created manually. |
| **QR Code image generation** | `routes/grainBatches.js` → `QRCode.toDataURL()` | QR codes cannot be scanned. Traceability labels are non-functional. |
| **IoT Data Visualization page** | `app/.../data-visualization/page.tsx` | No time-series charts for sensor history. Key operational monitoring screen absent. |
| **Dispatch notification** | `services/notificationService.js` → `notifyDispatch()` | Admin/manager not notified when grain is dispatched. |

### 🟡 Medium Priority

| Missing | GH1 Location | Impact |
|---|---|---|
| **ML model retrain trigger** | `routes/aiSpoilage.js` POST `/retrain`, Python `enhanced_train.py` | Admins cannot improve the model from the UI. |
| **AI Analytics page** (training history, model info, data summary) | `app/.../ai-analytics/page.tsx`, `routes/aiSpoilage.js` | Deeper ML transparency missing. |
| **Actuator scheduler (cron)** | `routes/actuators.js` POST `/:id/schedule` | Cannot automate fan cycles on a time schedule. |
| **Actuator AI-trigger endpoint** | `routes/actuators.js` POST `/:id/ai-trigger` | ML decisions cannot directly actuate hardware. |
| **Sensor calibration trigger** | `routes/sensors.js` POST `/:id/calibrate` | No way to record calibration events from the UI. |
| **Insurance claim lifecycle** (review, investigate, assess, payment) | `routes/insurance.js` POST `/:id/review`, PUT `/:id/status`, `/investigation`, `/assessment`, `/payment` | Claims management is only basic CRUD. |
| **Warehouse manager/technician assignment** | `routes/warehouses.js` POST `/:id/technicians` | Cannot assign staff to specific warehouses from the UI. |
| **Global Analytics** | `app/.../global-analytics/page.tsx` | Super admin lacks cross-tenant user/revenue analytics dashboard. |
| **Dispatch transaction audit trail** | `models/DispatchTransaction.js` | No immutable record of each dispatch event. |
| **Silo plan limit** (max 3/warehouse) | `routes/silos.js` | Nothing prevents over-provisioning silos. |
| **Silo delete guard** (blocked when grain present) | `routes/silos.js` | Can delete a silo with active grain batches. |
| **Available-silos filter by grain type** | `routes/grainBatches.js` GET `/available-silos/:grain_type` | Mixed grain types can be placed in the same silo accidentally. |

### 🟢 Low Priority

| Missing | GH1 Location | Impact |
|---|---|---|
| **i18n (English + Arabic)** | `i18n/`, `messages/`, `next-intl` | Multi-language support |
| **Chatbot / AI assistant popup** | `components/chatbot-popup.tsx`, `chatbot-provider.tsx` | Convenience feature |
| **Silo SVG/3D visualization** | `components/silo-visualization.tsx` | Visual capacity indicator |
| **Password strength indicator** | `components/PasswordStrengthIndicator.tsx` | UX on signup |
| **2FA (email TOTP)** | `routes/auth.js` — toggle, verify routes | Security hardening |
| **Invitation-based signup URL** | `routes/auth.js` — `invitation_token` flow | Users must be invited via link |
| **Offline sensor data sync** | `services/offlineDataService.js` | Edge case for poor connectivity |
| **Dual-probe monitoring** | `routes/dualProbeMonitoring.js` | Multi-sensor per silo use case |
| **IoT device simulator** | `scripts/iotDeviceSimulator.js` | Dev/test tooling |
| **PDF reports** | `services/pdfService.js`, `pdfkit` | Stakeholder-facing reports |
| **Mobile / PWA dedicated view** | `app/.../mobile/page.tsx` | Responsive design covers most cases |

---

## 8. Migration Roadmap

### Phase 1 — Data Integrity (Do First — Unblocks Everything Else)

**1. Silo live-conditions update from sensor readings**
- Add a Supabase Database Trigger or extend `upsertSensorDevice` reading ingestion path to `UPDATE silos SET current_conditions = ...` on new `sensor_readings` insert.
- **Dependencies:** `sensor_readings` table, `silos.current_conditions` JSONB column (both exist)
- **Complexity:** Low (one DB function + trigger)
- **Files:** New Supabase migration SQL file
- **Risk:** Low

**2. QR Code image generation**
- Install `qrcode` package. Add a server function `generateQRImage(payload)` that returns a base64 PNG. Call it in `upsertGrainBatch` and store in `grain_batches.qr_code_image`. Display in the QR dialog.
- **Dependencies:** `grain_batches` table (add `qr_code_image` text column)
- **Complexity:** Low
- **Files:** New migration, extend `operations.functions.ts`, update `grain-batches.tsx` QR dialog
- **Risk:** Low

**3. Sensor threshold → auto GrainAlert**
- When a sensor reading is ingested (either via Firebase sync or direct insert), compare values against `sensor_devices.thresholds` JSONB. If breached, insert a row into `grain_alerts`.
- **Dependencies:** `sensor_devices.thresholds`, `grain_alerts` table (both exist)
- **Complexity:** Medium (threshold evaluation logic)
- **Files:** Extend `firebase-sync.functions.ts` or add a Supabase trigger
- **Risk:** Medium (alert spam if thresholds misconfigured)

---

### Phase 2 — User Impact (Sprint 2)

**4. Push Notifications (FCM + Web Push)**
- Register FCM token on login, store in a new `user_push_tokens` table. Create a server function `sendPushNotification(userId, title, body)`. Wire to: grain alert creation, dispatch, plan expiry.
- **Dependencies:** Firebase project config (`VITE_FIREBASE_*`), VAPID key, new `user_push_tokens` Supabase table, service worker `public/sw.js`
- **Complexity:** High
- **Files:** New migration, new `push-notifications.functions.ts`, `public/sw.js`, update `notifications` triggers
- **Risk:** High — requires browser permissions, service worker lifecycle management

**5. Dispatch notification**
- After `dispatchGrainBatch` completes, insert a notification row into the `notifications` table for the admin/manager.
- **Dependencies:** `notifications` table (exists), dispatch server function
- **Complexity:** Low
- **Files:** `operations.functions.ts` → `dispatchGrainBatch`
- **Risk:** Low

**6. Silo delete guard + plan limits**
- In `deleteSilo`: query `grain_batches` for active batches in the silo; throw if found.
- In `upsertSilo` (create path): count silos per warehouse; throw if ≥ 3.
- **Dependencies:** None new
- **Complexity:** Low
- **Files:** `operations.functions.ts`
- **Risk:** Low

---

### Phase 3 — AI & Analytics (Sprint 3)

**7. IoT Data Visualization page**
- New route `/data-visualization`. Use `useFirebaseAllSensors()` for live feed + `listDeviceReadings` for DB history. Render time-series charts (AreaChart, LineChart, BarChart) for temp/humidity/VOC/risk.
- **Dependencies:** `listDeviceReadings` server function (exists), Firebase hooks (exist)
- **Complexity:** Medium (chart wiring)
- **Files:** New `src/routes/_authenticated/data-visualization.tsx`
- **Risk:** Low

**8. AI Analytics page** (model info, training history, retrain)
- New route `/ai-analytics`. Surface model metadata from `getMLModels`. Add a `retrainModel()` server function that either calls a Python service or an external ML API.
- **Dependencies:** Depends on whether Python ML service is reachable from GH2 environment
- **Complexity:** Medium–High (Python service integration)
- **Files:** New route, extend `analytics.functions.ts`
- **Risk:** Medium

---

### Phase 4 — Operations (Sprint 4)

**9. Warehouse manager/technician assignment**
- Add `manager_id` column and `warehouse_members` join table. Create `assignManagerToWarehouse` and `addTechnicianToWarehouse` server functions. Add assignment UI panel in warehouse edit dialog.
- **Complexity:** Medium
- **Files:** New migration, `operations.functions.ts`, `warehouses.tsx`

**10. Insurance claim lifecycle**
- Add `review()`, `investigate()`, `assess()`, `recordPayment()` server functions extending `team-settings-insurance.functions.ts`. Add workflow tabs to insurance page.
- **Complexity:** Medium
- **Files:** `team-settings-insurance.functions.ts`, `insurance.tsx`

**11. Actuator scheduler**
- Add `schedule` JSONB column to `actuators`. Create `setActuatorSchedule()` server function. Add schedule panel in actuator edit dialog.
- **Complexity:** Medium
- **Files:** New migration, `operations.functions.ts`, `actuators.tsx`

**12. Available-silos filter by grain type**
- Add `listAvailableSilosForGrainType(grainType)` server function that filters silos containing only the same grain type or empty.
- **Complexity:** Low
- **Files:** `operations.functions.ts`, `grain-batches.tsx` silo dropdown

---

### Phase 5 — Polish (Sprint 5+)

**13. PDF report generation** — Add a Nitro API route using `@react-pdf/renderer` or Puppeteer.
**14. 2FA** — Use Supabase Auth MFA or custom email TOTP. Add toggle in settings.
**15. Invitation-based signup URL** — Store `pending_invitations` table; expose `/auth/accept-invite?token=` route.
**16. Silo SVG visualization** — Rebuild from GH1 component; integrate Firebase occupancy.
**17. QR Code display in traceability** — After #2 above, the traceability QR dialog will auto-work.
**18. i18n** — Add `i18next`. Wrap all strings. Add locale switcher. (Pervasive change — do last.)

---

## 9. Architectural Differences

Developers coming from GH1 must internalize these before touching GH2 code.

### 1. No Separate Backend Process
GH1 had two running processes: Next.js on port 3000 and Express on port 5000. GH2 is **one process**. All server logic lives in `src/lib/*.functions.ts` files executed by Nitro. There is no `localhost:5000`. Never add Express middleware.

### 2. Server Functions Replace REST
GH1: `const res = await api.get("/api/silos")`.
GH2: `const fn = useServerFn(listSilos); const data = await fn()`.
Server functions run on the server but are called from client components like regular async functions. They are type-safe end-to-end.

### 3. Supabase RLS Replaces Express Auth Middleware
GH1 had `middleware/auth.js` (JWT verify) + `middleware/admin.js`, `manager.js`, etc. GH2 enforces access at the **database layer** via Row-Level Security policies. The `requireSupabaseAuth` middleware only establishes the caller's identity. Never call `context.supabase` with the service key from client code.

### 4. TanStack Router vs Next.js App Router
- Route files use `createFileRoute("/_authenticated/silos")({ component: ... })` — not `export default function Page()`.
- Route guards use `beforeLoad: async () => { if (!user) throw redirect(...) }` — not `middleware.ts`.
- Navigation uses `<Link to="/silos">` (TanStack) — not `<Link href="/silos">` (Next.js).
- No `loading.tsx` / `error.tsx` files. Use TanStack Query states and `defaultPendingComponent`.

### 5. TanStack Query is the Only State Layer
No Redux, no Zustand, no Context for server data. Every data fetch uses `useQuery`. Every mutation uses `useMutation` and calls `qc.invalidateQueries` on success. Stale-while-revalidate is the default caching strategy.

### 6. Multi-Tenancy via `admin_id`
Every tenant-scoped table has `admin_id` (UUID FK to `profiles`). Supabase RLS policies filter all reads/writes to the caller's `admin_id`. Super admin uses the service key (only inside `platform.functions.ts` and server-only files).

### 7. Firebase is Read-Only from the Browser
Browser code uses `useFirebaseSensor` / `useFirebaseAllSensors` to **read** from Firebase RTDB. Actuator **writes** go through `actuator-bridge.server.ts` which uses the Firebase Admin SDK server-side. Never import `firebase-admin` in client components.

### 8. MongoDB → PostgreSQL Type Mapping
| GH1 (Mongoose) | GH2 (Supabase) |
|---|---|
| `ObjectId` | `uuid` |
| Nested objects | `JSONB` columns |
| `$in`, `$gte`, etc. | PostgREST filter operators |
| `Model.findOne({ admin_id })` | `.from("table").eq("admin_id", userId)` |
| Schema-less embedded arrays | `JSONB[]` or junction tables |
| `pre-save` hooks | Supabase DB functions / triggers |

### 9. No `localStorage` Token
GH1 stored JWT in `localStorage("token")`. GH2 uses Supabase Auth session cookies managed by `auth-middleware.ts`. Any GH1 code reading `localStorage.getItem("token")` is incompatible and must be removed.

### 10. MQTT is Gone
GH1 used an MQTT broker for bi-directional hardware communication (publish commands, subscribe to sensor topics). GH2 only uses Firebase RTDB. If any sensor device publishes over MQTT exclusively, it will not be reachable until a Firebase RTDB path is added to the firmware.

---

## 10. Final Summary

### Estimated Completion Percentage

| Module | Completion |
|---|---|
| Authentication & Onboarding | 80% (2FA, invitation URL missing) |
| Dashboard (all roles) | 90% |
| Warehouses | 80% (manager/tech assignment missing) |
| Silos | 75% (live conditions, limits missing) |
| Grain Batches | 85% (QR image, grain-filter, dispatch notification missing) |
| Buyers | 100% |
| Sensors | 85% (calibration, threshold alerts missing) |
| Actuators | 80% (scheduler, AI-trigger, MQTT missing) |
| Grain Alerts | 95% |
| Notifications (in-app) | 90% |
| Push Notifications | 0% |
| Reports | 75% (no PDF) |
| Analytics | 90% |
| AI Predictions + ML Models | 85% (no retrain, no Python model) |
| Environmental | 100% |
| Activity Logs | 100% |
| Incidents | 100% |
| Maintenance | 100% |
| Insurance | 70% (claim lifecycle incomplete) |
| Revenue | 100% |
| Traceability | 85% (QR not scannable) |
| Security Center | 100% |
| Server/Device Monitoring | 100% |
| Team Management | 100% |
| Settings | 95% |
| Subscription & Billing | 100% |
| Platform Administration | 100% |
| IoT Integration | 55% (MQTT, auto-alerts, silo conditions, history charts missing) |

### **Overall Estimated Completion: ~82%**
*(Significant jump from the previous ~65% estimate — the changes made have completed Activity Logs, Incidents, Maintenance, Revenue, Security Center, Server Monitoring, Buyers, and platform modules.)*

---

### Biggest Remaining Gaps

1. **Push Notifications** — 0% implemented. Critical for grain spoilage alerting to mobile/browser. Highest user impact.
2. **Silo live-conditions auto-update** — Silo cards always show stale data. Simple to fix (one DB trigger) but high operational impact.
3. **QR Code image generation** — Traceability labels cannot be scanned. One install + one server function.
4. **Sensor threshold → auto GrainAlert** — Automated alerts never fire. Operators must manually create all alerts.
5. **IoT Data Visualization** — The signature real-time monitoring screen from GH1 is entirely absent.
6. **Dispatch notification** — No notification sent when grain is dispatched. One-line fix.

---

### Highest-Priority Work (Do This Week)

1. **DB Trigger** — `sensor_readings INSERT → UPDATE silos.current_conditions` (30-min task)
2. **Dispatch notification** — insert `notifications` row inside `dispatchGrainBatch` (15-min task)
3. **Silo delete guard** + **plan limit check** in `deleteSilo`/`upsertSilo` (30-min task)
4. **QR Code image** — install `qrcode`, add server function, update batch page QR dialog (1-hour task)
5. **Sensor threshold auto-alerts** — port `checkThresholds()` + `createAlert()` logic from GH1 (2-hour task)

These five items require no new pages, no new routes, and no new tables. They are pure server function / trigger additions that dramatically improve data integrity and operational reliability.

---

### Recommended Next Feature to Implement (After the Quick Wins)
**IoT Data Visualization page** (`/data-visualization`). All data infrastructure is already in place — `listDeviceReadings` server function exists, `useFirebaseAllSensors` hook exists, Recharts is installed. It is the highest-value screen remaining that requires only UI work, no new backend logic.

After that: **Push Notifications** — the most impactful missing feature by far, but also the most complex. Start with the VAPID key setup and service worker, then the subscription model, then wire to the alert creation path.

