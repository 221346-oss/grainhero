"""
nightly_retrain.py — GrainHero Nightly Full Retrain  (Process 3)
=================================================================
Scheduled via cron / Windows Task Scheduler.  Runs once per day at a
low-traffic hour (default: 2am — adjust to real lowest-traffic window).

Schedule examples:
  Linux/Mac cron:     0 2 * * * cd /app && python nightly_retrain.py
  Windows Task Sched: Run nightly_retrain.py at 02:00 daily

NEVER imported by app.py.  Exits when done.

What it adds vs. fast_retrain.py:
  - Full Optuna hyperparameter search per grain per estimator type.
  - Saves winning params to ml_model_metadata so fast_retrain.py can
    use them without running Optuna itself.

Tunable constants — documented inline.
"""

from __future__ import annotations

import logging
import os
import sys
from typing import Optional, Tuple

import httpx
import numpy as np
import optuna
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  nightly_retrain  %(message)s",
)
logger = logging.getLogger("nightly_retrain")

optuna.logging.set_verbosity(optuna.logging.WARNING)  # suppress per-trial noise

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
_HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
}

# ── Tunable constants ─────────────────────────────────────────────────────────
# Max rows per grain for nightly training.
# Rationale: 10 000 rows ≈ 1–2 weeks of data at 1 reading/min per grain.
# Raising this increases accuracy but also training time.
TRAINING_ROWS = 10_000

# Optuna trials per estimator type.
# Rationale: 40 trials ≈ 15–20 min for XGBoost on a mid-range CPU.
# Total budget per grain: 3 estimators × 40 trials ≈ 35–45 min.
# Reduce to 20 if hardware is slower than expected.
OPTUNA_TRIALS = 40

FEATURE_NAMES = [
    "temperature", "humidity", "storage_days", "airflow",
    "dew_point", "ambient_light", "pest_presence", "grain_moisture", "rainfall",
]
LABEL_COLUMN = "prediction"
SUPPORTED_GRAINS = ("rice", "wheat", "maize", "sorghum", "barley")


# ── Data fetching ─────────────────────────────────────────────────────────────
def _fetch_data(grain: str, client: httpx.Client) -> Optional[pd.DataFrame]:
    resp = client.get(
        f"{SUPABASE_URL}/rest/v1/live_sensor_readings",
        params={
            "grain_type": f"eq.{grain}",
            "prediction": "not.is.null",
            "order":      "created_at.desc",
            "limit":      str(TRAINING_ROWS),
            "select":     ",".join(FEATURE_NAMES + [LABEL_COLUMN]),
        },
    )
    if resp.status_code != 200 or not resp.json():
        return None
    df = pd.DataFrame(resp.json())
    logger.info("Fetched %d rows for '%s'", len(df), grain)
    return df


# ── Optuna search ─────────────────────────────────────────────────────────────
def _optuna_search(df: pd.DataFrame, grain: str) -> dict:
    """
    Run Optuna search over window size W and model hyperparameters.
    Always uses TimeSeriesSplit(n_splits=5) cross-validation.
    Returns best_params dict with keys 'xgb', 'rf', 'lgb', and 'best_window_size'.
    """
    from sklearn.metrics import accuracy_score
    from sklearn.model_selection import TimeSeriesSplit
    from sklearn.preprocessing import LabelEncoder
    from xgboost import XGBClassifier
    from lightgbm import LGBMClassifier
    from sklearn.ensemble import RandomForestClassifier

    from window_utils import build_windows

    best_params: dict = {}

    # ── Combined Search: Window size + Hyperparameters ──────────────────────
    def objective(trial):
        W = trial.suggest_int("best_window_size", 3, 20)

        X_w, y_raw = build_windows(df, W=W, feature_cols=FEATURE_NAMES, label_col=LABEL_COLUMN)
        if len(X_w) < 25:
            return 0.0

        le = LabelEncoder()
        y = le.fit_transform(y_raw.astype(str))
        n_classes = len(le.classes_)

        xgb_params = {
            "n_estimators":     trial.suggest_int("xgb_n_estimators", 100, 300),
            "max_depth":        trial.suggest_int("xgb_max_depth", 3, 8),
            "learning_rate":    trial.suggest_float("xgb_learning_rate", 0.01, 0.2, log=True),
            "subsample":        trial.suggest_float("xgb_subsample", 0.7, 1.0),
            "colsample_bytree": trial.suggest_float("xgb_colsample_bytree", 0.7, 1.0),
        }
        rf_params = {
            "n_estimators":    trial.suggest_int("rf_n_estimators", 50, 200),
            "max_depth":       trial.suggest_int("rf_max_depth", 5, 20),
            "min_samples_split": trial.suggest_int("rf_min_samples_split", 2, 10),
        }
        lgb_params = {
            "n_estimators":  trial.suggest_int("lgb_n_estimators", 100, 300),
            "num_leaves":    trial.suggest_int("lgb_num_leaves", 20, 100),
            "learning_rate": trial.suggest_float("lgb_learning_rate", 0.01, 0.2, log=True),
        }

        tscv = TimeSeriesSplit(n_splits=5)
        scores = []
        for train_idx, val_idx in tscv.split(X_w):
            X_tr, X_va = X_w[train_idx], X_w[val_idx]
            y_tr, y_va = y[train_idx], y[val_idx]

            m_xgb = XGBClassifier(**xgb_params, use_label_encoder=False, eval_metric="mlogloss",
                                  num_class=n_classes, verbosity=0)
            m_rf  = RandomForestClassifier(**rf_params, n_jobs=-1)
            m_lgb = LGBMClassifier(**lgb_params, verbose=-1)

            m_xgb.fit(X_tr, y_tr)
            m_rf.fit(X_tr, y_tr)
            m_lgb.fit(X_tr, y_tr)

            p_xgb = m_xgb.predict_proba(X_va)
            p_rf  = m_rf.predict_proba(X_va)
            p_lgb = m_lgb.predict_proba(X_va)

            p_ens = (p_xgb + p_rf + p_lgb) / 3.0
            pred = np.argmax(p_ens, axis=1)
            scores.append(accuracy_score(y_va, pred))

        return float(np.mean(scores))

    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=OPTUNA_TRIALS, show_progress_bar=False)

    bp = study.best_params
    best_w = int(bp.get("best_window_size", 10))
    logger.info("Nightly Optuna search complete for '%s': best score=%.4f (W=%d)", grain, study.best_value, best_w)

    best_params = {
        "best_window_size": best_w,
        "xgb": {
            "n_estimators": bp.get("xgb_n_estimators", 150),
            "max_depth": bp.get("xgb_max_depth", 5),
            "learning_rate": bp.get("xgb_learning_rate", 0.1),
            "subsample": bp.get("xgb_subsample", 0.8),
            "colsample_bytree": bp.get("xgb_colsample_bytree", 0.8),
        },
        "rf": {
            "n_estimators": bp.get("rf_n_estimators", 100),
            "max_depth": bp.get("rf_max_depth", 10),
            "min_samples_split": bp.get("rf_min_samples_split", 5),
        },
        "lgb": {
            "n_estimators": bp.get("lgb_n_estimators", 150),
            "num_leaves": bp.get("lgb_num_leaves", 31),
            "learning_rate": bp.get("lgb_learning_rate", 0.1),
        },
    }
    return best_params


# ── Training ──────────────────────────────────────────────────────────────────
def _train(df: pd.DataFrame, grain: str) -> Tuple[bytes, float, dict]:
    from sklearn.ensemble import VotingClassifier, RandomForestClassifier
    from sklearn.model_selection import TimeSeriesSplit
    from sklearn.preprocessing import LabelEncoder
    from xgboost import XGBClassifier
    from lightgbm import LGBMClassifier
    from skl2onnx import convert_sklearn, update_registered_converter
    from skl2onnx.common.data_types import FloatTensorType
    from skl2onnx.common.shape_calculator import calculate_linear_classifier_output_shapes
    from onnxmltools.convert.xgboost.operator_converters.XGBoost import convert_xgboost

    from window_utils import build_windows

    update_registered_converter(
        XGBClassifier, "XGBoostXGBClassifier",
        calculate_linear_classifier_output_shapes, convert_xgboost,
        options={"nocl": [True, False], "zipmap": [True, False, "columns"]},
    )

    logger.info("Starting Optuna search for '%s'...", grain)
    best_params = _optuna_search(df, grain)
    best_w = best_params["best_window_size"]

    X_windowed, y_raw = build_windows(df, W=best_w, feature_cols=FEATURE_NAMES, label_col=LABEL_COLUMN)
    le = LabelEncoder()
    y = le.fit_transform(y_raw.astype(str))

    tscv = TimeSeriesSplit(n_splits=5)
    train_idx, val_idx = list(tscv.split(X_windowed))[-1]

    X_train, X_val = X_windowed[train_idx], X_windowed[val_idx]
    y_train, y_val = y[train_idx], y[val_idx]

    ensemble = VotingClassifier(
        estimators=[
            ("xgb", XGBClassifier(**best_params["xgb"], use_label_encoder=False,
                                   eval_metric="mlogloss", verbosity=0)),
            ("rf",  RandomForestClassifier(**best_params["rf"], n_jobs=-1)),
            ("lgb", LGBMClassifier(**best_params["lgb"], verbose=-1)),
        ],
        voting="soft",
    )
    ensemble.fit(X_train, y_train)
    val_acc = float(np.mean(ensemble.predict(X_val) == y_val))
    logger.info("Final ensemble val accuracy for '%s' (W=%d, dim=%d): %.4f", grain, best_w, X_windowed.shape[1], val_acc)

    initial_type = [("float_input", FloatTensorType([None, X_windowed.shape[1]]))]
    onnx_model = convert_sklearn(ensemble, initial_types=initial_type, target_opset=12)
    onnx_bytes = onnx_model.SerializeToString()

    return onnx_bytes, val_acc, best_params


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    import safety_loop

    client = httpx.Client(timeout=60.0, headers=_HEADERS)

    for grain in SUPPORTED_GRAINS:
        logger.info("=" * 60)
        logger.info("Processing grain: %s", grain)

        df = _fetch_data(grain, client)
        if df is None or len(df) < 100:
            logger.warning("Not enough data for '%s' (need ≥100 rows). Skipping.", grain)
            continue

        df_snapshot = df.copy()  # capture before passing to closure

        def train_fn(g=grain, d=df_snapshot):
            return _train(d, g)

        safety_loop.run(
            grain=grain,
            train_fn=train_fn,
            trained_by="nightly_retrain",
            rows_used=len(df),
        )

    client.close()
    logger.info("Nightly retrain complete.")


if __name__ == "__main__":
    main()
