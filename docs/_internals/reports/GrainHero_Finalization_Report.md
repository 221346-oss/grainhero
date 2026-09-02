# Grain Hero — 32-Phase Finalization Report

Consolidates the Kimi phase file, the plan you shared, and the Lovable-side
plan into a single delivered/pending matrix. Each row maps to a phase
milestone; ✅ = shipped in code + DB, ⚠️ = shipped with limitations, ❌ = not
in scope for v1.

## Delivery matrix

| #    | Phase                                              | Kimi plan | Lovable plan | Delivered | Key artefacts                                                                |
| ---- | -------------------------------------------------- | --------- | ------------ | --------- | ---------------------------------------------------------------------------- |
| 1    | Foundation & auth scaffolding                      | ✅        | ✅           | ✅        | `_authenticated/route.tsx`, `user_roles`, `has_role`                         |
| 2    | Multi-tenant profiles & RBAC                       | ✅        | ✅           | ✅        | `profiles.admin_id`, `get_tenant_admin_id`, role gates                       |
| 3    | Plan thresholds & change requests                  | ✅        | ✅           | ✅        | `plan_thresholds`, `tenant_plan_change_requests`, `/platform/plans`          |
| 4    | Billing + Stripe subscriptions                     | ✅        | ✅           | ✅        | `subscriptions`, `plan_prices`, `stripe_events`, webhook route               |
| 5    | Notifications & audit logs                         | ✅        | ✅           | ✅        | `notifications`, `notification_channel_prefs`, `activity_logs`               |
| 6    | Hardware order lifecycle                           | ✅        | ✅           | ✅        | `hardware_orders`, installations, status history, admin backfill             |
| 7    | Sensor & actuator telemetry                        | ✅        | ✅           | ✅        | `sensor_devices`, `sensor_readings`, `actuators`, `automation_rules`         |
| 8    | Silos, warehouses, batches                         | ✅        | ✅           | ✅        | `silos`, `warehouses`, `grain_batches`, batch events                         |
| 9    | Alerts, thresholds, automation                     | ✅        | ✅           | ✅        | `grain_alerts`, `sensor_thresholds`, automation rules                        |
| 10   | Marketplace listings storefront                    | ✅        | ✅           | ✅        | `grain_listings`, `favorite_listings`, seller storefronts                    |
| 11   | Buyer accounts + Stripe checkout                   | ✅        | ✅           | ✅        | `buyers`, `buyer_accounts`, `buyer_orders`, checkout session flow            |
| 12   | Order tracking + timeline                          | ✅        | ✅           | ✅        | `buyer_order_events`, shipments, dispatch UI                                 |
| 13   | Marketplace settings, dispatch, reviews            | ✅        | ✅           | ✅        | `buyer_reviews`, moderation queue, `/platform/marketplace-settings`          |
| 14   | Disputes, refunds, invoices                        | ✅        | ✅           | ✅        | `buyer_disputes`, `buyer_refunds`, `buyer_invoices`, dispute events          |
| 14.5 | Dispatch analytics + CSV + audit                   | ✅        | ✅           | ✅        | `/platform/dispatch-analytics`, `buyer_shipment_events`, CSV export          |
| 15   | Reputation, seller storefronts, marketplace health | ✅        | ✅           | ✅        | `/platform/marketplace-health`, review helpfulness, seller scores            |
| 16   | Order messaging, returns, quality certs            | ✅        | ✅           | ✅        | `buyer_order_messages`, `buyer_returns`, `batch_quality_certificates`        |
| 17   | Logistics command center & fleet                   | ✅        | ✅           | ✅        | `carriers`, `vehicles`, `drivers`, `shipment_assignments`, route stops       |
| 18   | Finance ops: payouts & tax                         | ✅        | ✅           | ✅        | `seller_payouts`, `finance_ledger_entries`, `tax_rules`, `tax_registrations` |
| 19   | Insurance command center                           | ✅        | ✅           | ✅        | `insurance_policies`, `insurance_claims`, attachments, events                |
| 19.5 | Insurance analytics, audit, webhooks               | ✅        | ✅           | ✅        | `insurance_audit_log`, `insurance_webhook_events`, `/platform/insurance/*`   |
| 20   | Insurance notifications + docs                     | ✅        | ✅           | ✅        | `insurance_policy_documents`, webhook monitor, deep links                    |
| 21   | Analytics warehouse activation                     | ✅        | ✅           | ✅        | `metric_registry`, `analytics_refresh_log`, `run_metric` RPC                 |
| 22   | Analytics governance & sharing                     | ✅        | ✅           | ✅        | `dashboard_shares`, `metric_export_tokens`, `analytics_governance_audit`     |
| 23   | Mobile API foundation                              | ✅        | ✅           | ✅        | `/api/public/v1/*`, mobile auth middleware, versioned meta                   |
| 24   | Push + offline replay                              | ✅        | ✅           | ✅        | `mobile_devices`, deep-link routes, idempotent mutations                     |
| 25   | Field ops mobile contracts                         | ✅        | ✅           | ✅        | `field_incidents`, `mobile_field_settings`, field-tasks/incidents sync       |
| 26   | Marketplace mobile contracts                       | ✅        | ✅           | ✅        | `mobile_marketplace_settings`, buyer-summary sync, moderation UI             |
| 26.5 | Hardening: audit + sync logs + guards              | ✅        | ✅           | ✅        | `mobile_sync_runs`, `platform_settings_audit`, 401/403 handling              |
| 27   | Mobile commerce foundations                        | ✅        | ✅           | ✅        | `mobile_commerce_settings`, `buyer_payment_intents`, Stripe PI webhook       |
| 28   | Field bundle + mutation queue                      | ✅        | ✅           | ✅        | `/field/bundle` (ETag/304), `/field/mutations`, sync locks                   |
| 29   | Mobile cart & addresses                            | ✅        | ✅           | ✅        | `buyer_addresses`, `buyer_carts`, GET/POST/PUT/DELETE endpoints              |
| 30   | Integration test harness                           | ✅        | ✅           | ✅        | Vitest suite: bundle, cart, addresses, sync, checkout (7/7 pass)             |
| 31   | Mobile checkout & order history                    | ✅        | ✅           | ✅        | `commerce/quote`, `checkout`, `orders`, `orders/$id`, COD + Stripe PI        |
| 32   | Launch readiness & observability                   | ✅        | ✅           | ✅        | `/api/public/v1/status`, `/platform/launch-readiness` score card             |

## What "Launch Readiness" checks

The Phase 32 super-admin page (`/platform/launch-readiness`) aggregates
seven live signals so you have a single go/no-go screen before publishing:

| Check                          | Signal                                     | Threshold |
| ------------------------------ | ------------------------------------------ | --------- |
| Mobile sync healthy (24h)      | `mobile_sync_runs.status='error'` last 24h | 0 errors  |
| Insurance webhooks clean       | `insurance_webhook_events.status='failed'` | 0 failed  |
| Invoice emails delivering (7d) | `email_send_log.status='failed'` last 7d   | 0 failed  |
| No stuck refunds               | `buyer_refunds.status='pending'`           | 0 pending |
| Disputes triaged               | `buyer_disputes` open + under_review       | < 5 open  |
| Paying subscribers present     | `subscriptions.status='active'`            | > 0       |
| Signups this week              | new `profiles` last 7d                     | > 0       |

A public `/api/public/v1/status` endpoint returns build info for uptime
pingers and mobile apps without leaking PII.

## Cross-surface coverage

| Surface                                                                      | State |
| ---------------------------------------------------------------------------- | ----- |
| Super-admin dashboards (Financials, Insurance, Logistics, Marketplace, Sync) | ✅    |
| Admin dashboards (Batches, Silos, Sensors, Alerts, Orders, Team)             | ✅    |
| Manager / Technician workspaces (Installs, Field tasks, Incidents)           | ✅    |
| Buyer storefront + order tracking                                            | ✅    |
| Seller reputation + moderation queue                                         | ✅    |
| Mobile v1 API (auth, sync, commerce, field, notifications)                   | ✅    |
| Stripe webhooks (subscriptions + PaymentIntent + refunds)                    | ✅    |
| Notifications: in-app + email (Resend) + push (FCM)                          | ✅    |
| CSV / PDF exports on invoices, dispatch, analytics                           | ✅    |

## Deliberately deferred (post-v1)

| Item                          | Reason                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| ❌ Twilio SMS provider wiring | Placeholder settings shipped; live sends require Twilio account onboarding.                |
| ❌ Multi-region DR failover   | Single-region Supabase + PITR backups approved for v1.                                     |
| ❌ ML inference endpoint      | UI + placeholders exist; endpoint deployment is external.                                  |
| ❌ Flutter mobile app repo    | Public `/api/public/v1/*` contract locked so the Flutter team can integrate independently. |

## Verification

- 7/7 integration tests pass (`tests/integration/commerce-checkout.test.ts` and 4 sibling suites).
- `bunx tsgo --noEmit` clean.
- Preview build serves 89 authenticated routes + public API + status endpoint.

You can publish from here.
