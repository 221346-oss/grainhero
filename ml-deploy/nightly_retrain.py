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
def _optuna_search(X_train, y_train, X_val, y_val, n_classes: int) -> dict:
    """
    Run Optuna search for each estimator type independently, then combine.
    Returns a best_params dict with keys 'xgb', 'rf', 'lgb'.
    """
    from sklearn.metrics import accuracy_score
    from xgboost import XGBClassifier
    from lightgbm import LGBMClassifier
    from sklearn.ensemble import RandomForestClassifier

    best_params: dict = {}

    # ── XGBoost ──────────────────────────────────────────────────────────────
    def xgb_objective(trial):
        params = {
            "n_estimators":     trial.suggest_int("n_estimators", 100, 500),
            "max_depth":        trial.suggest_int("max_depth", 3, 10),
            "learning_rate":    trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample":        trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
        }
        m = XGBClassifier(**params, use_label_encoder=False, eval_metric="mlogloss",
                          num_class=n_classes, verbosity=0)
        m.fit(X_train, y_train)
        return accuracy_score(y_val, m.predict(X_val))

    study_xgb = optuna.create_study(direction="maximize")
    study_xgb.optimize(xgb_objective, n_trials=OPTUNA_TRIALS, show_progress_bar=False)
    best_params["xgb"] = study_xgb.best_params
    logger.info("XGBoost best: %.4f  params=%s", study_xgb.best_value, study_xgb.best_params)

    # ── RandomForest ──────────────────────────────────────────────────────────
    def rf_objective(trial):
        params = {
            "n_estimators":    trial.suggest_int("n_estimators", 50, 400),
            "max_depth":       trial.suggest_int("max_depth", 5, 25),
            "min_samples_split": trial.suggest_int("min_samples_split", 2, 20),
            "min_samples_leaf":  trial.suggest_int("min_samples_leaf", 1, 10),
            "max_features":    trial.suggest_categorical("max_features", ["sqrt", "log2"]),
        }
        m = RandomForestClassifier(**params, n_jobs=-1)
        m.fit(X_train, y_train)
        return accuracy_score(y_val, m.predict(X_val))

    study_rf = optuna.create_study(direction="maximize")
    study_rf.optimize(rf_objective, n_trials=OPTUNA_TRIALS, show_progress_bar=False)
    best_params["rf"] = study_rf.best_params
    logger.info("RandomForest best: %.4f  params=%s", study_rf.best_value, study_rf.best_params)

    # ── LightGBM ─────────────────────────────────────────────────────────────
    def lgb_objective(trial):
        params = {
            "n_estimators":  trial.suggest_int("n_estimators", 100, 500),
            "num_leaves":    trial.suggest_int("num_leaves", 20, 150),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "min_child_samples": trial.suggest_int("min_child_samples", 5, 50),
            "subsample":     trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
        }
        m = LGBMClassifier(**params, verbose=-1)
        m.fit(X_train, y_train)
        return accuracy_score(y_val, m.predict(X_val))

    study_lgb = optuna.create_study(direction="maximize")
    study_lgb.optimize(lgb_objective, n_trials=OPTUNA_TRIALS, show_progress_bar=False)
    best_params["lgb"] = study_lgb.best_params
    logger.info("LightGBM best: %.4f  params=%s", study_lgb.best_value, study_lgb.best_params)

    return best_params


# ── Training ──────────────────────────────────────────────────────────────────
def _train(df: pd.DataFrame, grain: str) -> Tuple[bytes, float, dict]:
    from sklearn.ensemble import VotingClassifier, RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from xgboost import XGBClassifier
    from lightgbm import LGBMClassifier
    from skl2onnx import convert_sklearn, update_registered_converter
    from skl2onnx.common.data_types import FloatTensorType
    from skl2onnx.common.shape_calculator import calculate_linear_classifier_output_shapes
    from onnxmltools.convert.xgboost.operator_converters.XGBoost import convert_xgboost

    update_registered_converter(
        XGBClassifier, "XGBoostXGBClassifier",
        calculate_linear_classifier_output_shapes, convert_xgboost,
        options={"nocl": [True, False], "zipmap": [True, False, "columns"]},
    )

    df = df.dropna(subset=FEATURE_NAMES + [LABEL_COLUMN])
    X = df[FEATURE_NAMES].values.astype(np.float32)
    le = LabelEncoder()
    y = le.fit_transform(df[LABEL_COLUMN].astype(str))
    n_classes = len(le.classes_)

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    logger.info("Starting Optuna search for '%s' (%d classes, %d train rows)...", grain, n_classes, len(X_train))
    best_params = _optuna_search(X_train, y_train, X_val, y_val, n_classes)

    # Final train with best params on full training set
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
    logger.info("Final ensemble val accuracy for '%s': %.4f", grain, val_acc)

    initial_type = [("float_input", FloatTensorType([None, len(FEATURE_NAMES)]))]
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
