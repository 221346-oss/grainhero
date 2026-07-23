"""
GrainHero spoilage predictor.
Loads the trained soft-voting ensemble (XGB + RF + LGBM) per grain and
returns the JSON contract expected by src/lib/ai-inference.functions.ts.
"""
import json
import os
from functools import lru_cache

import joblib
import numpy as np

ML_DIR = os.path.dirname(os.path.abspath(__file__))

FEATURE_ORDER = [
    "Temperature", "Humidity", "Storage_Days", "Airflow",
    "Dew_Point", "Ambient_Light", "Pest_Presence",
    "Grain_Moisture", "Rainfall",
]

CLASS_TO_SCORE = {
    "safe": 10, "low": 10,
    "moderate": 45, "medium": 45, "risky": 60,
    "high": 70,
    "critical": 90, "spoiled": 90,
}


def _norm(label: str) -> str:
    l = str(label).lower()
    if "critical" in l or "spoil" in l: return "critical"
    if "high" in l or "risk" in l:      return "high"
    if "moderate" in l or "medium" in l:return "moderate"
    return "low"


@lru_cache(maxsize=8)
def _load(grain: str):
    grain = (grain or "rice").lower()
    model_path = os.path.join(ML_DIR, f"{grain}_ensemble_model.pkl")
    enc_path   = os.path.join(ML_DIR, f"{grain}_label_encoder.pkl")
    if not os.path.exists(model_path):
        model_path = os.path.join(ML_DIR, "ensemble_model.pkl")
    if not os.path.exists(enc_path):
        enc_path = os.path.join(ML_DIR, "label_encoder.pkl")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"No model file found for grain={grain}")
    model = joblib.load(model_path)
    encoder = joblib.load(enc_path) if os.path.exists(enc_path) else None
    return model, encoder


def predict_spoilage(payload: dict) -> dict:
    grain = payload.get("grain_type", "rice")
    try:
        model, encoder = _load(grain)
    except FileNotFoundError as e:
        return {"error": "model_not_found", "detail": str(e),
                "risk_class": "low", "risk_score": 0, "confidence": 0,
                "trustworthy": False}

    feats = {
        "Temperature":   float(payload.get("temperature", 0)),
        "Humidity":      float(payload.get("humidity", 0)),
        "Storage_Days":  float(payload.get("storage_days", 0)),
        "Airflow":       float(payload.get("airflow", 0)),
        "Dew_Point":     float(payload.get("dew_point", 15)),
        "Ambient_Light": float(payload.get("ambient_light", 0)),
        "Pest_Presence": float(payload.get("pest_presence", 0)),
        "Grain_Moisture":float(payload.get("grain_moisture", 0)),
        "Rainfall":      float(payload.get("rainfall", 0)),
    }

    # Cheap sensor-fault guardrail
    if feats["Temperature"] < -20 or feats["Temperature"] > 80 \
       or feats["Humidity"] < 0 or feats["Humidity"] > 100 \
       or feats["Grain_Moisture"] < 0 or feats["Grain_Moisture"] > 40:
        return {"error": "sensor_fault", "risk_class": "low",
                "risk_score": 0, "confidence": 0, "trustworthy": False}

    X = np.array([[feats[k] for k in FEATURE_ORDER]])
    pred_idx = model.predict(X)[0]
    label = encoder.inverse_transform([pred_idx])[0] if encoder else str(pred_idx)
    proba = model.predict_proba(X)[0]
    confidence = float(np.max(proba))

    risk_class = _norm(label)
    risk_score = CLASS_TO_SCORE.get(str(label).lower(), CLASS_TO_SCORE[risk_class])

    factors = []
    if feats["Humidity"] > 75: factors.append("High humidity")
    if feats["Grain_Moisture"] > 14: factors.append("High grain moisture")
    if feats["Temperature"] > 32: factors.append("High temperature")
    if feats["Storage_Days"] > 90: factors.append("Long storage duration")
    if feats["Pest_Presence"] > 0.3: factors.append("Pest signal detected")

    return {
        "risk_class": risk_class,
        "risk_score": int(risk_score),
        "confidence": round(confidence, 3),
        "prediction": str(label),
        "primary_risk_factors": factors,
        "trustworthy": True,
        "grain_type": grain,
    }