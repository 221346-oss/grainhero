"""
fast_retrain.py — GrainHero Fast Reactive Retrainer  (Process 2)
=================================================================
Spawned as a separate OS subprocess by retrain_watcher.py when
live_sensor_readings row count for a grain crosses FAST_RETRAIN_THRESHOLD.

NEVER imported by app.py.  No shared memory with Process 1.
The ONLY observable effect on Process 1 is a new .onnx appearing in
Supabase Storage, which hot_swap.py will pick up within POLL_INTERVAL_SECONDS.

Usage (spawned by retrain_watcher.py):
    python fast_retrain.py rice

Contract:
  - Reads saved best_params from ml_model_metadata (written by nightly_retrain.py).
  - If no saved params exist yet: falls back to sensible Optuna-free defaults.
  - Trains on the last N rows from live_sensor_readings for the given grain.
  - Passes result to safety_loop.run() for backup/sanity/promote.
  - Exits when done (no long-running daemon).

Tunable constants — documented inline.
"""

from __future__ import annotations

import io
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Optional, Tuple

import httpx
import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  fast_retrain  %(message)s",
)
logger = logging.getLogger("fast_retrain")

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
_HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
}

# ── Tunable constants ─────────────────────────────────────────────────────────
# How many recent rows to train on per fast retrain.
# Rationale: use a rolling window so the model stays recent without accumulating
# unbounded memory. 2000 rows ≈ 3–4 days of typical ESP32 sensor cadence at
# 1 reading/min. Adjust based on measured ingestion rate.
TRAINING_ROWS = 2000

# Default hyperparameters when no nightly run has saved params yet.
# These are conservative, fast-training values deliberately set below Optuna
# optimums — the nightly run will improve them overnight.
DEFAULT_PARAMS = {
    "xgb": {
        "n_estimators": 150, "max_depth": 5, "learning_rate": 0.1,
        "subsample": 0.8, "colsample_bytree": 0.8,
    },
    "rf": {
        "n_estimators": 100, "max_depth": 10, "min_samples_split": 5,
    },
    "lgb": {
        "n_estimators": 150, "num_leaves": 31, "learning_rate": 0.1,
    },
}

FEATURE_NAMES = [
    "temperature", "humidity", "storage_days", "airflow",
    "dew_point", "ambient_light", "pest_presence", "grain_moisture", "rainfall",
]
LABEL_COLUMN = "prediction"


# ── Data fetching ─────────────────────────────────────────────────────────────
def _fetch_training_data(grain: str, client: httpx.Client) -> Optional[pd.DataFrame]:
    """Pull the most recent TRAINING_ROWS sensor readings that have a label."""
    resp = client.get(
        f"{SUPABASE_URL}/rest/v1/live_sensor_readings",
        params={
            "grain_type":  f"eq.{grain}",
            "prediction":  "not.is.null",
            "order":       "created_at.desc",
            "limit":       str(TRAINING_ROWS),
            "select":      ",".join(FEATURE_NAMES + [LABEL_COLUMN]),
        },
    )
    if resp.status_code != 200 or not resp.json():
        logger.error("Failed to fetch training data for '%s' (%d)", grain, resp.status_code)
        return None
    df = pd.DataFrame(resp.json())
    logger.info("Fetched %d labelled rows for '%s'", len(df), grain)
    return df


def _fetch_best_params(grain: str, client: httpx.Client) -> dict:
    """Retrieve best_params from last nightly run, or fall back to defaults."""
    resp = client.get(
        f"{SUPABASE_URL}/rest/v1/ml_model_metadata",
        params={"grain_type": f"eq.{grain}", "select": "best_params"},
    )
    if resp.status_code == 200:
        rows = resp.json()
        if rows and rows[0].get("best_params"):
            logger.info("Using saved best_params from nightly run for '%s'", grain)
            return rows[0]["best_params"]
    logger.info("No saved params for '%s' — using defaults.", grain)
    return DEFAULT_PARAMS


# ── Training ──────────────────────────────────────────────────────────────────
def _train(df: pd.DataFrame, params: dict, grain: str) -> Tuple[bytes, float, None]:
    """
    Train the XGBoost + RandomForest + LightGBM soft-voting ensemble,
    export to ONNX, return (onnx_bytes, val_accuracy, None).
    None for best_params because fast_retrain never runs Optuna.
    """
    from sklearn.ensemble import VotingClassifier, RandomForestClassifier, HistGradientBoostingClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from xgboost import XGBClassifier
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    from skl2onnx import update_registered_converter
    from onnxmltools.convert.xgboost.operator_converters.XGBoost import convert_xgboost
    from skl2onnx.common.shape_calculator import calculate_linear_classifier_output_shapes

    # Register custom converters
    update_registered_converter(
        XGBClassifier, "XGBoostXGBClassifier",
        calculate_linear_classifier_output_shapes, convert_xgboost,
        options={"nocl": [True, False], "zipmap": [True, False, "columns"]},
    )

    # Prepare data
    df = df.dropna(subset=FEATURE_NAMES + [LABEL_COLUMN])
    X = df[FEATURE_NAMES].values.astype(np.float32)
    le = LabelEncoder()
    y = le.fit_transform(df[LABEL_COLUMN].astype(str))

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    p = params
    xgb_p = p.get("xgb", DEFAULT_PARAMS["xgb"])
    rf_p  = p.get("rf",  DEFAULT_PARAMS["rf"])
    # HistGradientBoosting doesn't use the exact same params, map loosely or use defaults
    lgb_p = p.get("lgb", {})
    hist_lr = lgb_p.get("learning_rate", 0.1)
    hist_iter = lgb_p.get("n_estimators", 150)

    ensemble = VotingClassifier(
        estimators=[
            ("xgb", XGBClassifier(**xgb_p, use_label_encoder=False,
                                   eval_metric="mlogloss", verbosity=0)),
            ("rf",  RandomForestClassifier(**rf_p, n_jobs=-1)),
            ("hist", HistGradientBoostingClassifier(learning_rate=hist_lr, max_iter=hist_iter)),
        ],
        voting="soft",
    )
    ensemble.fit(X_train, y_train)

    val_acc = float(np.mean(ensemble.predict(X_val) == y_val))
    logger.info("Val accuracy for '%s': %.4f", grain, val_acc)

    # Export to ONNX
    initial_type = [("float_input", FloatTensorType([None, len(FEATURE_NAMES)]))]
    onnx_model = convert_sklearn(ensemble, initial_types=initial_type, target_opset=12)
    onnx_bytes = onnx_model.SerializeToString()

    return onnx_bytes, val_acc, None  # no best_params from fast retrain


# ── Main ──────────────────────────────────────────────────────────────────────
def main(grain: str) -> None:
    import safety_loop

    client = httpx.Client(timeout=60.0, headers=_HEADERS)

    df = _fetch_training_data(grain, client)
    if df is None or len(df) < 50:
        logger.error("Not enough labelled data for '%s' (need ≥50 rows). Aborting.", grain)
        client.close()
        sys.exit(1)

    params = _fetch_best_params(grain, client)
    client.close()

    def train_fn():
        return _train(df, params, grain)

    success = safety_loop.run(
        grain=grain,
        train_fn=train_fn,
        trained_by="fast_retrain",
        rows_used=len(df),
    )
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fast_retrain.py <grain_type>", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1].lower())
