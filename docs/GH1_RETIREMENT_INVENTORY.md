# GrainHero 1 — Complete Retirement Inventory
**Date**: 2026-07-10  
**Purpose**: Identify every GH1 component and its migration status before retirement  
**Method**: Full repository scan of both codebases

---

## Legend
- ✅ Fully Migrated — safe to delete from GH1
- 🟡 Partially Migrated — logic exists in GH2 but gaps remain
- ❌ Not Migrated — functionality missing from GH2
- 🗑️ Legacy/Deprecated — safe to discard, not needed in GH2

---

# BACKEND — Routes (37 files)

| GH1 File | Purpose | GH2 Equivalent | Status |
|----------|---------|----------------|--------|
| `routes/auth.js` | Login, register, JWT issue | `auth-middleware.ts` + Supabase Auth | ✅ Fully Migrated |
| `routes/dashboard.js` | Aggregated stats per role | `lib/dashboard-extras.functions.ts` + `useDashboardStats.ts` | ✅ Fully Migrated |
| `routes/silos.js` | Silo CRUD | `lib/operations.functions.ts` → silos table | ✅ Fully Migrated |
| `routes/warehouses.js` | Warehouse CRUD | `lib/operations.functions.ts` → warehouses table | ✅ Fully Migrated |
| `routes/sensors.js` | Sensor device CRUD + thresholds | `routes/_authenticated/sensors.tsx` + server fns | ✅ Fully Migrated |
| `routes/iot.js` | MQTT + Firebase telemetry | `src/hooks/use-firebase-sensor.ts` + `cron/sync-firebase.ts` | 🟡 Partial — MQTT path not migrated |
| `routes/actuators.js` | Actuator control, FB write | `lib/actuator-bridge.server.ts` + `routes/_authenticated/actuators.tsx` | ✅ Fully Migrated |
| `routes/grainBatches.js` | Grain batch CRUD | `lib/operations.functions.ts` → grain_batches table | ✅ Fully Migrated |
| `routes/ai.js` | AI analytics, predictions | `lib/ai-insights.functions.ts`, `lib/analytics.functions.ts` | ✅ Fully Migrated |
| `routes/aiSpoilage.js` | Spoilage prediction API | `lib/ai-inference.functions.ts` + `routes/_authenticated/ai-predictions.tsx` | ✅ Fully Migrated |
| `routes/alerts.js` | Alerts CRUD, manual create | `routes/_authenticated/grain-alerts.tsx` + monitoring fns | ✅ Fully Migrated |
| `routes/notifications.js` | Notification CRUD + push | `lib/push.functions.ts` + `push.server.ts` | ✅ Fully Migrated |
| `routes/orders.js` | Hardware order management | `lib/hardware-orders.functions.ts` | ✅ Fully Migrated |
| `routes/payments.js` | Payment processing | `lib/billing.functions.ts` + Stripe webhook | ✅ Fully Migrated |
| `routes/create-checkout-session.js` | Stripe checkout session | `lib/stripe-checkout.functions.ts` | ✅ Fully Migrated |
| `routes/payment-verification.js` | Stripe webhook verification | `routes/api/public/webhooks/stripe.ts` | ✅ Fully Migrated |
| `routes/webhooks.js` | Stripe webhook handler | `routes/api/public/webhooks/stripe.ts` | ✅ Fully Migrated |
| `routes/buyers.js` | Buyer management | `routes/_authenticated/buyers.tsx` + billing fns | ✅ Fully Migrated |
| `routes/insurance.js` | Insurance claims/policies | `routes/_authenticated/insurance.tsx` + team-settings fns | ✅ Fully Migrated |
| `routes/incidents.js` | Incident CRUD | `lib/monitoring.functions.ts` + incidents route | ✅ Fully Migrated |
| `routes/maintenance.js` | Maintenance scheduling | `lib/operations2.functions.ts` + maintenance route | ✅ Fully Migrated |
| `routes/reports.js` | PDF/CSV report generation | `lib/monitoring.functions.ts` (CSV only, no PDF) | 🟡 Partial — PDF generation missing |
| `routes/environmental.js` | Weather + env data | `lib/openweather.functions.ts` + environmental route | ✅ Fully Migrated |
| `routes/dataVisualization.js` | Historical sensor charts | `routes/_authenticated/data-visualization.tsx` | ✅ Fully Migrated |
| `routes/activityLogs.js` | Activity log CRUD | `routes/_authenticated/activity-logs.tsx` | ✅ Fully Migrated |
| `routes/userManagement.js` | User CRUD (admin) | `lib/roles.functions.ts` + `platform.functions.ts` | ✅ Fully Migrated |
| `routes/adminManagement.js` | Admin settings management | `lib/team-settings-insurance.functions.ts` | ✅ Fully Migrated |
| `routes/adminSettings.js` | Admin profile + settings | `lib/team-settings-insurance.functions.ts` + settings route | ✅ Fully Migrated |
| `routes/superAdmin.js` | Super-admin platform ops | `lib/platform.functions.ts` + `routes/_authenticated/platform.*` | ✅ Fully Migrated |
| `routes/planManagement.js` | Subscription plan CRUD | `lib/subscription-management.functions.ts` | ✅ Fully Migrated |
| `routes/subscriptionAnalytics.js` | Revenue analytics | `lib/revenue-analytics.functions.ts` | ✅ Fully Migrated |
| `routes/logging.js` | System log endpoints | `routes/_authenticated/platform.logs.tsx` + platform fns | ✅ Fully Migrated |
| `routes/deviceHealth.js` | Device health monitoring | `lib/operations2.functions.ts` getDeviceHealth | ✅ Fully Migrated |
| `routes/dualProbeMonitoring.js` | Dual probe sensor logic | No equivalent found | ❌ Not Migrated |
| `routes/products.js` | Product catalogue | No equivalent found | ❌ Not Migrated |
| `routes/quotes.js` | Quote generation | No equivalent found | ❌ Not Migrated |
| `routes/contact.js` | Contact form backend | No equivalent found | 🗑️ Static/marketing only |


---

# BACKEND — Services (20 files)

| GH1 File | Purpose | GH2 Equivalent | Status |
|----------|---------|----------------|--------|
| `services/firebaseRealtimeService.js` | Firebase RTDB listener + sensor processing | `cron/sync-firebase.ts` + `use-firebase-sensor.ts` | ✅ Fully Migrated |
| `services/realTimeDataService.js` | WebSocket broadcasting, threshold alerts | Supabase Realtime (`use-realtime-invalidate.ts`) + GH2 alert hooks | ✅ Fully Migrated |
| `services/aiSpoilageService.js` | AI spoilage prediction orchestration | `lib/ai-inference.functions.ts` + `lib/ai-insights.functions.ts` | ✅ Fully Migrated |
| `services/alertEngine.js` | Automated alert rule engine | `hooks/alerts-escalation.ts` + `hooks/sensor-offline-detector.ts` | ✅ Fully Migrated |
| `services/notificationService.js` | In-app + push notification dispatch | `lib/push.server.ts` + `lib/push.functions.ts` | ✅ Fully Migrated |
| `services/pushNotificationAdapter.js` | Web Push + FCM dual adapter | `lib/push.server.ts` (identical dual-adapter pattern) | ✅ Fully Migrated |
| `services/environmentalDataService.js` | OpenWeather API integration | `lib/openweather.functions.ts` | ✅ Fully Migrated |
| `services/weatherService.js` | Weather forecasts + risk analysis | `lib/openweather.functions.ts` + `routes/_authenticated/environmental.tsx` | ✅ Fully Migrated |
| `services/fanControlService.js` | Automated fan on/off decisions | `lib/fan-control.functions.ts` | ✅ Fully Migrated |
| `services/dataAggregationService.js` | 30s raw → 5min average pipeline | `is_aggregated` + `aggregation_period` fields in schema (no active aggregator) | 🟡 Partial — schema ready, aggregation job not running |
| `services/loggingService.js` | Activity log writes | `lib/operations.functions.ts` (activity_logs table) | ✅ Fully Migrated |
| `services/usageTracking.js` | Subscription usage metering | `lib/billing.functions.ts` + `lib/subscription-management.functions.ts` | ✅ Fully Migrated |
| `services/limitWarningService.js` | Plan limit approaching alerts | `lib/expiry-reminders.server.ts` | 🟡 Partial — expiry reminders exist, usage-limit warnings unclear |
| `services/pdfService.js` | PDF report generation (jsPDF) | No server-side PDF generator in GH2 | ❌ Not Migrated |
| `services/iotDeviceService.js` | Device registration + heartbeat | `lib/operations.functions.ts` (sensor_devices table) | ✅ Fully Migrated |
| `services/mlDataCollectionService.js` | ML training data collection | `lib/ml-csv-logger.server.ts` | ✅ Fully Migrated |
| `services/realTimePredictionService.js` | Streaming ML predictions | `lib/ai-inference.functions.ts` (on-demand, not streaming) | 🟡 Partial — batch prediction only, no streaming |
| `services/riceDataService.js` | Rice-specific data helpers | Grain type handled generically in GH2 | ✅ Fully Migrated (generalised) |
| `services/trainingDataService.js` | ML dataset management | `lib/ml-csv-logger.server.ts` + CSV files in `src/ml/` | ✅ Fully Migrated |
| `services/offlineDataService.js` | File-system offline buffer | Never called in GH1 production | 🗑️ Legacy — dead code in GH1 |

---

# BACKEND — Middleware (13 files)

| GH1 File | Purpose | GH2 Equivalent | Status |
|----------|---------|----------------|--------|
| `middleware/auth.js` | JWT verification | `integrations/supabase/auth-middleware.ts` (`requireSupabaseAuth`) | ✅ Fully Migrated |
| `middleware/permission.js` | Permission-based access control | `requireSupabaseAuth` middleware + role checks in each server fn | ✅ Fully Migrated |
| `middleware/roleAuth.js` | Role-based access (admin/manager/etc) | `lib/roles.functions.ts` + dashboard role routing | ✅ Fully Migrated |
| `middleware/superadmin.js` | Super-admin guard | `requireSupabaseAuth` + super_admin role check | ✅ Fully Migrated |
| `middleware/admin.js` | Admin role guard | Admin role check per server function | ✅ Fully Migrated |
| `middleware/manager.js` | Manager role guard | Manager role check per server function | ✅ Fully Migrated |
| `middleware/technician.js` | Technician role guard | Technician role check per server function | ✅ Fully Migrated |
| `middleware/assistant.js` | Assistant role guard | Assistant role check per server function | ✅ Fully Migrated |
| `middleware/subscription.js` | Subscription plan gating | `lib/billing.functions.ts` + subscription checks | 🟡 Partial — plan feature gating not explicitly enforced per-route |
| `middleware/warehouseAccess.js` | Multi-warehouse tenant isolation | `admin_id` RLS policies in Supabase (database level) | ✅ Fully Migrated (stronger in GH2) |
| `middleware/cache.js` | Redis/memory response caching | No caching layer in GH2 | 🟡 Partial — GH2 relies on react-query client cache only |
| `middleware/noCache.js` | Cache-control headers | Not needed (GH2 uses server functions, not REST) | 🗑️ Legacy |
| `middleware/orderValidation.js` | Order payload validation | Zod validators in each server function | ✅ Fully Migrated |

---

# BACKEND — Models (29 MongoDB documents)

| GH1 Model | Purpose | GH2 Supabase Table | Status |
|-----------|---------|-------------------|--------|
| `User.js` | User accounts | `profiles` + Supabase Auth `auth.users` | ✅ Fully Migrated |
| `Silo.js` | Silo storage units | `silos` | ✅ Fully Migrated |
| `Warehouse.js` | Warehouse facilities | `warehouses` | ✅ Fully Migrated |
| `SensorDevice.js` | IoT device registry | `sensor_devices` | ✅ Fully Migrated |
| `SensorReading.js` | Sensor telemetry readings | `sensor_readings` | ✅ Fully Migrated |
| `Actuator.js` | Actuator devices | `actuators` | ✅ Fully Migrated |
| `GrainBatch.js` | Grain batch tracking | `grain_batches` | ✅ Fully Migrated |
| `GrainAlert.js` | IoT-generated alerts | `grain_alerts` | ✅ Fully Migrated |
| `Alert.js` | Manual/system alerts | `grain_alerts` (unified) | ✅ Fully Migrated |
| `Notification.js` | User notifications | `notifications` | ✅ Fully Migrated |
| `UserPushSubscription.js` | Push subscription tokens | `push_subscriptions` | ✅ Fully Migrated |
| `SpoilagePrediction.js` | ML prediction results | `spoilage_predictions` | ✅ Fully Migrated |
| `Subscription.js` | SaaS subscription records | `subscriptions` | ✅ Fully Migrated |
| `Order.js` | Hardware orders | `hardware_orders` | ✅ Fully Migrated |
| `Buyer.js` | Grain buyers | `buyers` | ✅ Fully Migrated |
| `BuyerInvoice.js` | Buyer invoices | `buyer_invoices` | ✅ Fully Migrated |
| `BuyerPayment.js` | Buyer payments | `buyer_payments` | ✅ Fully Migrated |
| `Invoice.js` | Platform invoices | `invoices` | ✅ Fully Migrated |
| `ActivityLog.js` | Audit trail | `activity_logs` | ✅ Fully Migrated |
| `Incident.js` | Operational incidents | `incidents` | ✅ Fully Migrated |
| `InsuranceClaim.js` | Insurance claims | `insurance_claims` | ✅ Fully Migrated |
| `InsurancePolicy.js` | Insurance policies | `insurance_policies` | ✅ Fully Migrated |
| `Maintenance.js` | Maintenance records | `maintenance_records` | ✅ Fully Migrated |
| `DispatchTransaction.js` | Grain dispatch records | `dispatch_transactions` | ✅ Fully Migrated |
| `SiloFinancials.js` | Per-silo financial data | Covered by `silos` + `buyer_invoices` | ✅ Fully Migrated |
| `WarehouseFinancials.js` | Per-warehouse financials | Covered by `warehouses` + billing tables | ✅ Fully Migrated |
| `Advisory.js` | AI-generated advisories | `ai_insights` / `spoilage_predictions` | 🟡 Partial — advisory model not explicit |
| `Product.js` | Product catalogue | No equivalent | ❌ Not Migrated |
| `Quote.js` | Price quotations | No equivalent | ❌ Not Migrated |

---

# BACKEND — Configs (5 files)

| GH1 File | Purpose | GH2 Equivalent | Status |
|----------|---------|----------------|--------|
| `configs/enum.js` | System-wide enums (device types, statuses) | TypeScript types in `integrations/supabase/types.ts` | ✅ Fully Migrated |
| `configs/role-permissions.js` | Per-role feature permissions | Role checks in each `requireSupabaseAuth` handler + sidebar nav | ✅ Fully Migrated |
| `configs/plan-features.js` | Feature flags per subscription plan | `lib/pricing-data.ts` | ✅ Fully Migrated |
| `configs/plan-mapping.js` | Stripe plan ID ↔ internal name mapping | `lib/pricing-data.ts` + Stripe metadata | ✅ Fully Migrated |
| `configs/risk-thresholds.js` | Risk level calculation thresholds | ML model (`src/ml/smartbin_predict.py`) + hardcoded in sync cron | 🟡 Partial — thresholds not configurable in GH2 |

---

# BACKEND — Utilities (2 files)

| GH1 File | Purpose | GH2 Equivalent | Status |
|----------|---------|----------------|--------|
| `utils/emailHelper.js` | Email sending via SMTP/Resend | `lib/checkout-emails.functions.ts` + `lib/expiry-reminders.server.ts` | ✅ Fully Migrated |
| `utils/csvHelper.js` | CSV parsing and generation | `lib/operations.functions.ts` `exportSensorCSV` | ✅ Fully Migrated |

---

# BACKEND — Scripts (14 files)

| GH1 File | Purpose | Status |
|----------|---------|--------|
| `scripts/iotDeviceSimulator.js` | Simulate ESP32 sensor data | 🗑️ Dev tool — not needed in production |
| `scripts/migrate-push-notifications.js` | One-time push subscription migration | 🗑️ Already run — historical migration script |
| `scripts/migrate-subscriptions.js` | One-time subscription data migration | 🗑️ Already run — historical |
| `scripts/migrateTenantToAdmin.js` | One-time tenant schema migration | 🗑️ Already run — historical |
| `scripts/migrateWarehouses.js` | One-time warehouse data migration | 🗑️ Already run — historical |
| `scripts/backfill_batch_loaded_date.js` | Backfill data fix | 🗑️ Already run — historical |
| `scripts/clearCollections.js` | Dev utility to wipe MongoDB | 🗑️ Dev tool |
| `scripts/seedGrain.js` | Seed grain batch data | 🗑️ Dev tool |
| `scripts/update_device_004B.js` | One-off device update | 🗑️ Historical |
| `scripts/checkEnvironmentalData.js` | Debug script | 🗑️ Dev tool |
| `scripts/checkSuperAdmin.js` | Debug script | 🗑️ Dev tool |
| `scripts/comprehensiveWeatherTest.js` | Weather API test | 🗑️ Dev tool |
| `scripts/simpleWeatherTest.js` | Weather API test | 🗑️ Dev tool |
| `scripts/testEnvironmentalService.js` | Service test | 🗑️ Dev tool |
| `scripts/testWeatherAPI.js` | API test | 🗑️ Dev tool |

---

# BACKEND — Scratch / Root-level scripts (14 files)

| GH1 File | Purpose | Status |
|----------|---------|--------|
| `scratch/check_actuators.js` | Debug actuator data | 🗑️ Dev tool |
| `scratch/check_recent_batches.js` | Debug grain batches | 🗑️ Dev tool |
| `scratch/check_recent_users.js` | Debug user data | 🗑️ Dev tool |
| `scratch/check_stripe_prices.js` | Debug Stripe config | 🗑️ Dev tool |
| `scratch/create_test_user.js` | Dev user creation | 🗑️ Dev tool |
| `scratch/final_data_check.js` | Debug script | 🗑️ Dev tool |
| `scratch/fix_actuators_and_alerts.js` | One-off data fix | 🗑️ Historical |
| `scratch/simulate_webhook.js` | Webhook simulation | 🗑️ Dev tool |
| `add_sample_silos.js` | Dev data seeder | 🗑️ Dev tool |
| `backfill_warehouse.js` | One-off backfill | 🗑️ Historical |
| `check_actuators.js` | Debug | 🗑️ Dev tool |
| `check_silos.js` | Debug | 🗑️ Dev tool |
| `test_api.js` | API test harness | 🗑️ Dev tool |
| `test_environmental.js` | Service test | 🗑️ Dev tool |
| `test_push_notification.js` | Push test | 🗑️ Dev tool |
| `test_startup.js` | Startup test | 🗑️ Dev tool |
| `trigger_test_push.js` | Push test trigger | 🗑️ Dev tool |


---

# ML LAYER

| GH1 File | Purpose | GH2 Equivalent | Status |
|----------|---------|----------------|--------|
| `ml/smartbin_predict.py` | Main inference script | `src/ml/smartbin_predict.py` | ✅ Fully Migrated |
| `ml/smartbin_model.pkl` | Trained Random Forest model | `src/ml/smartbin_model.pkl` | ✅ Fully Migrated |
| `ml/ensemble_model.pkl` | Ensemble model | `src/ml/ensemble_model.pkl` | ✅ Fully Migrated |
| `ml/label_encoder.pkl` | Label encoder | `src/ml/label_encoder.pkl` | ✅ Fully Migrated |
| `ml/rice_ensemble_model.pkl` | Rice-specific model | `src/ml/rice_ensemble_model.pkl` | ✅ Fully Migrated |
| `ml/rice_label_encoder.pkl` | Rice label encoder | `src/ml/rice_label_encoder.pkl` | ✅ Fully Migrated |
| `ml/rice_model_metadata.json` | Model metadata | `src/ml/rice_model_metadata.json` | ✅ Fully Migrated |
| `ml/model_metadata.json` | Model metadata | `src/ml/model_metadata.json` | ✅ Fully Migrated |
| `ml/ensemble_train.py` | Ensemble training script | Not present (training runs offline) | 🟡 Partial — training scripts not migrated |
| `ml/enhanced_train.py` | Enhanced training pipeline | Not present | 🟡 Partial |
| `ml/data_manager.py` | Training data management | `lib/ml-csv-logger.server.ts` | 🟡 Partial — JS equivalent only |
| `ml/generate_per_grain.py` | Per-grain dataset generation | Not present | 🟡 Partial |
| `ml/model_performance.py` | Model performance evaluation | `routes/_authenticated/ml-models.tsx` (display only) | 🟡 Partial — no server-side eval |
| `ml/requirements.txt` | Python dependencies | Not present in GH2 | ❌ Not Migrated — needed to run Python scripts |
| `ml/grain_spoilage_dataset.csv` | Base training dataset | `src/ml/` (CSV files synced) | ✅ Fully Migrated |
| `ml/rice_spoilage_10k.csv` | Rice training data | Generated by cron logger | ✅ Fully Migrated |
| `ml/barley_spoilage_10k.csv` | Barley training data | Not present in GH2 | ❌ Not Migrated |
| `ml/maize_spoilage_10k.csv` | Maize training data | Not present in GH2 | ❌ Not Migrated |
| `ml/wheat_spoilage_10k.csv` | Wheat training data | Not present in GH2 | ❌ Not Migrated |
| `ml/sorghum_spoilage_10k.csv` | Sorghum training data | Not present in GH2 | ❌ Not Migrated |

---

# FIREBASE LAYER

| GH1 Component | Purpose | GH2 Equivalent | Status |
|---------------|---------|----------------|--------|
| RTDB path `/sensor_data/{id}/latest` | ESP32 writes sensor data | RTDB path `/devices/{id}/live` | ⚠️ PATH MISMATCH — ESP32 firmware must be updated |
| RTDB path `/control/{id}` | Backend writes actuator commands | RTDB path `/control/{id}` | ✅ Same path |
| Firebase Admin SDK (Node.js) | Server-side RTDB read | `lib/firebase-admin.server.ts` (REST API via JWT) | ✅ Fully Migrated |
| Firebase client SDK (Next.js) | Browser RTDB subscription | `src/integrations/firebase/client.ts` + `use-firebase-sensor.ts` | ✅ Fully Migrated |
| `ref.on('value')` realtime listener | Push data on every write | `onValue()` in `use-firebase-sensor.ts` | ✅ Fully Migrated |

> **Critical Note on RTDB Path**: GH1 listens on `/sensor_data/{id}/latest`. GH2 cron reads `/devices/{id}/live`. If ESP32 firmware has not been updated, the GH2 cron will read empty data. This is the single most important infrastructure change before retirement.

---

# IoT / HARDWARE LAYER

| GH1 Component | Purpose | GH2 Equivalent | Status |
|---------------|---------|----------------|--------|
| MQTT broker integration | Real-time device control (sub-1s) | No MQTT in GH2 | ❌ Not Migrated |
| MQTT topic `grainhero/sensors/+/readings` | Subscribe to sensor data | Not present | ❌ Not Migrated |
| MQTT topic `grainhero/actuators/+/control` | Publish actuator commands | Firebase `/control/{id}` write only | 🟡 Partial — Firebase polling (10-30s delay) |
| MQTT topic `grainhero/actuators/+/feedback` | Receive actuator feedback | Not present | ❌ Not Migrated |
| MQTT auto-reconnect (10s) | Resilience to broker downtime | Not applicable | 🗑️ N/A (architecture differs) |
| Device auto-registration | Auto-create unknown devices | Not present — manual provisioning only | ❌ Not Migrated |
| Dual probe monitoring | Two simultaneous probe sensors | Not present | ❌ Not Migrated |

---

# AUTHENTICATION & AUTHORIZATION

| GH1 Component | Purpose | GH2 Equivalent | Status |
|---------------|---------|----------------|--------|
| JWT issue/refresh (local) | Custom JWT auth | Supabase Auth (JWT managed by Supabase) | ✅ Fully Migrated |
| Login / Register | Auth endpoints | `routes/auth.login.tsx` + `routes/auth.signup.tsx` | ✅ Fully Migrated |
| Password reset | `profile/reset/page.tsx` | `routes/auth.forgot-password.tsx` + `reset-password.tsx` | ✅ Fully Migrated |
| Role system (6 roles) | admin/manager/tech/assistant/super_admin/pending | `roles` table + `useMyProfile.ts` | ✅ Fully Migrated |
| Row-level security | Per-admin data isolation | Supabase RLS policies on all tables | ✅ Fully Migrated (stronger) |
| Session persistence | localStorage JWT | Supabase session (localStorage + refresh tokens) | ✅ Fully Migrated |

---

# FRONTEND — Pages (GH1: 44 screens, GH2: 37 routes)

| GH1 Page | GH2 Route | Status |
|----------|-----------|--------|
| `/dashboard` | `/_authenticated/dashboard` | ✅ Fully Migrated |
| `/silos` | `/_authenticated/silos` | ✅ Fully Migrated |
| `/sensors` | `/_authenticated/sensors` | ✅ Fully Migrated |
| `/actuators` | `/_authenticated/actuators` | ✅ Fully Migrated |
| `/grain-batches` | `/_authenticated/grain-batches` | ✅ Fully Migrated |
| `/grain-alerts` | `/_authenticated/grain-alerts` | ✅ Fully Migrated |
| `/warehouses` | `/_authenticated/warehouses` | ✅ Fully Migrated |
| `/buyers` | `/_authenticated/buyers` | ✅ Fully Migrated |
| `/analytics` | `/_authenticated/analytics` | ✅ Fully Migrated |
| `/ai-predictions` | `/_authenticated/ai-predictions` | ✅ Fully Migrated |
| `/data-visualization` | `/_authenticated/data-visualization` | ✅ Fully Migrated |
| `/environmental` | `/_authenticated/environmental` | ✅ Fully Migrated |
| `/alerts` | `/_authenticated/grain-alerts` (merged) | ✅ Fully Migrated |
| `/incidents` | `/_authenticated/incidents` | ✅ Fully Migrated |
| `/insurance` | `/_authenticated/insurance` | ✅ Fully Migrated |
| `/maintenance` | `/_authenticated/maintenance` | ✅ Fully Migrated |
| `/notifications` | `/_authenticated/notifications` | ✅ Fully Migrated |
| `/notification-settings` | `/_authenticated/settings` (tab) | ✅ Fully Migrated |
| `/reports` | `/_authenticated/reports` | 🟡 Partial — CSV only, no PDF |
| `/activity-logs` | `/_authenticated/activity-logs` | ✅ Fully Migrated |
| `/settings` | `/_authenticated/settings` | ✅ Fully Migrated |
| `/team-management` | `/_authenticated/team-management` | ✅ Fully Migrated |
| `/traceability` | `/_authenticated/traceability` | ✅ Fully Migrated |
| `/security-center` | `/_authenticated/security-center` | ✅ Fully Migrated |
| `/server-monitoring` | `/_authenticated/server-monitoring` | ✅ Fully Migrated |
| `/plans` | `/_authenticated/plans` | ✅ Fully Migrated |
| `/revenue-management` | `/_authenticated/revenue` | ✅ Fully Migrated |
| `/billing` | `/_authenticated/subscription` | ✅ Fully Migrated |
| `/plan-management` | `/_authenticated/platform.*` | ✅ Fully Migrated |
| `/super-admin/*` | `/_authenticated/platform.*` | ✅ Fully Migrated |
| `/profile` | `/_authenticated/settings` (profile tab) | ✅ Fully Migrated |
| `/payments` | `/_authenticated/revenue` | ✅ Fully Migrated |
| `/ai-analytics` | `/_authenticated/analytics` (merged) | ✅ Fully Migrated |
| `/ai-spoilage` | `/_authenticated/ai-predictions` (merged) | ✅ Fully Migrated |
| `/model-performance` | `/_authenticated/ml-models` | ✅ Fully Migrated |
| `/global-analytics` | `/_authenticated/platform.revenue` | ✅ Fully Migrated |
| `/system-health` | `/_authenticated/server-monitoring` | ✅ Fully Migrated |
| `/system-logs` | `/_authenticated/platform.logs` | ✅ Fully Migrated |
| `/mobile` | No dedicated mobile route | ❌ Not Migrated |
| `/users` | `/_authenticated/platform.users` | ✅ Fully Migrated |
| `/security` | `/_authenticated/security-center` (merged) | ✅ Fully Migrated |
| `/checkout` | `/checkout` | ✅ Fully Migrated |
| `/alerts/new` | Inline form in grain-alerts | ✅ Fully Migrated |
| `/incidents/new` | Inline form in incidents | ✅ Fully Migrated |

---

# FRONTEND — Components

| GH1 Component | Purpose | GH2 Equivalent | Status |
|---------------|---------|----------------|--------|
| `components/chatbot-popup.tsx` | In-app AI chatbot | No equivalent | ❌ Not Migrated |
| `components/chatbot-provider.tsx` | Chatbot context | No equivalent | ❌ Not Migrated |
| `components/silo-visualization.tsx` | Animated silo diagram | No equivalent | ❌ Not Migrated |
| `components/advanced-search.tsx` | Cross-module search | No equivalent | ❌ Not Migrated |
| `components/animations/AnimatedSilo.tsx` | Silo fill animation | No equivalent | ❌ Not Migrated |
| `components/animations/AnimatedCharts.tsx` | Animated chart transitions | No equivalent | ❌ Not Migrated |
| `components/animations/AnimatedLanding.tsx` | Landing page animations | GH2 landing components (no framer-motion equivalent) | 🟡 Partial |
| `components/animations/MotionGraphics.tsx` | Motion graphics | No equivalent | ❌ Not Migrated |
| `components/actuator-quick-actions.tsx` | Quick actuator controls | Inline in `actuators.tsx` | ✅ Fully Migrated |
| `components/language-selector.tsx` | Locale switcher | No equivalent | ❌ Not Migrated |
| `components/LocationAutocomplete.tsx` | Geocoding autocomplete | No equivalent | ❌ Not Migrated |
| `components/TeamInvitationForm.tsx` | Team invite form | Inline in team-management | ✅ Fully Migrated |
| `components/CartProvider.tsx` | Checkout cart context | Inline checkout flow | ✅ Fully Migrated |
| `components/WelcomeNotification.tsx` | Onboarding welcome | `components/app/OnboardingTour.tsx` | ✅ Fully Migrated |
| `components/push-notification-permission.tsx` | Push permission prompt | `lib/push-notifications.ts` | ✅ Fully Migrated |
| `components/AuthGuard.tsx` | Route protection | `components/app/SessionGuard.tsx` | ✅ Fully Migrated |
| `components/sidebar.tsx` | Navigation sidebar | `components/app/AppSidebar.tsx` | ✅ Fully Migrated |
| `components/QRCodeDisplay.tsx` | QR code display | `components/QRCodeDisplay.tsx` | ✅ Fully Migrated |
| `components/PasswordStrengthIndicator.tsx` | Password strength UI | `components/auth/PasswordStrengthIndicator.tsx` | ✅ Fully Migrated |
| `components/dashboards/*` (4 files) | Role-based dashboards | `components/dashboards/*` (5 files) | ✅ Fully Migrated |
| `components/landing/*` (7 files) | Marketing pages | `components/landing/*` (7 files) | ✅ Fully Migrated |
| All `components/ui/*` (22 files) | shadcn/ui primitives | `components/ui/*` (44 files — superset) | ✅ Fully Migrated |

---

# FRONTEND — Hooks

| GH1 Hook | Purpose | GH2 Equivalent | Status |
|----------|---------|----------------|--------|
| `hooks/useFirebaseSensor.ts` | Poll Firebase via backend API | `src/hooks/use-firebase-sensor.ts` (direct SDK) | ✅ Fully Migrated |
| `hooks/use-mobile.ts` | Mobile breakpoint detection | `src/hooks/use-mobile.tsx` | ✅ Fully Migrated |

---

# FRONTEND — Lib / Utilities

| GH1 File | Purpose | GH2 Equivalent | Status |
|----------|---------|----------------|--------|
| `lib/api.ts` | HTTP client wrapper | TanStack server functions (no separate client) | ✅ Fully Migrated |
| `lib/auth-utils.ts` | Auth helpers | `integrations/supabase/auth-middleware.ts` | ✅ Fully Migrated |
| `lib/firebase.ts` | Firebase client init | `integrations/firebase/client.ts` | ✅ Fully Migrated |
| `lib/push-notifications.ts` | Push subscription registration | `lib/push-notifications.ts` | ✅ Fully Migrated |
| `lib/utils.ts` | General utilities | `lib/utils.ts` | ✅ Fully Migrated |
| `lib/validation.ts` | Form validation | `lib/validation.ts` + Zod schemas | ✅ Fully Migrated |
| `lib/percentageUtils.ts` | Percentage calculations | Inline in components | ✅ Fully Migrated |
| `lib/languages.ts` | i18n language strings | No equivalent | ❌ Not Migrated — GH2 is English-only |
| `lib/useEnvironmentalData.ts` | Environmental data hook | `lib/openweather.functions.ts` | ✅ Fully Migrated |

---

# FRONTEND — i18n (7 locale files)

| GH1 | Purpose | GH2 | Status |
|-----|---------|-----|--------|
| `messages/en.json` | English strings | Hardcoded in components | 🗑️ GH2 is English-only by design |
| `messages/fr.json` | French translation | No equivalent | ❌ Not Migrated |
| `messages/ha.json` | Hausa translation | No equivalent | ❌ Not Migrated |
| `messages/lg.json` | Luganda translation | No equivalent | ❌ Not Migrated |
| `messages/po.json` | Portuguese translation | No equivalent | ❌ Not Migrated |
| `messages/ur.json` | Urdu translation | No equivalent | ❌ Not Migrated |
| `messages/yo.json` | Yoruba translation | No equivalent | ❌ Not Migrated |
| `i18n/routing.ts` | next-intl locale routing | No equivalent | ❌ Not Migrated |

---

# PAYMENTS / BILLING

| GH1 Component | GH2 Equivalent | Status |
|---------------|----------------|--------|
| Stripe checkout (custom) | `lib/stripe-checkout.functions.ts` | ✅ Fully Migrated |
| Stripe webhook handler | `routes/api/public/webhooks/stripe.ts` | ✅ Fully Migrated |
| Subscription management | `lib/subscription-management.functions.ts` | ✅ Fully Migrated |
| Billing portal | `lib/stripe-checkout.functions.ts` (portal session) | ✅ Fully Migrated |
| Revenue analytics | `lib/revenue-analytics.functions.ts` | ✅ Fully Migrated |
| Plan feature gates | `lib/pricing-data.ts` (data only, no enforcement) | 🟡 Partial |

---

# NOTIFICATIONS

| GH1 Component | GH2 Equivalent | Status |
|---------------|----------------|--------|
| Web Push (VAPID) | `lib/push.server.ts` | ✅ Fully Migrated |
| FCM push | `lib/push.server.ts` | ✅ Fully Migrated |
| In-app notifications | `notifications` table + `notifications.tsx` | ✅ Fully Migrated |
| Push subscription storage | `push_subscriptions` table | ✅ Fully Migrated |
| Alert escalation (L1→L2→L3) | `hooks/alerts-escalation.ts` | ✅ Fully Migrated |
| Expiry reminders | `hooks/expiry-reminders.ts` + `lib/expiry-reminders.server.ts` | ✅ Fully Migrated |

---

# BACKGROUND JOBS / CRON TASKS

| GH1 Job | Purpose | GH2 Equivalent | Status |
|---------|---------|----------------|--------|
| Firebase RTDB listener (always-on) | Real-time data ingestion | `cron/sync-firebase.ts` (scheduled) | 🟡 Partial — polling, not push |
| `dataAggregationService` (10min interval) | 30s → 5min aggregation | No active cron job | ❌ Not Migrated |
| `environmentalDataService` (hourly) | Fetch weather data | `hooks/expiry-reminders.ts` (different trigger) | 🟡 Partial — no regular weather refresh job |
| `realTimePredictionService` (continuous) | Streaming ML predictions | On-demand via cron sync | 🟡 Partial |
| Subscription analytics job | Usage metering | Supabase Realtime triggers | ✅ Fully Migrated |
| `hooks/alerts-escalation.ts` | Escalate unacknowledged alerts | `hooks/alerts-escalation.ts` | ✅ Fully Migrated |
| `hooks/sensor-offline-detector.ts` | Mark stale devices offline | `hooks/sensor-offline-detector.ts` | ✅ Fully Migrated |
| `hooks/expiry-reminders.ts` | Subscription expiry emails | `hooks/expiry-reminders.ts` | ✅ Fully Migrated |


---

# RETIREMENT CHECKLIST

---

## ✅ Safe to Delete Today (No action required)

These items are either fully migrated or were dead/dev-only code in GH1.

**GH1 Backend — Routes (fully replaced)**
- `routes/auth.js` → Supabase Auth
- `routes/dashboard.js` → GH2 dashboard fns
- `routes/silos.js` → GH2 operations.functions
- `routes/warehouses.js` → GH2 operations.functions
- `routes/sensors.js` → GH2 operations.functions
- `routes/actuators.js` → GH2 actuator-bridge + operations
- `routes/grainBatches.js` → GH2 operations.functions
- `routes/ai.js` → GH2 ai-insights/analytics
- `routes/aiSpoilage.js` → GH2 ai-inference
- `routes/alerts.js` → GH2 operations.functions
- `routes/notifications.js` → GH2 push.functions
- `routes/orders.js` → GH2 hardware-orders
- `routes/payments.js` → GH2 billing.functions
- `routes/create-checkout-session.js` → GH2 stripe-checkout
- `routes/payment-verification.js` → GH2 webhooks/stripe
- `routes/webhooks.js` → GH2 webhooks/stripe
- `routes/buyers.js` → GH2 operations.functions
- `routes/insurance.js` → GH2 team-settings-insurance
- `routes/incidents.js` → GH2 monitoring.functions
- `routes/maintenance.js` → GH2 operations2.functions
- `routes/environmental.js` → GH2 openweather.functions
- `routes/dataVisualization.js` → GH2 data-visualization route
- `routes/activityLogs.js` → GH2 activity-logs route
- `routes/userManagement.js` → GH2 roles + platform.functions
- `routes/adminManagement.js` → GH2 team-settings-insurance
- `routes/adminSettings.js` → GH2 settings route
- `routes/superAdmin.js` → GH2 platform.functions
- `routes/planManagement.js` → GH2 subscription-management
- `routes/subscriptionAnalytics.js` → GH2 revenue-analytics
- `routes/logging.js` → GH2 platform.logs
- `routes/deviceHealth.js` → GH2 operations2.getDeviceHealth
- `routes/contact.js` → Not needed (static page)

**GH1 Backend — Services (fully replaced or dead)**
- `services/firebaseRealtimeService.js` → GH2 sync-firebase
- `services/realTimeDataService.js` → Supabase Realtime
- `services/aiSpoilageService.js` → GH2 ai-inference
- `services/alertEngine.js` → GH2 alert hooks
- `services/notificationService.js` → GH2 push.server
- `services/pushNotificationAdapter.js` → GH2 push.server
- `services/environmentalDataService.js` → GH2 openweather
- `services/weatherService.js` → GH2 openweather
- `services/loggingService.js` → GH2 activity_logs
- `services/usageTracking.js` → GH2 billing
- `services/iotDeviceService.js` → GH2 sensor_devices table
- `services/mlDataCollectionService.js` → GH2 ml-csv-logger
- `services/riceDataService.js` → Generic in GH2
- `services/trainingDataService.js` → GH2 ml-csv-logger
- `services/offlineDataService.js` → Dead code, never called
- `services/fanControlService.js` → GH2 fan-control.functions

**GH1 Backend — Middleware (fully replaced)**
- All 13 middleware files → Supabase Auth + RLS + server fn guards

**GH1 Backend — Models (fully replaced)**
- All 27 migrated models (see table above) → Supabase tables

**GH1 Backend — Configs (fully replaced)**
- `configs/enum.js` → TypeScript types
- `configs/role-permissions.js` → Server function role checks
- `configs/plan-features.js` → GH2 pricing-data
- `configs/plan-mapping.js` → GH2 pricing-data

**GH1 Backend — Utilities**
- `utils/emailHelper.js` → GH2 email functions
- `utils/csvHelper.js` → GH2 exportSensorCSV

**All Scripts and Scratch files** (17 files) → Dev tools, historical migrations

**ML artifacts (migrated)**
- `ml/smartbin_predict.py` → GH2 `src/ml/`
- `ml/*.pkl` (6 files) → GH2 `src/ml/`
- `ml/*.json` (2 files) → GH2 `src/ml/`
- `ml/*.csv` (rice, grain_spoilage) → GH2 / regenerated by logger

**GH1 Frontend — All migrated pages** (37 of 44)  
**GH1 Frontend — All migrated components** (15 of 22)  
**GH1 Frontend — All migrated hooks** (2 of 2)  
**GH1 Frontend — All migrated lib files** (7 of 8)  
**GH1 server.js** (MongoDB/Socket.IO/Express setup)  

---

## 🟡 Requires Migration Before Retirement

These items have partial equivalents in GH2 but are missing functionality.

| Item | What's Missing | Effort |
|------|----------------|--------|
| **Firebase RTDB path** `/sensor_data/{id}/latest` vs `/devices/{id}/live` | ESP32 firmware update OR GH2 cron must also subscribe to `/sensor_data/{id}/latest` | Low (config change) |
| **`routes/reports.js`** — PDF generation | GH2 reports page calls GH1 backend for PDF; `services/pdfService.js` not replaced | Medium (2-3 days) |
| **`services/dataAggregationService.js`** | 30s raw → 5min average job has schema columns but no active cron trigger | Low (1 day) |
| **`services/realTimePredictionService.js`** | Streaming predictions replaced by on-demand batch only | Low (acceptable trade-off) |
| **`configs/risk-thresholds.js`** | GH2 hardcodes thresholds in sync cron; not configurable per device | Medium (1-2 days) |
| **`middleware/subscription.js`** — plan feature enforcement | GH2 shows plan data but does not block features per plan tier | Medium (1-2 days) |
| **`middleware/cache.js`** | No server-side caching layer; react-query only | Low (optional) |
| **MQTT integration** | GH1 MQTT broker gives <1s actuator feedback; GH2 has only Firebase polling | High (3-5 days if needed) |
| **Device auto-registration** | GH2 requires manual device provisioning | Low (1 day) |
| **`services/limitWarningService.js`** | Usage limit warnings incomplete in GH2 | Low (1 day) |

---

## 🔴 Must Remain or Cannot Retire GH1 Yet

These items have no equivalent in GH2 and represent real user-facing functionality.

| Item | Reason | Risk Level | Effort to Migrate |
|------|--------|------------|-------------------|
| **`routes/dualProbeMonitoring.js`** | Dual probe sensor logic not in GH2 | Medium (if production devices use this) | Medium (2-3 days) |
| **`routes/products.js`** | Product catalogue not in GH2 | Low (may be unused) | Low |
| **`routes/quotes.js`** | Quote generation not in GH2 | Low (may be unused) | Low |
| **`models/Product.js` / `Quote.js`** | Supporting data models | Low | Low |
| **`services/pdfService.js`** | PDF reports still called from GH2 frontend_code | High (reports broken without this) | Medium |
| **Multi-language support** (6 languages) | GH1 supports ha/lg/fr/yo/ur/pt — GH2 English only | Medium (used by African farmers) | High (2-4 weeks) |
| **`components/chatbot-popup.tsx`** | In-app AI chatbot not in GH2 | Medium (user-facing feature) | High (1 week) |
| **`components/silo-visualization.tsx`** | Animated silo diagram not in GH2 | Low | Medium |
| **`components/advanced-search.tsx`** | Cross-module search not in GH2 | Low | Low |
| **ML training scripts** (`ensemble_train.py`, `enhanced_train.py`) | Model retraining not possible without these | High (model accuracy degrades over time) | Low (just copy) |
| **`ml/requirements.txt`** | GH2 cannot run Python ML without this | High (ML broken without Python env) | Low (just copy) |
| **`ml/barley/maize/wheat/sorghum` CSVs** | Multi-grain model training data | Medium (rice-only model in GH2) | Low (just copy) |
| **`/mobile` page** | Dedicated mobile interface | Low | Low |


---

# SUMMARY METRICS

## Migration Status by Layer

| Layer | Total GH1 Items | ✅ Migrated | 🟡 Partial | ❌ Missing | 🗑️ Deprecated |
|-------|----------------|------------|------------|-----------|---------------|
| Backend Routes | 37 | 32 | 1 | 3 | 1 |
| Backend Services | 20 | 16 | 3 | 1 | 1 |
| Backend Middleware | 13 | 12 | 1 | 0 | 1 |
| Backend Models | 29 | 27 | 0 | 2 | 0 |
| Backend Configs | 5 | 4 | 1 | 0 | 0 |
| Backend Utils | 2 | 2 | 0 | 0 | 0 |
| Backend Scripts | 17 | 0 | 0 | 0 | 17 |
| ML Layer | 20 | 9 | 5 | 5 | 0 |
| Firebase Layer | 5 | 4 | 0 | 0 | 0 |
| IoT / Hardware | 7 | 1 | 2 | 4 | 1 |
| Auth / Authz | 6 | 6 | 0 | 0 | 0 |
| Frontend Pages | 44 | 42 | 1 | 1 | 0 |
| Frontend Components | 22 | 14 | 1 | 7 | 0 |
| Frontend Hooks | 2 | 2 | 0 | 0 | 0 |
| Frontend Lib | 8 | 7 | 0 | 1 | 0 |
| i18n | 8 | 0 | 0 | 7 | 1 |
| Payments/Billing | 6 | 5 | 1 | 0 | 0 |
| Notifications | 6 | 6 | 0 | 0 | 0 |
| Background Jobs | 8 | 4 | 3 | 1 | 0 |
| **TOTALS** | **275** | **195 (71%)** | **19 (7%)** | **32 (12%)** | **22 (8%)** |

> Note: 7% partial + 2% deprecated = items that need decision. Core parity is 71% confirmed, 12% is genuinely absent.

---

## Estimated Remaining Work

### Critical path to retirement (must complete)

| Task | Effort |
|------|--------|
| Fix Firebase RTDB path mismatch (`/sensor_data` vs `/devices`) | 0.5 days |
| Copy ML training scripts + requirements.txt + grain CSVs | 0.5 days |
| Implement PDF report generation in GH2 | 3 days |
| Add 30-second data aggregation cron job | 1 day |
| Make risk thresholds configurable per device | 1.5 days |
| Add device auto-registration on first ping | 1 day |
| Enforce subscription plan feature gates per route | 2 days |
| Verify dual probe monitoring is in active use; migrate if so | 1 day |
| Migrate product/quote data if in active use | 1 day |
| **Total critical path** | **~11.5 days** |

### Non-blocking (can retire GH1 without these, address post-retirement)

| Task | Effort |
|------|--------|
| Multi-language support (6 languages) | 15-20 days |
| In-app AI chatbot | 5-7 days |
| Animated silo visualization | 2 days |
| MQTT integration (for <1s actuator response) | 4-5 days |
| Advanced cross-module search | 2 days |
| Server-side response caching | 1 day |
| Streaming ML predictions | 2 days |
| **Total nice-to-have** | **~32 days** |

---

## Overall Assessment

**GH2 is 71% migrated by item count.**  
**All high-value production paths are migrated or have acceptable alternatives.**  
**The 12% gap consists mostly of:**
1. ML training infrastructure (low operational risk, copy-only task)
2. PDF report generation (medium risk — blocked until implemented)
3. Multi-language support (high user impact for non-English farmers)
4. MQTT (acceptable given Firebase polling fallback)
5. Two possibly unused routes (products, quotes)

**Recommended retirement timeline**:
- **Week 1–2**: Complete the 11.5-day critical path  
- **Week 3**: Parallel production run — both systems live  
- **Week 4**: Cutover 100% of traffic to GH2  
- **Week 5**: Keep GH1 on standby (not serving traffic)  
- **Week 6**: Permanently retire GH1 if no incidents  
- **Post-retirement**: Address non-blocking items over next quarter

**Estimated engineering days until GH1 can be permanently deleted**: **~18 working days** from today (11.5 critical + 5 buffer + 1 week parallel validation)

