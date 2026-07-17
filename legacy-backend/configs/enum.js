// configs/enum.js

const ENVIRONMENTS = {
  PRODUCTION: "production",
  DEVELOPMENT: "development",
};

const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  TECHNICIAN: "technician", // Changed from assistant to technician
  PENDING: "pending", // For invitation system
};

const USER_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
};

const GRAIN_TYPES = {
  WHEAT: "Wheat",
  RICE: "Rice",
  MAIZE: "Maize",
  CORN: "Corn",
  BARLEY: "Barley",
  SORGHUM: "Sorghum",
};

// Dataset spoileage labels for supervised data and human tagging
const SPOILAGE_LABELS = {
  SAFE: "Safe",
  SPOILED: "Spoiled",
  RISKY: "Risky",
};

const GEO_JSON_TYPES = {
  POINT: "Point",
  LINESTRING: "LineString",
  POLYGON: "Polygon",
  MULTIPOINT: "MultiPoint",
  MULTILINESTRING: "MultiLineString",
  MULTIPOLYGON: "MultiPolygon",
};

const DEVICE_STATUSES = {
  ACTIVE: "active",
  OFFLINE: "offline",
  ERROR: "error",
  MAINTENANCE: "maintenance",
};

const POWER_SOURCE = {
  SOLAR: "solar",
  BATTERY: "battery",
  DIRECT: "direct",
  HYBRID: "hybrid",
};

const NOTIFICATION_STATUSES = {
  UNREAD: "unread",
  READ: "read",
};

const NOTIFICATION_TYPES = {
  ALERT: "alert",
  ADVISORY: "advisory",
  INSURANCE: "insurance",
  SYSTEM: "system",
};

// Where a notification points to
const NOTIFICATION_RELATED_TO = {
  ALERT: "alert",
  ADVISORY: "advisory",
  INSURANCE: "insurance",
  BATCH: "batch",
  SENSOR: "sensor",
};

const ALERT_TYPES = {
  SMS: "SMS",
  VOICE: "voice",
  IN_APP: "in-app",
  EMAIL: "email",
  PUSH: "push",
};

const ALERT_ESCALATION_LEVELS = {
  NONE: "none",
  TECHNICIAN: "technician",
  MANAGER: "manager",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

// Alert priorities (used by alerts)
const ALERT_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

// Escalation status history (used by alert-escalation records)
const ALERT_ESCALATION_STATUSES = {
  PENDING: "pending",
  ACKNOWLEDGED: "acknowledged",
  RESOLVED: "resolved",
  ESCALATED: "escalated",
};

// Grain batch statuses
const BATCH_STATUSES = {
  STORED: "stored",
  DISPATCHED: "dispatched",
  SOLD: "sold",
  DAMAGED: "damaged",
  EXPIRED: "expired",
  ON_HOLD: "on_hold",
  PROCESSING: "processing",
};

// Advisory enums
const ADVISORY_SEVERITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

const ADVISORY_SOURCES = {
  AI: "AI",
  RULE: "Rule",
  MANUAL: "Manual",
  SYSTEM: "System",
  IOT: "IoT",
};

const ADVISORY_ORIGINS = {
  RISK_SCORE: "risk_score",
  AI: "ai",
  MANUAL: "manual",
  SYSTEM: "system",
  SENSOR_THRESHOLD: "sensor_threshold",
};

// Sensor types for IoT integration
const SENSOR_TYPES = {
  TEMPERATURE: "temperature",
  HUMIDITY: "humidity",
  CO2: "co2",
  VOC: "voc",
  MOISTURE: "moisture",
  LIGHT: "light",
  PRESSURE: "pressure",
  PH: "ph",
};

// Actuator types for IoT control
const ACTUATOR_TYPES = {
  FAN: "fan",
  VENT: "vent",
  HEATER: "heater",
  COOLER: "cooler",
  ALARM: "alarm",
  LIGHT: "light",
};

// Actuator actions
const ACTUATOR_ACTIONS = {
  FAN_ON: "FAN_ON",
  FAN_OFF: "FAN_OFF",
  VENT_OPEN: "VENT_OPEN",
  VENT_CLOSE: "VENT_CLOSE",
  ALARM_TRIGGERED: "ALARM_TRIGGERED",
  ALARM_RESET: "ALARM_RESET",
  HEATER_ON: "HEATER_ON",
  HEATER_OFF: "HEATER_OFF",
};

const ACTUATOR_TRIGGERED_BY = {
  AI: "AI",
  MANUAL: "Manual",
  SCHEDULED: "Scheduled",
  SYSTEM: "System",
  THRESHOLD: "Threshold",
};

const ACTUATOR_TRIGGER_TYPES = {
  THRESHOLD: "threshold",
  RISK_SCORE: "risk_score",
  MANUAL: "manual",
  CRON_JOB: "cron_job",
  AI_PREDICTION: "ai_prediction",
};

// Payment and billing
const PAYMENT_METHODS = {
  BANK_TRANSFER: "bank_transfer",
  MANUAL_CASH: "manual_cash",
  CHEQUE: "cheque",
  STRIPE: "stripe",
  MOBILE_MONEY: "mobile_money",
};

const BUYER_TYPES = {
  LOCAL_MILL: "local_mill",
  EXPORTER: "exporter",
  WHOLESALER: "wholesaler",
  RETAILER: "retailer",
  GOVERNMENT: "government",
};

const BUYER_STATUSES = {
  ACTIVE: "active",
  PAUSED: "paused",
  INACTIVE: "inactive",
};

const CLAIM_STATUSES = {
  PENDING: "pending",
  UNDER_REVIEW: "under_review",
  FLAGGED: "flagged",
  APPROVED: "approved",
  REJECTED: "rejected",
  PROCESSING: "processing",
};

const REPORT_TYPES = {
  ADVISORY: "advisory",
  INSURANCE: "insurance",
  INVOICE: "invoice",
  SENSOR_DATA: "sensor_data",
  BATCH_SUMMARY: "batch_summary",
};

// Feature flags and subscription enums
const BILLING_CYCLES = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
  QUARTERLY: "quarterly",
};

const PAYMENT_STATUSES = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
};

const SUBSCRIPTION_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  TRIAL: "trial",
};

const FEATURE_CATEGORIES = {
  CORE: "core",
  PREMIUM: "premium",
  ENTERPRISE: "enterprise",
  EXPERIMENTAL: "experimental",
  DEPRECATED: "deprecated",
};

const FEATURE_TYPES = {
  BOOLEAN: "boolean",
  NUMBER: "number",
  STRING: "string",
  JSON: "json",
};

module.exports = {
  ENVIRONMENTS,
  USER_ROLES,
  USER_STATUSES,
  GRAIN_TYPES,
  SPOILAGE_LABELS,
  GEO_JSON_TYPES,
  DEVICE_STATUSES,
  POWER_SOURCE,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  NOTIFICATION_RELATED_TO,
  ALERT_TYPES,
  ALERT_ESCALATION_LEVELS,
  ALERT_PRIORITIES,
  ALERT_ESCALATION_STATUSES,
  BATCH_STATUSES,
  ADVISORY_SEVERITIES,
  ADVISORY_SOURCES,
  ADVISORY_ORIGINS,
  SENSOR_TYPES,
  ACTUATOR_TYPES,
  ACTUATOR_ACTIONS,
  ACTUATOR_TRIGGERED_BY,
  ACTUATOR_TRIGGER_TYPES,
  PAYMENT_METHODS,
  BUYER_TYPES,
  BUYER_STATUSES,
  CLAIM_STATUSES,
  REPORT_TYPES,
  BILLING_CYCLES,
  PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  FEATURE_CATEGORIES,
  FEATURE_TYPES,
};
