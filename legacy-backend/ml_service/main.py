"""
GrainHero ML Service  –  FastAPI + SHAP Explainability
=======================================================
Serves the 5-grain spoilage-prediction ensemble models over HTTP.
Each prediction is accompanied by SHAP feature-importance values so the
UI can show farmers *why* a silo is classified as Safe / Risky / Spoiled.

Start (development):
    pip install fastapi uvicorn shap joblib numpy scikit-learn
    uvicorn ml_service.main:app --reload --port 8001

Endpoints:
    GET  /              – health check
    GET  /grains        – list supported grain types
    POST /predict       – single-row prediction + SHAP values
    POST /predict/batch – batch prediction (list of rows)
    GET  /model-info/{grain} – model metadata
"""

from __future__ import annotations

import json
import logging
import os
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("ml_service")

# ─── Paths ───────────────────────────────────────────────────────────────────
# ml_service/ lives inside farmHomeBackend-main/ next to ml/
SERVICE_DIR = Path(__file__).resolve().parent
ML_DIR      = SERVICE_DIR.parent / "ml"
sys.path.insert(0, str(ML_DIR))  # allow importing smartbin_predict etc.

SUPPORTED_GRAINS = ["rice", "wheat", "maize", "sorghum", "barley"]

FEATURE_NAMES = [
    "Temperature",
    "Humidity",
    "Storage_Days",
    "Airflow",
    "Dew_Point",
    "Ambient_Light",
    "Pest_Presence",
    "Grain_Moisture",
    "Rainfall",
]

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "GrainHero ML Service",
    description = "5-grain ensemble spoilage prediction with SHAP explainability",
    version     = "2.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["*"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)

# ─── Model cache ─────────────────────────────────────────────────────────────
@lru_cache(maxsize=10)
def _load_assets(grain: str):
    """Load (and cache) model + encoder + metadata for a grain type."""
    grain_l = grain.lower()

    ensemble_path  = ML_DIR / f"{grain_l}_ensemble_model.pkl"
    encoder_path   = ML_DIR / f"{grain_l}_label_encoder.pkl"
    metadata_path  = ML_DIR / f"{grain_l}_model_metadata.json"

    # Fallback to generic names
    if not ensemble_path.exists():
        ensemble_path = ML_DIR / "ensemble_model.pkl"
    if not encoder_path.exists():
        encoder_path  = ML_DIR / "label_encoder.pkl"
    if not metadata_path.exists():
        metadata_path = ML_DIR / "model_metadata.json"

    if not ensemble_path.exists():
        raise FileNotFoundError(f"No model found for grain '{grain}'.")

    model    = joblib.load(ensemble_path)
    encoder  = joblib.load(encoder_path) if encoder_path.exists() else None
    metadata = json.loads(metadata_path.read_text()) if metadata_path.exists() else {}

    # Build a SHAP explainer once (expensive, so we cache it)
    try:
        # TreeExplainer works for XGBoost / RandomForest / LightGBM ensembles
        explainer = shap.TreeExplainer(model)
        logger.info("SHAP TreeExplainer loaded for '%s'", grain)
    except Exception:
        # Fall back to KernelExplainer for black-box models
        background = shap.maskers.Independent(
            np.zeros((1, len(FEATURE_NAMES))), max_samples=50
        )
        explainer = shap.KernelExplainer(model.predict_proba, background)
        logger.warning("Fell back to SHAP KernelExplainer for '%s'", grain)

    return model, encoder, metadata, explainer


# ─── Pydantic schemas ─────────────────────────────────────────────────────────
class PredictionRequest(BaseModel):
    grain_type:    str = Field("rice", description="Grain type (rice, wheat, …)")
    Temperature:   float = Field(..., ge=0,   le=60,  description="°C")
    Humidity:      float = Field(..., ge=0,   le=100, description="%")
    Storage_Days:  int   = Field(..., ge=0,   le=730)
    Airflow:       float = Field(0.0, ge=0.0, le=1.0)
    Dew_Point:     float = Field(0.0, ge=-20, le=50)
    Ambient_Light: float = Field(0.0, ge=0.0, le=100)
    Pest_Presence: Optional[float] = Field(None, ge=0.0, le=1.0,
        description="0-1 pest presence. Omit to use VOC proxy.")
    Grain_Moisture:float = Field(..., ge=0,   le=50)
    Rainfall:      float = Field(0.0, ge=0.0)

    # Optional raw VOC for the pest-presence proxy
    tvoc_ppb:      Optional[float] = Field(None,
        description="Raw TVOC in ppb (used if Pest_Presence is omitted)")

    @validator("grain_type")
    def validate_grain(cls, v):
        if v.lower() not in SUPPORTED_GRAINS:
            raise ValueError(f"Unsupported grain '{v}'. Choose from {SUPPORTED_GRAINS}")
        return v.lower()


class SHAPValues(BaseModel):
    feature_importance: Dict[str, float]
    base_value:         float
    predicted_class:    str


class PredictionResponse(BaseModel):
    grain_type:          str
    prediction:          str
    confidence:          float
    risk_score:          float
    probabilities:       Dict[str, float]
    shap_values:         SHAPValues
    ensemble_breakdown:  Optional[List[Dict[str, Any]]] = None
    model_type:          str
    features_used:       Dict[str, float]


class BatchPredictionRequest(BaseModel):
    rows: List[PredictionRequest]


# ─── Helpers ──────────────────────────────────────────────────────────────────
def apply_pest_proxy(req: PredictionRequest) -> float:
    """Return pest_presence, using VOC proxy if the caller omitted it."""
    if req.Pest_Presence is not None:
        return req.Pest_Presence
    tvoc = (req.tvoc_ppb or 0.0)
    if tvoc < 0:
        tvoc = 0.0
    return min(1.0, (tvoc / 1000.0) * 0.5)


def build_feature_array(req: PredictionRequest) -> np.ndarray:
    pest = apply_pest_proxy(req)
    values = [
        req.Temperature,
        req.Humidity,
        float(req.Storage_Days),
        req.Airflow,
        req.Dew_Point,
        req.Ambient_Light,
        pest,
        req.Grain_Moisture,
        req.Rainfall,
    ]
    return np.array([values])


def run_prediction(req: PredictionRequest) -> PredictionResponse:
    grain = req.grain_type

    try:
        model, encoder, metadata, explainer = _load_assets(grain)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    X    = build_feature_array(req)
    pest = apply_pest_proxy(req)

    # ── Ensemble prediction ──────────────────────────────────────────────
    pred_idx  = model.predict(X)[0]
    proba     = model.predict_proba(X)[0]

    if encoder is not None:
        pred_label  = encoder.inverse_transform([pred_idx])[0]
        class_labels = list(encoder.classes_)
    else:
        pred_label   = str(pred_idx)
        class_labels = ["Safe", "Risky", "Spoiled"]

    confidence = float(np.max(proba))

    # Risk score: weighted contribution of Risky (50%) and Spoiled (100%)
    p_safe    = float(proba[class_labels.index("Safe")])    if "Safe"    in class_labels else 0.0
    p_risky   = float(proba[class_labels.index("Risky")])   if "Risky"   in class_labels else 0.0
    p_spoiled = float(proba[class_labels.index("Spoiled")]) if "Spoiled" in class_labels else 0.0
    risk_score = round(p_risky * 50.0 + p_spoiled * 100.0, 1)

    # ── SHAP explainability ──────────────────────────────────────────────
    try:
        raw_shap = explainer.shap_values(X)

        # shap_values shape varies: (n_classes, n_samples, n_features) or (n_samples, n_features)
        if isinstance(raw_shap, list):
            # Multi-class: pick the class with highest probability
            best_class_idx = int(np.argmax(proba))
            shap_row = np.array(raw_shap[best_class_idx])[0]
        else:
            shap_row = np.array(raw_shap)[0]

        feature_importance = {
            FEATURE_NAMES[i]: round(float(shap_row[i]), 6)
            for i in range(len(FEATURE_NAMES))
        }

        # Base value (expected model output before feature contributions)
        base_val = float(
            explainer.expected_value[int(np.argmax(proba))]
            if isinstance(explainer.expected_value, (list, np.ndarray))
            else explainer.expected_value
        )

        shap_result = SHAPValues(
            feature_importance = feature_importance,
            base_value         = round(base_val, 6),
            predicted_class    = pred_label,
        )
    except Exception as shap_exc:
        logger.warning("SHAP computation failed: %s", shap_exc)
        shap_result = SHAPValues(
            feature_importance = {f: 0.0 for f in FEATURE_NAMES},
            base_value         = 0.0,
            predicted_class    = pred_label,
        )

    # ── Per-model breakdown ──────────────────────────────────────────────
    model_breakdown = []
    model_names     = ["XGBoost", "RandomForest", "LightGBM"]
    try:
        for i, estimator in enumerate(model.estimators_):
            est_proba = estimator.predict_proba(X)[0]
            est_idx   = int(np.argmax(est_proba))
            est_label = encoder.inverse_transform([est_idx])[0] if encoder else str(est_idx)
            model_breakdown.append({
                "model":       model_names[i] if i < len(model_names) else f"model_{i}",
                "prediction":  est_label,
                "confidence":  round(float(np.max(est_proba)) * 100, 1),
                "probabilities": {
                    class_labels[j]: round(float(est_proba[j]) * 100, 1)
                    for j in range(len(class_labels))
                },
            })
    except AttributeError:
        pass  # model might not expose .estimators_

    # ── Build response ───────────────────────────────────────────────────
    return PredictionResponse(
        grain_type         = grain,
        prediction         = pred_label,
        confidence         = round(confidence * 100, 1),
        risk_score         = risk_score,
        probabilities      = {
            class_labels[j]: round(float(proba[j]) * 100, 1)
            for j in range(len(class_labels))
        },
        shap_values        = shap_result,
        ensemble_breakdown = model_breakdown or None,
        model_type         = "ensemble",
        features_used      = {
            "Temperature":    req.Temperature,
            "Humidity":       req.Humidity,
            "Storage_Days":   float(req.Storage_Days),
            "Airflow":        req.Airflow,
            "Dew_Point":      req.Dew_Point,
            "Ambient_Light":  req.Ambient_Light,
            "Pest_Presence":  pest,
            "Grain_Moisture": req.Grain_Moisture,
            "Rainfall":       req.Rainfall,
        },
    )


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/", summary="Health check")
def health():
    return {"status": "ok", "service": "GrainHero ML Service", "version": "2.0.0"}


@app.get("/grains", summary="Supported grain types")
def list_grains():
    return {"supported_grains": SUPPORTED_GRAINS}


@app.post("/predict", response_model=PredictionResponse, summary="Single prediction + SHAP")
def predict(req: PredictionRequest):
    """
    Submit a single sensor reading and receive:
    - Spoilage classification (Safe / Risky / Spoiled)
    - Confidence (%)
    - Risk score (0-100)
    - SHAP feature-importance values
    - Per-model ensemble breakdown
    """
    return run_prediction(req)


@app.post("/predict/batch", summary="Batch prediction")
def predict_batch(req: BatchPredictionRequest):
    """Submit multiple readings in one call."""
    results = []
    errors  = []
    for i, row in enumerate(req.rows):
        try:
            results.append(run_prediction(row))
        except HTTPException as exc:
            errors.append({"index": i, "error": exc.detail})
    return {"results": results, "errors": errors, "total": len(req.rows)}


@app.get("/model-info/{grain}", summary="Model metadata")
def model_info(grain: str):
    """Return metadata (accuracy, training date, feature list) for a grain model."""
    if grain.lower() not in SUPPORTED_GRAINS:
        raise HTTPException(status_code=404, detail=f"Grain '{grain}' not supported.")
    try:
        _, _, metadata, _ = _load_assets(grain.lower())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"grain": grain.lower(), "metadata": metadata}


# ─── Dev entry point ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
