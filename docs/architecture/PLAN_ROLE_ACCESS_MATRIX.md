# GrainHero — Plan-Based Functionality & Role Access Matrix

> **Source**: Extracted directly from `configs/plan-features.js`, `configs/role-permissions.js`, `configs/plan-mapping.js`, `configs/enum.js`, and enforced across all routes via `middleware/permission.js`.

---

## Overview

GrainHero has **two intersecting access control systems** that work together:

1. **Subscription Plan** — determines what _features and resource limits_ are available to an entire tenant (admin + their team).
2. **User Role** — determines what _actions_ a specific user can perform within their tenant's plan.

A feature must be unlocked by the plan AND the role must have the corresponding permission for a user to access it.

---

## Part 1: Subscription Plans

There are **4 plans**. The internal keys and display names map as follows:

| Internal Key   | Display Name              | Price          | Billing |
| -------------- | ------------------------- | -------------- | ------- |
| `basic`        | **Starter**               | PKR 1,499 / mo | Monthly |
| `standard`     | **Professional**          | PKR 3,899 / mo | Monthly |
| `professional` | **Enterprise**            | PKR 5,999 / mo | Monthly |
| `enterprise`   | **Grain Enterprise Plus** | USD 799 / mo   | Monthly |

> At checkout, `basic` → Starter, `intermediate` → Professional, `pro` → Enterprise.

---

## Part 2: Resource Limits by Plan

| Resource                  | Starter | Professional | Enterprise | Grain Enterprise Plus |
| ------------------------- | ------- | ------------ | ---------- | --------------------- |
| **Total Users**           | 5       | 10           | Unlimited  | 250                   |
| — Managers                | 2       | 4            | Unlimited  | 50                    |
| — Technicians             | 3       | 6            | Unlimited  | 200                   |
| **Grain Batches**         | 50      | 200          | 1,000      | Unlimited             |
| **Sensors / IoT Devices** | 10      | 25           | 100        | 500                   |
| **Silos**                 | 3       | 6            | 15         | 100                   |
| **Warehouses**            | 1       | 2            | 5          | Unlimited             |
| **Storage**               | 1 GB    | 5 GB         | 20 GB      | 100 GB                |
| **API Calls / Month**     | 10,000  | 50,000       | 200,000    | Unlimited             |
| **Reports / Month**       | 5       | 25           | 100        | Unlimited             |

> `-1` in code means unlimited. Warehouse creation is plan-enforced at the route level: `planHelpers.isWithinLimits(user.subscription_plan, 'warehouses', currentWarehouses + 1)`.

---

## Part 3: Feature Access by Plan

| Feature              | Starter | Professional | Enterprise | Grain Enterprise Plus |
| -------------------- | :-----: | :----------: | :--------: | :-------------------: |
| Grain Management     |   ✅    |      ✅      |     ✅     |          ✅           |
| Basic Analytics      |   ✅    |      ✅      |     ✅     |          ✅           |
| Sensor Monitoring    |   ✅    |      ✅      |     ✅     |          ✅           |
| Basic Reports        |   ✅    |      ✅      |     ✅     |          ✅           |
| Email Support        |   ✅    |      ✅      |     ✅     |          ✅           |
| Mobile App           |   ❌    |      ✅      |     ✅     |          ✅           |
| Advanced Analytics   |   ❌    |      ✅      |     ✅     |          ✅           |
| API Access           |   ❌    |      ✅      |     ✅     |          ✅           |
| AI Predictions       |   ❌    |      ❌      |     ✅     |          ✅           |
| Priority Support     |   ❌    |      ❌      |     ✅     |          ✅           |
| Custom Integrations  |   ❌    |      ❌      |     ✅     |          ✅           |
| Insurance Management |   ❌    |      ❌      |     ❌     |          ✅           |
| Payment Management   |   ❌    |      ❌      |     ❌     |          ✅           |
| White Label          |   ❌    |      ❌      |     ❌     |          ✅           |

---

## Part 4: User Roles

There are **5 roles** in the system:

| Role          | Scope         | Description                                                                             |
| ------------- | ------------- | --------------------------------------------------------------------------------------- |
| `super_admin` | Platform-wide | GrainHero staff. Sees all tenants, manages plans, revenue, global analytics.            |
| `admin`       | Tenant        | The account owner. Bought the plan. Manages their team, warehouses, and all operations. |
| `manager`     | Warehouse     | Manages operations within one assigned warehouse.                                       |
| `technician`  | Silo/Field    | Field worker. Manages sensors, IoT, maintenance, and field inspections.                 |
| `pending`     | None          | Invited user awaiting activation. No permissions until role is assigned.                |

**Hierarchy**: `super_admin` → `admin` → `manager` → `technician`  
Higher roles inherit all permissions of lower roles.

---

## Part 5: Role Permissions — Full Breakdown

### 🔐 Super Admin

Full access to everything on the platform. No plan restrictions.

| Category        | Permissions                                              |
| --------------- | -------------------------------------------------------- |
| System          | `system.manage`, `system.monitor`, `system.configure`    |
| Plan Management | `plan.create`, `plan.read`, `plan.update`, `plan.delete` |
| User Management | `user.create/read/update/delete/manage` (all tenants)    |
| Revenue         | `revenue.read`, `revenue.manage`                         |
| Analytics       | `analytics.global`, `analytics.read`                     |
| Security        | `security.manage`, `security.audit`                      |
| All Roles       | Inherits `admin.all`, `manager.all`, `technician.all`    |

---

### 👤 Admin (Tenant Owner)

Manages everything within their own tenant. Access gated by their subscription plan.

| Category       | Permissions                                                            |
| -------------- | ---------------------------------------------------------------------- |
| Tenant & Team  | `tenant.manage`, `users.manage`, `user.create/read/update/delete.team` |
| Plan           | `plan.read.own`, `plan.manage.own`                                     |
| Warehouses     | `warehouse.manage/create/update/delete/view/read`                      |
| Grain Batches  | `batch.manage/create/update/delete/view/dispatch`                      |
| Silos          | `silo.manage/create/update/delete/view/configure`                      |
| Sensors & IoT  | `sensor.manage/bulk_ingest/configure/create/read/update/delete`        |
| Actuators      | `actuator.control/autoFanOn.enable/create/read/update/delete/manage`   |
| Buyers         | `buyers.manage/buyer.create/read/update/delete/manage`                 |
| AI & Analytics | `ai.enable/configure/predictions`, `analytics.read/admin`              |
| Advisories     | `advisories.create/manage`                                             |
| Alerts         | `alerts.view/manage`                                                   |
| Insurance      | `insurance.view/manage/create/read/update/delete`                      |
| Payments       | `payment.manage/create/read/update/delete`                             |
| Reports        | `reports.generate/view/create/read/update/delete`, `pdf.generate`      |
| Settings       | `settings.read/update`                                                 |
| System         | `thresholds.configure`, `system.override`, `notifications.manage`      |

---

### 🗂️ Manager (Warehouse Manager)

Scoped to their assigned warehouse. Cannot manage other managers or access global settings.

| Category            | Permissions                                                |
| ------------------- | ---------------------------------------------------------- |
| Warehouse           | `warehouse.view/read`                                      |
| Grain Batches       | `batch.view/manage/create/dispatch`, `traceability.manage` |
| Silos               | `silo.view/monitor`                                        |
| Team (Technicians)  | `technician.view/assign/read`                              |
| Quality             | `quality.assess/read/update`                               |
| Sensors             | `sensor.view/monitor/bulk_ingest/read`                     |
| Actuators           | `actuator.control/read`                                    |
| Alerts & Advisories | `alerts.view/acknowledge`, `advisories.view/create`        |
| Maintenance         | `maintenance.view/create`                                  |
| Incidents           | `incidents.view/create`                                    |
| Buyers              | `buyers.view/manage/buyer.read/update`                     |
| Insurance           | `insurance.view/create`                                    |
| Payments            | `payment.view`                                             |
| Reports             | `reports.view/generate`, `pdf.generate`                    |
| Analytics           | `analytics.view/read`                                      |
| Dispatch            | `dispatch.create/read/update`                              |
| Thresholds          | `thresholds.view` (view only)                              |

---

### 🔧 Technician (Field Worker)

Scoped to their assigned silos. Focused on IoT, maintenance, and field inspections.

| Category      | Permissions                                                            |
| ------------- | ---------------------------------------------------------------------- |
| Warehouse     | `warehouse.view/read`                                                  |
| Sensors       | `sensor.view/calibrate/maintain/bulk_ingest`                           |
| Actuators     | `actuator.control/maintain`                                            |
| Silos         | `silo.inspect/maintain/view`                                           |
| Monitoring    | `alerts.view/acknowledge`, `environmental.monitor`, `iot.troubleshoot` |
| Batches       | `batch.view`                                                           |
| Maintenance   | `maintenance.view/create`                                              |
| Incidents     | `incidents.view/create`                                                |
| Mobile        | `mobile.access`, `field.inspect`                                       |
| Notifications | `notifications.view`                                                   |
| Analytics     | `analytics.view`                                                       |
| Profile       | `user.read/update`                                                     |

---

## Part 6: Combined Matrix — What Each Role Can Do on Each Plan

The table below shows whether a capability is available to a role **AND** is within the plan's feature set.

Legend: ✅ Available | ❌ Not available | 🔒 Plan-gated | ⚠️ Limited

| Capability                   | super_admin | admin (Starter) | admin (Professional) | admin (Enterprise) | admin (GEP)  |     manager      | technician |
| ---------------------------- | :---------: | :-------------: | :------------------: | :----------------: | :----------: | :--------------: | :--------: |
| **Authentication & Profile** |             |                 |                      |                    |              |                  |            |
| Login / Logout               |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Update own profile           |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| **User Management**          |             |                 |                      |                    |              |                  |            |
| Create/invite team members   |     ✅      |    ⚠️ Max 5     |      ⚠️ Max 10       |    ⚠️ Unlimited    |  ⚠️ Max 250  | Technicians only |     ❌     |
| Delete/block users           |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| View all platform users      |     ✅      |       ❌        |          ❌          |         ❌         |      ❌      |        ❌        |     ❌     |
| **Warehouse Management**     |             |                 |                      |                    |              |                  |            |
| Create warehouses            |     ✅      |    ⚠️ Max 1     |       ⚠️ Max 2       |      ⚠️ Max 5      | ✅ Unlimited |        ❌        |     ❌     |
| Update/delete warehouses     |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| View warehouses              |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |      ✅ Own      |   ✅ Own   |
| **Silo Management**          |             |                 |                      |                    |              |                  |            |
| Create/configure silos       |     ✅      |    ⚠️ Max 3     |       ⚠️ Max 6       |     ⚠️ Max 15      |  ⚠️ Max 100  |        ❌        |     ❌     |
| Update/delete silos          |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| Monitor silo conditions      |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Inspect/maintain silos       |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ✅     |
| **Grain Batch Management**   |             |                 |                      |                    |              |                  |            |
| Create grain batches         |     ✅      |    ⚠️ Max 50    |      ⚠️ Max 200      |    ⚠️ Max 1,000    | ✅ Unlimited |        ✅        |     ❌     |
| Update batches               |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| Delete batches               |     ✅      |  🔒 Standard+   |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| Dispatch batches             |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| View batches                 |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| **Sensor & IoT**             |             |                 |                      |                    |              |                  |            |
| Add/create sensors           |     ✅      |    ⚠️ Max 10    |      ⚠️ Max 25       |     ⚠️ Max 100     |  ⚠️ Max 500  |        ❌        |     ❌     |
| Update/delete sensors        |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| View sensor readings         |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Calibrate sensors            |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ✅     |
| Bulk ingest sensor data      |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| View live telemetry          |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| **Actuator Control**         |             |                 |                      |                    |              |                  |            |
| Manual actuator control      |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Enable auto fan control (AI) |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| Configure thresholds         |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |    View only     |     ❌     |
| **Analytics**                |             |                 |                      |                    |              |                  |            |
| Basic analytics              |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Advanced analytics           |     ✅      |       ❌        |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| Global platform analytics    |     ✅      |       ❌        |          ❌          |         ❌         |      ❌      |        ❌        |     ❌     |
| **AI & Predictions**         |             |                 |                      |                    |              |                  |            |
| AI spoilage predictions      |     ✅      |       ❌        |          ❌          |         ✅         |      ✅      |        ❌        |     ❌     |
| Risk assessment              |     ✅      |       ❌        |          ❌          |         ✅         |      ✅      |        ❌        |     ❌     |
| AI advisory generation       |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| View AI advisories           |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| **Alerts & Notifications**   |             |                 |                      |                    |              |                  |            |
| View alerts                  |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Acknowledge alerts           |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Manage/delete alerts         |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| Manage notification settings |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        | View only  |
| **Reports**                  |             |                 |                      |                    |              |                  |            |
| View reports                 |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| Generate / create reports    |     ✅      |   ⚠️ Max 5/mo   |     ⚠️ Max 25/mo     |   ⚠️ Max 100/mo    | ✅ Unlimited |        ✅        |     ❌     |
| Delete reports               |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| PDF export                   |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| **Buyer Management**         |             |                 |                      |                    |              |                  |            |
| Create buyers                |     ✅      |     🔒 Pro+     |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| Update buyers                |     ✅      |     🔒 Pro+     |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| Delete buyers                |     ✅      |     🔒 Pro+     |       🔒 Pro+        |         ✅         |      ✅      |        ❌        |     ❌     |
| View buyers                  |     ✅      |       ❌        |          ✅          |         ✅         |      ✅      |        ✅        |     ❌     |
| **Insurance**                |             |                 |                      |                    |              |                  |            |
| View insurance               |     ✅      |       ❌        |          ❌          |         ❌         |      ✅      |      ✅ Own      |     ❌     |
| Create/manage insurance      |     ✅      |       ❌        |          ❌          |         ❌         |      ✅      |    ✅ Create     |     ❌     |
| Insurance claims             |     ✅      |       ❌        |          ❌          |         ❌         |      ✅      |        ✅        |     ❌     |
| **Payments**                 |             |                 |                      |                    |              |                  |            |
| View payments                |     ✅      |       ❌        |          ❌          |         ❌         |      ✅      |        ✅        |     ❌     |
| Create/manage payments       |     ✅      |       ❌        |          ❌          |         ❌         |      ✅      |        ❌        |     ❌     |
| **Subscription Management**  |             |                 |                      |                    |              |                  |            |
| View own plan                |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| Upgrade/change plan          |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| Manage all plans (platform)  |     ✅      |       ❌        |          ❌          |         ❌         |      ❌      |        ❌        |     ❌     |
| **Settings**                 |             |                 |                      |                    |              |                  |            |
| View settings                |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| Update settings              |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| System override              |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| **Mobile App**               |             |                 |                      |                    |              |                  |            |
| Mobile access                |     ✅      |       ❌        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Field inspect                |     ✅      |       ❌        |          ✅          |         ✅         |      ✅      |        ❌        |     ✅     |
| **Maintenance & Incidents**  |             |                 |                      |                    |              |                  |            |
| View maintenance logs        |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Create maintenance records   |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| View incidents               |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| Create incidents             |     ✅      |       ✅        |          ✅          |         ✅         |      ✅      |        ✅        |     ✅     |
| **API Access**               |             |                 |                      |                    |              |                  |            |
| API integration              |     ✅      |       ❌        |          ✅          |         ✅         |      ✅      |        ❌        |     ❌     |
| Custom integrations          |     ✅      |       ❌        |          ❌          |         ✅         |      ✅      |        ❌        |     ❌     |
| White label                  |     ✅      |       ❌        |          ❌          |         ❌         |      ✅      |        ❌        |     ❌     |

---

## Part 7: Permission Tokens Reference

These are the exact permission strings checked by `requirePermission()` in route middleware.

### Grain / Batch

| Token            | Description                           |
| ---------------- | ------------------------------------- |
| `grain.read`     | View grain records                    |
| `grain.create`   | Create grain entries                  |
| `grain.update`   | Modify grain records                  |
| `grain.delete`   | Remove grain records (Standard+)      |
| `grain.manage`   | Full grain management (Professional+) |
| `batch.view`     | View batches                          |
| `batch.create`   | Create new batches                    |
| `batch.update`   | Edit batch details                    |
| `batch.delete`   | Delete batches                        |
| `batch.dispatch` | Dispatch batches to buyers            |
| `batch.manage`   | Full batch management                 |

### Silo / Warehouse

| Token                 | Description                   |
| --------------------- | ----------------------------- |
| `silo.read/view`      | View silo data                |
| `silo.create`         | Create silos                  |
| `silo.update`         | Edit silo settings            |
| `silo.delete`         | Delete silos                  |
| `silo.configure`      | Configure silo thresholds     |
| `silo.manage`         | Full silo access              |
| `silo.inspect`        | Field inspection (Technician) |
| `silo.maintain`       | Maintenance operations        |
| `silo.monitor`        | Monitor conditions            |
| `warehouse.view/read` | View warehouse                |
| `warehouse.create`    | Create warehouses             |
| `warehouse.update`    | Edit warehouses               |
| `warehouse.delete`    | Delete warehouses             |
| `warehouse.manage`    | Full warehouse access         |

### Sensor / IoT / Actuator

| Token                       | Description                        |
| --------------------------- | ---------------------------------- |
| `sensor.view`               | View sensor data                   |
| `sensor.monitor`            | Monitor live readings              |
| `sensor.create`             | Register new sensors               |
| `sensor.update`             | Edit sensor config                 |
| `sensor.delete`             | Remove sensors                     |
| `sensor.manage`             | Full sensor access                 |
| `sensor.calibrate`          | Calibrate sensors (Technician)     |
| `sensor.maintain`           | Sensor maintenance                 |
| `sensor.bulk_ingest`        | Bulk data ingestion                |
| `actuator.control`          | Control actuators (fan/vent/alarm) |
| `actuator.maintain`         | Actuator maintenance               |
| `actuator.autoFanOn.enable` | Enable AI-controlled auto fan      |

### AI / Analytics

| Token                | Description                          |
| -------------------- | ------------------------------------ |
| `ai.enable`          | Trigger AI predictions               |
| `ai.configure`       | Configure AI settings                |
| `ai.predictions`     | Access AI prediction results         |
| `analytics.read`     | View analytics                       |
| `analytics.advanced` | Advanced analytics (Standard+)       |
| `analytics.ai`       | AI-powered analytics (Professional+) |
| `analytics.view`     | Basic analytics view                 |
| `risk.assessment`    | Risk score analysis                  |
| `spoilage.analysis`  | Spoilage analysis                    |

### Reports / Alerts

| Token                  | Description                     |
| ---------------------- | ------------------------------- |
| `reports.view`         | View reports                    |
| `reports.generate`     | Create reports                  |
| `reports.create.basic` | Basic report creation (Starter) |
| `reports.create`       | Full report creation            |
| `reports.update`       | Edit reports                    |
| `reports.delete`       | Delete reports                  |
| `pdf.generate`         | Export to PDF                   |
| `alerts.view`          | View alerts                     |
| `alerts.manage`        | Manage and dismiss alerts       |
| `alerts.acknowledge`   | Acknowledge an alert            |

### Buyers / Insurance / Payments

| Token                                    | Description              |
| ---------------------------------------- | ------------------------ |
| `buyers.view/manage`                     | Buyer management         |
| `buyer.create/read/update/delete/manage` | Buyer CRUD               |
| `insurance.view/create/manage`           | Insurance operations     |
| `insurance.delete`                       | Remove insurance records |
| `payment.view/manage/create`             | Payment operations       |

### System / Admin

| Token                      | Description                  |
| -------------------------- | ---------------------------- |
| `tenant.manage`            | Manage own tenant            |
| `users.manage`             | User management              |
| `thresholds.configure`     | Set sensor thresholds        |
| `thresholds.view`          | View thresholds              |
| `system.override`          | System overrides             |
| `notifications.manage`     | Manage notification settings |
| `advisories.create/manage` | Advisory creation            |

---

## Part 8: Risk Threshold Levels

AI predictions and sensor alerts use these risk score thresholds consistently across the entire platform:

| Risk Level   | Score Range | Color       | Action Required            | Fan Triggered |
| ------------ | ----------- | ----------- | -------------------------- | ------------- |
| **Low**      | 0 – 30      | 🟢 Green    | No                         | No            |
| **Medium**   | 30 – 60     | 🟡 Amber    | Advisory recommended       | No            |
| **High**     | 60 – 80     | 🔴 Red      | Immediate action           | Yes           |
| **Critical** | 80 – 100    | 🔴 Dark Red | Emergency response + Alarm | Yes           |

### Grain-Specific Moisture Thresholds

| Grain | Safe Moisture | Risk Moisture | Critical Moisture | Critical Humidity |
| ----- | :-----------: | :-----------: | :---------------: | :---------------: |
| Rice  |     < 12%     |     < 14%     |       ≥ 15%       |       ≥ 75%       |
| Wheat |     < 13%     |     < 15%     |       ≥ 16%       |       ≥ 80%       |
| Corn  |     < 14%     |     < 16%     |       ≥ 17%       |       ≥ 85%       |

---

## Part 9: Plan Upgrade Path

```
Starter  →  Professional  →  Enterprise  →  Grain Enterprise Plus
PKR 1,499     PKR 3,899         PKR 5,999         USD 799

Key unlock at each upgrade:
Starter → Professional:    Mobile App, Advanced Analytics, API Access
Professional → Enterprise: AI Predictions, Custom Integrations, Priority Support
Enterprise → GEP:          Insurance, Payments, White Label, Unlimited resources
```

---

## Part 10: What Each Role Sees on Login

### Super Admin Dashboard

- Global platform revenue, MRR, subscription counts
- All tenants list with plan status
- User management across all tenants
- System health, server monitoring, security logs
- Plan management and pricing control

### Admin Dashboard

- Own tenant summary: silo count, batch count, sensor count, active alerts
- Team member list and invitation management
- Subscription status and usage percentage
- Upgrade suggestions when approaching limits
- Full access to all modules within their plan tier

### Manager Dashboard

- Warehouse-specific overview
- Active grain batches in their warehouse
- Sensor alerts for their assigned silos
- Technician assignment and task tracking
- Dispatch and buyer management
- Insurance and maintenance logs

### Technician Dashboard

- Live IoT sensor readings for assigned silos
- Active alerts requiring acknowledgment
- Maintenance and inspection tasks
- Actuator control panel
- Mobile field inspection tools
