# GrainGuard Port — Status & Next Steps

## ✅ What's Done (Phases 1–6, mapped to your list)

### Phase 1–3: Foundation
- TanStack Start migration, Supabase wired, RLS + `has_role()`, `_authenticated` gate, role-based sidebar, `not-allowed` route.

### Phase 4: Core dashboard modules
| Module | Route | Server fns | Status |
|---|---|---|---|
| Role-based Dashboard (Manager/Admin/Technician/SuperAdmin) | `/dashboard` | `operations.functions.ts` | ✅ |
| Warehouses | `/warehouses` | ✅ | ✅ |
| Silos + thresholds | `/silos` | ✅ | ✅ |
| Grain Batches (intake→dispatch) | `/grain-batches` | ✅ | ✅ |
| Sensor Devices + Readings (historical) | `/sensors` | ✅ | ✅ |
| Actuators (fan/vent/heater) | `/actuators` | ✅ | ✅ |
| Grain Alerts | `/grain-alerts` | ✅ | ⚠️ Realtime subscription not yet wired |
| Buyers + Invoices + Payments | `/buyers`, `/revenue` | `billing.functions.ts` | ✅ |
| Subscriptions + Invoices | `/subscription`, `/plans` | ✅ | ✅ (Stripe pending) |

### Phase 5: Advanced modules
| Module | Route | Status |
|---|---|---|
| Analytics | `/analytics` | ✅ |
| AI Predictions / Spoilage | `/ai-predictions` | ⚠️ Mock data — no real model call |
| ML Models registry | `/ml-models` | ⚠️ Placeholder — no live model binding |
| Reports (CSV export) | `/reports` | ✅ |
| Environmental | `/environmental` | ✅ |
| Incidents | `/incidents` | ✅ |
| Maintenance | `/maintenance` | ✅ |
| Device Health | `/server-monitoring` | ✅ |
| Team Management | `/team-management` | ✅ |
| Notifications | `/notifications` | ✅ |
| Activity Logs | `/activity-logs` | ✅ |
| Traceability | `/traceability` | ✅ |
| Insurance | `/insurance` | ✅ |
| Settings / Profile | `/settings` | ✅ |
| Security Center | `/security-center` | ✅ admin+ |
| **Super-admin subtree** | `/platform`, `/platform/tenants`, `/platform/users`, `/platform/logs` | ✅ |

### Phase 6: Polish
- ✅ SEO metadata per route (head() titles + descriptions)
- ✅ Role-gated sidebar visibility
- ⏳ Public sitemap.xml — pending
- ⏳ i18n — deferred (optional)
- ⏳ Stripe — deferred (optional)
- ⏳ `/new` sub-routes for create-forms (currently dialogs) — pending
- ⏳ Chatbot — pending

---

## ⚠️ Known Gaps in Ported Code
1. **Realtime**: `grain_alerts` and `sensor_readings` need `supabase.channel().on('postgres_changes')` subscriptions in-page (currently poll or on-load only).
2. **Firebase**: Original app streamed live sensor data from Firebase RTDB — not yet integrated. Currently all reads hit Supabase historical tables.
3. **AI / ML pages** show structure but call no real inference — pure Supabase reads of past predictions.
4. **QR codes** on batches — UI hooks exist but generator not wired.
5. **Actuator control** — writes to `actuators` table but no MQTT/device push bridge.
6. **Create-form sub-routes** (`/incidents/new`, `/maintenance/new`, etc.) — use inline dialogs instead of dedicated routes.

---

## 🚀 Phase 7 — Real Integrations (proposed order)

### 7A. Realtime everywhere (1 batch)
Wire `supabase.channel()` in `useEffect` for: `grain_alerts`, `sensor_readings`, `notifications`, `incidents`. Enable Realtime publication in a migration.

### 7B. Firebase live sensor bridge (1 batch)
```text
Device → Firebase RTDB (live) ──┐
                                 ├─→ UI (Sensors, Silos, Environmental)
Supabase (historical/analytics) ─┘
```
- Add `firebase/app` + `firebase/database` client.
- New `useFirebaseSensor(deviceId)` hook — subscribes to `/devices/{id}/live`.
- Server fn `syncFirebaseToSupabase` (cron via `/api/public/cron/sync`) writes snapshots into `sensor_readings` every N min.
- Secrets needed: `VITE_FIREBASE_*` (publishable config is fine in client).

### 7C. Custom ML model integration (1–2 batches)
Two paths — pick one per model:

**Path A — Hosted inference (recommended for start)**
- Deploy your model (spoilage, quality, yield) to HuggingFace Inference / Replicate / your own FastAPI on Render.
- Add `predict.functions.ts` with `runSpoilagePrediction({ siloId })` — reads recent readings, POSTs to model endpoint, writes result to a new `ml_predictions` table.
- Secret: `ML_INFERENCE_URL`, `ML_INFERENCE_TOKEN`.

**Path B — Edge inference (Lovable AI Gateway)**
- Use `LOVABLE_API_KEY` + gateway for LLM-based reasoning over sensor summaries (natural-language insights, anomaly explanations).
- Combine with Path A for numerical models.

Wire `/ai-predictions` and `/ml-models` to real endpoints, add "Run prediction" buttons, show confidence + history.

### 7D. MCP server (1 batch — advanced)
Expose GrainGuard as an MCP server so Claude/other agents can query it:
- New server route `/api/public/mcp` (SSE).
- Tools: `get_silo_status`, `list_active_alerts`, `run_spoilage_prediction`, `get_batch_traceability`.
- Auth via bearer token per tenant.
- Secret: `MCP_TENANT_TOKEN_SALT`.

### 7E. Actuator device bridge (1 batch)
- MQTT broker (HiveMQ Cloud) or HTTP webhook to device gateway.
- Server fn `commandActuator({ id, action })` publishes to `commands/{deviceId}`.
- Device ACKs write back to `actuators.last_state`.

### 7F. Polish tail
- Public sitemap.xml route
- QR code generation (`qrcode` pkg) on batch detail
- Chatbot page using Lovable AI Gateway
- Stripe subscription checkout
- `/new` create-form sub-routes if you prefer routed forms over dialogs

---

## ✅ Phase 7 progress
- **7A** Realtime — DONE (grain_alerts, sensor_readings, notifications, incidents)
- **7B** Firebase live sensor bridge — DONE (service-account server bridge + cron)
- **7C-B** Lovable AI Gateway spoilage insight — DONE (`ai-insights.functions.ts`, wired into `/ai-predictions`)
- **7E** Actuator device bridge — DONE (Firebase RTDB `/devices/{id}/commands/{cmdId}` publish inside `controlActuator`)
- Environmental page ported to full OpenWeather (server proxy) + live silo microclimate
- Dashboards (Admin/Manager/Technician) now render real recent batches, alerts, team, actuators, silo occupancy from `getDashboardExtras`

## Remaining
- 7C Path A (hosted numeric ML endpoints) — needs `ML_INFERENCE_URL`
- 7D MCP server exposing GrainGuard tools
- Actuator device firmware must consume `/devices/{id}/commands` and write ACKs back
- Stripe checkout wiring, QR generation, chatbot page
