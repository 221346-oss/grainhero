-- =============================================================================
-- GrainHero — No-Lag ML Serving Layer — Supabase Schema
-- Run in: Supabase SQL Editor → Run
-- Safe to run multiple times (all statements use IF NOT EXISTS / OR REPLACE)
-- =============================================================================

-- ── 1. live_sensor_readings ──────────────────────────────────────────────────
-- Stores every raw reading from ESP32 sensors. This is the source table used
-- by fast_retrain.py to count new rows per grain and trigger retraining.
CREATE TABLE IF NOT EXISTS live_sensor_readings (
    id              BIGSERIAL PRIMARY KEY,
    grain_type      TEXT        NOT NULL CHECK (grain_type IN ('rice','wheat','maize','sorghum','barley')),
    silo_id         TEXT,
    temperature     REAL        NOT NULL,
    humidity        REAL        NOT NULL,
    storage_days    INTEGER     NOT NULL DEFAULT 0,
    airflow         REAL        DEFAULT 0.0,
    dew_point       REAL        DEFAULT 0.0,
    ambient_light   REAL        DEFAULT 0.0,
    pest_presence   REAL        DEFAULT 0.0,
    grain_moisture  REAL        NOT NULL,
    rainfall        REAL        DEFAULT 0.0,
    tvoc_ppb        REAL        DEFAULT 0.0,
    -- Prediction result (written async after inference — nullable)
    prediction      TEXT,
    confidence      REAL,
    risk_score      REAL,
    -- Metadata
    source          TEXT        DEFAULT 'esp32',   -- 'esp32' | 'manual' | 'simulator'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index to efficiently count rows per grain (the retrain trigger query)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_grain_created
    ON live_sensor_readings (grain_type, created_at DESC);

-- ── 2. model_versions ────────────────────────────────────────────────────────
-- Version history per grain. Each successful retrain writes one row here.
-- The row with is_active = TRUE is what Process 1 should serve.
CREATE TABLE IF NOT EXISTS model_versions (
    id              BIGSERIAL PRIMARY KEY,
    grain_type      TEXT        NOT NULL,
    version         TEXT        NOT NULL,               -- e.g. "20240721_143022"
    storage_path    TEXT        NOT NULL,               -- path in Supabase Storage bucket
    accuracy        REAL,                               -- validation accuracy (0–1)
    f1_score        REAL,
    sanity_pass_rate REAL,                             -- e.g. 0.9 = 9/10 cases passed
    trained_by      TEXT        DEFAULT 'fast_retrain', -- 'fast_retrain' | 'nightly_retrain'
    is_active       BOOLEAN     DEFAULT FALSE,
    file_hash       TEXT,                              -- sha256 of .onnx, for hot-swap check
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_versions_grain_active
    ON model_versions (grain_type, is_active, created_at DESC);

-- ── 3. retrain_log ────────────────────────────────────────────────────────────
-- Every retrain attempt (pass or fail) is logged here. Never deleted.
-- Process 1 never writes to this table.
CREATE TABLE IF NOT EXISTS retrain_log (
    id              BIGSERIAL PRIMARY KEY,
    grain_type      TEXT        NOT NULL,
    trigger         TEXT        NOT NULL,              -- 'fast_retrain' | 'nightly_retrain'
    status          TEXT        NOT NULL,              -- 'success' | 'failed' | 'running'
    rows_used       INTEGER,                           -- how many sensor rows were trained on
    accuracy        REAL,
    sanity_pass_rate REAL,
    duration_seconds REAL,
    fail_reason     TEXT,                              -- null on success
    model_version_id BIGINT     REFERENCES model_versions(id),
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    finished_at     TIMESTAMPTZ
);

-- ── 4. ml_model_metadata ─────────────────────────────────────────────────────
-- One row per grain. Stores best hyperparameters from the nightly run so that
-- fast_retrain.py can skip Optuna and use saved params directly.
CREATE TABLE IF NOT EXISTS ml_model_metadata (
    grain_type          TEXT    PRIMARY KEY,
    best_params         JSONB,  -- full Optuna best_params dict
    best_window_size    INTEGER DEFAULT 10,  -- optimal rolling window W from nightly Optuna run
    last_nightly_run    TIMESTAMPTZ,
    last_fast_run       TIMESTAMPTZ,
    active_model_version TEXT,  -- mirrors model_versions.version for quick lookup
    active_accuracy     REAL,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rows for all supported grains (no-op if already exists)
INSERT INTO ml_model_metadata (grain_type) VALUES
    ('rice'), ('wheat'), ('maize'), ('sorghum'), ('barley')
ON CONFLICT (grain_type) DO NOTHING;

-- ── 5. Supabase Storage bucket for ONNX models ───────────────────────────────
-- Run this via the Supabase dashboard (Storage tab) or via CLI:
--   supabase storage create-bucket onnx-models --public false
-- The bucket should be PRIVATE — only service_role key can read/write.
-- Suggested file paths inside the bucket:
--   /rice/rice.onnx
--   /wheat/wheat.onnx
--   /maize/maize.onnx
--   /sorghum/sorghum.onnx
--   /barley/barley.onnx
-- Backup paths (written by safety_loop before overwriting):
--   /rice/backups/rice_<timestamp>.onnx
--   etc.

-- ── 6. Row-Level Security (RLS) ───────────────────────────────────────────────
-- Enable RLS. The Python server uses the service_role key so it bypasses RLS,
-- but enabling it ensures the anon key (frontend) cannot write sensor readings
-- or model data directly.
ALTER TABLE live_sensor_readings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_versions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrain_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_metadata      ENABLE ROW LEVEL SECURITY;

-- PostgreSQL does not support CREATE POLICY IF NOT EXISTS. Wrap the policy
-- creation in a DO block so the schema remains safe to run repeatedly.
DO $$
BEGIN
    -- The service role already bypasses RLS; these policies document its intended access.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'live_sensor_readings' AND policyname = 'service_role_all_sensor') THEN
        CREATE POLICY "service_role_all_sensor" ON live_sensor_readings FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'model_versions' AND policyname = 'service_role_all_versions') THEN
        CREATE POLICY "service_role_all_versions" ON model_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'retrain_log' AND policyname = 'service_role_all_log') THEN
        CREATE POLICY "service_role_all_log" ON retrain_log FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ml_model_metadata' AND policyname = 'service_role_all_metadata') THEN
        CREATE POLICY "service_role_all_metadata" ON ml_model_metadata FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- Dashboard users can read status, but cannot create or promote model versions.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'live_sensor_readings' AND policyname = 'anon_read_sensor') THEN
        CREATE POLICY "anon_read_sensor" ON live_sensor_readings FOR SELECT TO anon, authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'model_versions' AND policyname = 'anon_read_versions') THEN
        CREATE POLICY "anon_read_versions" ON model_versions FOR SELECT TO anon, authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'retrain_log' AND policyname = 'anon_read_log') THEN
        CREATE POLICY "anon_read_log" ON retrain_log FOR SELECT TO anon, authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ml_model_metadata' AND policyname = 'anon_read_metadata') THEN
        CREATE POLICY "anon_read_metadata" ON ml_model_metadata FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;
