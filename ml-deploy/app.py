"""
app.py — GrainHero ML Service  (Process 1 — ONNX Inference Server)
===================================================================
Serves the 5-grain spoilage-prediction ensemble via ONNX Runtime.

What changed vs the old app.py:
  ✅ ONNX Runtime for inference (GIL-releasing, compiled native code)
  ✅ Hot-swap background thread (new models load without restart)
  ✅ Supabase sensor logging via FastAPI BackgroundTask (fire-and-forget,
     never blocks the response — the old app.py never wrote to Supabase at all)
  ✅ River online learning in background (never blocks response)
  ✅ ALL original response fields kept: SHAP, ensemble breakdown,
     natural_storage_life, spoilage_trend, per-model confidence breakdown

How SHAP works with ONNX:
  The VotingClassifier .pkl is still loaded from disk, but ONLY for SHAP
  computation (cached, never on the hot path).  Inference itself (prediction +
  probabilities) is done by ONNX Runtime.  If the .pkl is missing, SHAP is
  skipped gracefully and null is returned.

Rules that must never be broken here:
  ❌ No import of training code (ensemble_train, Optuna, skl2onnx)
  ❌ No synchronous Supabase write on the request path
  ❌ No blocking on retraining processes
  ✅ ONNX for prediction path
  ✅ pkl cached separately for SHAP only
  ✅ BackgroundTasks for Supabase writes and River updates

Start:
    uvicorn app:app --host 0.0.0.0 --port 8001 --workers 1
"""

from __future__ import annotations

import logging
import os
import shutil
import tempfile

# Load .env file FIRST — before any other imports that read env vars.
# This ensures SUPABASE_URL, GEMINI_API_KEY etc. are available when
# rag_ingest.py, rag_agent.py, and supabase_client.py are imported.
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(dotenv_path=_env_path, override=False)
except ImportError:
    pass  # python-dotenv not installed — env vars must be set externally (Render/prod)

from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import shap
from fastapi import BackgroundTasks, FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# RAG imports
from rag.rag_agent import GrainHeroAgent
from rag.rag_ingest import RAGIngestionPipeline

from model_registry import FEATURE_NAMES, SUPPORTED_GRAINS, registry
from hot_swap import HotSwapPoller
from supabase_client import log_sensor_reading

# Optional River import
try:
    from river import linear_model, preprocessing
    RIVER_AVAILABLE = True
except ImportError:
    RIVER_AVAILABLE = False

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("grainhero.ml")

ML_DIR = Path(__file__).resolve().parent


# ── Bootstrap: load local .onnx files at startup ─────────────────────────────
def _bootstrap_local_models() -> None:
    for grain in SUPPORTED_GRAINS:
        onnx_path = ML_DIR / f"{grain}.onnx"
        if onnx_path.exists():
            try:
                registry.load_from_file(grain, str(onnx_path))
                logger.info("📦 Bootstrapped '%s' from %s", grain, onnx_path.name)
            except Exception as exc:
                logger.warning("Failed to load %s: %s", onnx_path.name, exc)
        else:
            logger.warning("⚠️  No local .onnx found for '%s' — waiting for Supabase.", grain)


# ── SHAP: load pkl separately, cached, for explainability only ───────────────
@lru_cache(maxsize=10)
def _load_pkl_for_shap(grain: str):
    """
    Loads the .pkl ensemble ONLY for SHAP computation.
    Never used for inference — ONNX Runtime handles that.
    Returns (model, encoder, explainer) or (None, None, None) if unavailable.
    """
    grain_l = grain.lower()
    # Try grain-prefixed names first, then fall back to generic names
    # NOTE: actual files on disk are named {grain}_label_encoder.pkl
    # The VotingClassifier pkl is used ONLY for SHAP — ONNX handles inference.
    ensemble_path = ML_DIR / f"{grain_l}_ensemble_model.pkl"
    encoder_path  = ML_DIR / f"{grain_l}_label_encoder.pkl"

    # Fallback: some grains may only have a generic ensemble_model.pkl
    if not ensemble_path.exists():
        ensemble_path = ML_DIR / "ensemble_model.pkl"
    if not encoder_path.exists():
        encoder_path = ML_DIR / "label_encoder.pkl"

    # If still no ensemble pkl, try using the label_encoder pkl itself as a
    # VotingClassifier proxy (intern may have named it differently)
    if not ensemble_path.exists() and (ML_DIR / f"{grain_l}_label_encoder.pkl").exists():
        # Last resort: use label encoder path as the model path to at least load
        # The try/except below will handle graceful failure
        ensemble_path = ML_DIR / f"{grain_l}_label_encoder.pkl"

    if not ensemble_path.exists():
        logger.debug("No SHAP pkl found for '%s' — SHAP disabled for this grain.", grain_l)
        return None, None, None

    try:
        model   = joblib.load(ensemble_path)
        encoder = joblib.load(encoder_path) if encoder_path.exists() else None

        try:
            explainer = shap.TreeExplainer(model)
            logger.info("SHAP TreeExplainer loaded for '%s'", grain_l)
        except Exception:
            background = shap.maskers.Independent(
                np.zeros((1, len(FEATURE_NAMES))), max_samples=50
            )
            explainer = shap.KernelExplainer(model.predict_proba, background)
            logger.warning("Fell back to SHAP KernelExplainer for '%s'", grain_l)

        return model, encoder, explainer
    except Exception as exc:
        logger.warning("Could not load pkl for SHAP ('%s'): %s", grain_l, exc)
        return None, None, None


# ── FAO/IRRI natural storage life ────────────────────────────────────────────
def _natural_storage_life(grain_type: str, moisture_content: float, temperature: float) -> dict:
    """FAO Grain Storage Techniques 1994 / IRRI halving rule."""
    thresholds = {
        "rice":    (14.0, 25.0, 12.0),
        "wheat":   (13.0, 20.0, 18.0),
        "maize":   (14.0, 25.0,  9.0),
        "sorghum": (13.0, 28.0, 12.0),
        "barley":  (13.0, 20.0, 18.0),
    }
    safe_mc, safe_temp, base_months = thresholds.get(grain_type, (13.0, 25.0, 12.0))
    life_months  = base_months
    mc_dev       = max(0.0, float(moisture_content) - safe_mc)
    temp_dev     = max(0.0, float(temperature)       - safe_temp)

    if mc_dev   > 0:
        life_months /= 2 ** int(mc_dev   / 1.0)
    if temp_dev > 0:
        life_months /= 2 ** int(temp_dev / 5.0)

    safe    = mc_dev == 0 and temp_dev == 0
    warning = None if safe else (
        f"Storage life reduced. Moisture {mc_dev:.1f}% above safe. "
        f"Temperature {temp_dev:.1f}°C above safe."
    )
    return {
        "natural_life_months":    round(life_months, 1),
        "current_conditions_safe": safe,
        "deviation": {
            "moisture_above_safe_by":    round(mc_dev, 1),
            "temperature_above_safe_by": round(temp_dev, 1),
        },
        "warning": warning,
        "source":  "FAO Grain Storage Techniques 1994 / IRRI / ASABE D245.6",
    }


# ── EMA spoilage trend ────────────────────────────────────────────────────────
# FAO/IRRI-based safe upper limits per grain type
DANGER_THRESHOLDS = {
    "rice":    {"temperature": 25.0, "humidity": 70.0, "moisture": 14.0},
    "wheat":   {"temperature": 20.0, "humidity": 65.0, "moisture": 13.0},
    "maize":   {"temperature": 25.0, "humidity": 70.0, "moisture": 14.0},
    "sorghum": {"temperature": 28.0, "humidity": 70.0, "moisture": 13.0},
    "barley":  {"temperature": 20.0, "humidity": 65.0, "moisture": 13.0},
}

def _analyze_sensor_trend(history: List[float], danger_threshold: float) -> dict:
    """Rate-of-change + projection for a single sensor stream."""
    if len(history) < 3:
        return {
            "trend": "insufficient_data",
            "rate_per_hour": 0.0,
            "current_value": round(history[-1], 2) if history else 0.0,
            "ema": round(history[-1], 2) if history else 0.0,
            "projected_hours_to_danger": None,
        }
    alpha, ema = 0.4, history[0]
    for v in history[1:]:
        ema = alpha * v + (1 - alpha) * ema
    recent = history[-6:] if len(history) >= 6 else history
    rate   = (recent[-1] - recent[0]) / max(len(recent) - 1, 1)
    direction = "rising" if rate > 0.1 else ("falling" if rate < -0.1 else "stable")
    current = history[-1]
    hours_to_danger = None
    if rate > 0 and current < danger_threshold:
        hours_to_danger = round((danger_threshold - current) / rate, 1)
    elif current >= danger_threshold:
        hours_to_danger = 0.0  # already at or past danger
    return {
        "trend": direction,
        "rate_per_hour": round(rate, 3),
        "current_value": round(current, 2),
        "ema": round(ema, 2),
        "projected_hours_to_danger": hours_to_danger,
    }


def _spoilage_trend(
    temp_h: List[float],
    hum_h:  List[float],
    mc_h:   List[float],
    grain_type: str = "wheat",
) -> dict:
    """
    Full trend analysis: direction + rate + projection.
    Core of GrainHero's predictive spoilage prevention mandate.
    """
    th = DANGER_THRESHOLDS.get(grain_type, DANGER_THRESHOLDS["wheat"])
    t  = _analyze_sensor_trend(temp_h, th["temperature"])
    h  = _analyze_sensor_trend(hum_h,  th["humidity"])
    m  = _analyze_sensor_trend(mc_h,   th["moisture"])

    bads        = sum(x["trend"] == "rising" for x in [t, h, m])
    projections = [x["projected_hours_to_danger"] for x in [t, h, m]
                   if x["projected_hours_to_danger"] is not None]
    min_hours   = round(min(projections), 1) if projections else None

    if bads >= 2 and min_hours is not None and min_hours <= 6:
        urgency = "CRITICAL"
        msg = f"🚨 {bads} sensors rising fast. Danger in ~{min_hours}h. START AERATION NOW."
    elif bads >= 2:
        urgency = "WORSENING"
        msg = f"⚠️ {bads} sensors rising. Danger in ~{min_hours}h. Prepare intervention."
    elif bads == 1:
        urgency = "CAUTION"
        msg = "📈 One sensor rising. Monitor closely. Check aeration."
    else:
        urgency = "STABLE"
        msg = "✅ All conditions stable."

    return {
        "temperature_analysis":     t,
        "humidity_analysis":        h,
        "moisture_analysis":        m,
        "overall_trend":            urgency,
        "trend_alert":              bads >= 2,
        "earliest_danger_in_hours": min_hours,
        "urgency":                  urgency,
        "action_message":           msg,
        # Legacy backward-compat fields (keep for existing frontend consumers)
        "temperature_trend":        t["trend"],
        "humidity_trend":           h["trend"],
        "moisture_trend":           m["trend"],
        "trend_message":            msg,
    }


# ── Online learning (River) ───────────────────────────────────────────────────
_river_models: Dict[str, Any] = {}

def _get_river_model(grain: str):
    if not RIVER_AVAILABLE:
        return None
    if grain not in _river_models:
        _river_models[grain] = preprocessing.StandardScaler() | linear_model.SoftmaxRegression()
    return _river_models[grain]

def _river_update(grain: str, features: Dict[str, float], label: str) -> None:
    model = _get_river_model(grain)
    if model is None:
        return
    try:
        model.learn_one(features, label)
    except Exception as exc:
        logger.debug("River update failed for '%s': %s", grain, exc)


# ── Hot-swap poller ───────────────────────────────────────────────────────────
_poller: Optional[HotSwapPoller] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _poller
    _bootstrap_local_models()

    supabase_url = os.environ.get("SUPABASE_URL", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if supabase_url and service_key:
        _poller = HotSwapPoller(registry=registry, supabase_url=supabase_url,
                                supabase_service_key=service_key)
        _poller.start()
    else:
        logger.warning("⚠️  SUPABASE env vars not set — hot-swap disabled.")

    yield

    if _poller:
        _poller.stop()


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "GrainHero ML Service",
    description = "5-grain ensemble spoilage prediction with SHAP explainability",
    version     = "3.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


# ── Pydantic schemas ──────────────────────────────────────────────────────────
class SHAPValues(BaseModel):
    feature_importance: Dict[str, float]
    base_value:         float
    predicted_class:    str


class PredictionRequest(BaseModel):
    grain_type:     str   = Field("rice",  description="rice | wheat | maize | sorghum | barley")
    Temperature:    Optional[float] = Field(None, ge=0,   le=60)
    Humidity:       Optional[float] = Field(None, ge=0,   le=100)
    Storage_Days:   Optional[int]   = Field(None, ge=0,   le=730)
    Airflow:        float = Field(0.0, ge=0.0, le=1.0)
    Dew_Point:      float = Field(0.0, ge=-20, le=50)
    Ambient_Light:  float = Field(0.0, ge=0.0, le=100)
    Pest_Presence:  Optional[float] = Field(None, ge=0.0, le=100.0,
                        description="0–100% pest presence. Omit to use VOC proxy.")
    Grain_Moisture: Optional[float] = Field(None, ge=0,   le=50)
    Rainfall:       float = Field(0.0, ge=0.0)
    latitude:       Optional[float] = Field(None, description="Used to auto-fetch rainfall if omitted")
    longitude:      Optional[float] = Field(None, description="Used to auto-fetch rainfall if omitted")
    tvoc_ppb:       Optional[float] = Field(None,
                        description="Raw TVOC in ppb (used if Pest_Presence omitted)")
    silo_id:        Optional[str] = Field(None, description="Auto-fetches last 24 sensor readings from Supabase for trend analysis")

    # Rolling window support
    window:   Optional[List[Dict[str, Any]]] = Field(None, description="Optional array of W reading dicts")
    features: Optional[List[float]]          = Field(None, description="Optional flat vector of 9*W floats")

    # Optional history arrays for spoilage trend
    temperature_history: List[float] = Field(default_factory=list)
    humidity_history:    List[float] = Field(default_factory=list)
    moisture_history:    List[float] = Field(default_factory=list)

    @field_validator("grain_type")
    @classmethod
    def validate_grain(cls, v: str) -> str:
        vl = v.lower()
        if vl not in SUPPORTED_GRAINS:
            raise ValueError(f"Unsupported grain '{v}'. Choose from {list(SUPPORTED_GRAINS)}")
        return vl


class PredictionResponse(BaseModel):
    grain_type:          str
    prediction:          str
    confidence:          float
    risk_score:          float
    model_used:          str
    trustworthy:         bool
    probabilities:       Dict[str, float]
    shap_values:         Optional[SHAPValues]
    ensemble_breakdown:  Optional[List[Dict[str, Any]]]
    natural_storage_life: Optional[Dict[str, Any]]
    spoilage_trend:      Optional[Dict[str, Any]]
    features_used:       Dict[str, float]
    model_version:       Optional[str] = None


class BatchPredictionRequest(BaseModel):
    rows: List[PredictionRequest]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _pest_proxy(req: PredictionRequest) -> float:
    """Returns pest presence as a percentage 0-100%"""
    if req.Pest_Presence is not None:
        return req.Pest_Presence
    tvoc = max(0.0, req.tvoc_ppb or 0.0)
    # Estimate pest % from VOC: 1000 ppb = 50%
    return min(100.0, (tvoc / 1000.0) * 50.0)


def _fetch_recent_readings_from_supabase(grain: str, limit: int) -> List[List[float]]:
    """Query Supabase for latest limit readings for grain, return chronologically."""
    supabase_url = os.environ.get("SUPABASE_URL", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key or limit <= 0:
        return []
    try:
        url = f"{supabase_url.rstrip('/')}/rest/v1/live_sensor_readings"
        headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
        params = {
            "grain_type": f"eq.{grain}",
            "order": "created_at.desc",
            "limit": str(limit),
            "select": "temperature,humidity,storage_days,airflow,dew_point,ambient_light,pest_presence,grain_moisture,rainfall",
        }
        resp = requests.get(url, headers=headers, params=params, timeout=2.0)
        if resp.status_code == 200:
            rows = resp.json()
            rows.reverse()  # oldest to newest
            readings = []
            for r in rows:
                pest = float(r.get("pest_presence") or 0.0)
                pest_scaled = (pest / 100.0) if pest > 1.0 else pest
                readings.append([
                    float(r.get("temperature") or 0.0),
                    float(r.get("humidity") or 0.0),
                    float(r.get("storage_days") or 0.0),
                    float(r.get("airflow") or 0.0),
                    float(r.get("dew_point") or 0.0),
                    float(r.get("ambient_light") or 0.0),
                    pest_scaled,
                    float(r.get("grain_moisture") or 0.0),
                    float(r.get("rainfall") or 0.0),
                ])
            return readings
    except Exception as exc:
        logger.warning("Supabase historical readings query failed for '%s': %s", grain, exc)
    return []


def _build_feature_array(req: PredictionRequest, grain: str, target_w: int) -> np.ndarray:
    """Build a (1, 9 * target_w) float32 feature array using flat vector, window, or Supabase history."""
    from window_utils import pad_or_truncate_window

    target_dim = 9 * target_w

    # Case A: Explicit flat features vector provided
    if req.features and len(req.features) > 0:
        raw_feats = [float(x) for x in req.features]
        if len(raw_feats) < target_dim:
            raw_feats = raw_feats + [0.0] * (target_dim - len(raw_feats))
        elif len(raw_feats) > target_dim:
            raw_feats = raw_feats[:target_dim]
        return np.array([raw_feats], dtype=np.float32)

    # Case B: Window of reading objects provided
    if req.window and len(req.window) > 0:
        readings = []
        for r in req.window:
            p_val = float(r.get("Pest_Presence") or r.get("pest_presence") or 0.0)
            p_scaled = (p_val / 100.0) if p_val > 1.0 else p_val
            readings.append([
                float(r.get("Temperature") or r.get("temperature") or 0.0),
                float(r.get("Humidity") or r.get("humidity") or 0.0),
                float(r.get("Storage_Days") or r.get("storage_days") or 0.0),
                float(r.get("Airflow") or r.get("airflow") or 0.0),
                float(r.get("Dew_Point") or r.get("dew_point") or 0.0),
                float(r.get("Ambient_Light") or r.get("ambient_light") or 0.0),
                p_scaled,
                float(r.get("Grain_Moisture") or r.get("grain_moisture") or 0.0),
                float(r.get("Rainfall") or r.get("rainfall") or 0.0),
            ])
        padded = pad_or_truncate_window(readings, W=target_w)
        flat = np.array(padded, dtype=np.float32).flatten()
        return np.array([flat], dtype=np.float32)

    # Case C: Single reading (ESP32 / single JSON call)
    history = _fetch_recent_readings_from_supabase(grain, limit=max(0, target_w - 1))

    temp = req.Temperature if req.Temperature is not None else 25.0
    hum  = req.Humidity if req.Humidity is not None else 60.0
    days = float(req.Storage_Days if req.Storage_Days is not None else 10)
    mc   = req.Grain_Moisture if req.Grain_Moisture is not None else 13.0
    pest_percent = _pest_proxy(req)
    pest_scaled = pest_percent / 100.0

    current_reading = [
        temp, hum, days, req.Airflow, req.Dew_Point,
        req.Ambient_Light, pest_scaled, mc, req.Rainfall,
    ]

    combined = history + [current_reading]
    padded = pad_or_truncate_window(combined, W=target_w)
    flat = np.array(padded, dtype=np.float32).flatten()

    return np.array([flat], dtype=np.float32)


def _compute_shap(grain: str, X: np.ndarray, pred_label: str, class_labels: List[str]) -> Optional[SHAPValues]:
    """Compute SHAP values using the cached pkl model. Returns None if pkl unavailable."""
    model, encoder, explainer = _load_pkl_for_shap(grain)
    if explainer is None:
        return None
    try:
        raw_shap = explainer.shap_values(X)
        if isinstance(raw_shap, list):
            best_class_idx = class_labels.index(pred_label) if pred_label in class_labels else 0
            shap_row = np.array(raw_shap[best_class_idx])[0]
        else:
            shap_row = np.array(raw_shap)[0]

        n_feats = len(shap_row)
        W = max(1, n_feats // len(FEATURE_NAMES))
        feat_names = []
        if W == 1:
            feat_names = list(FEATURE_NAMES)
        else:
            for t in range(W):
                t_label = f"t-{W - 1 - t}" if (W - 1 - t) > 0 else "current"
                for fname in FEATURE_NAMES:
                    feat_names.append(f"{fname}_{t_label}")

        feature_importance = {
            feat_names[i]: round(float(shap_row[i]), 6)
            for i in range(min(len(feat_names), n_feats))
        }
        base_val = float(
            explainer.expected_value[class_labels.index(pred_label)]
            if isinstance(explainer.expected_value, (list, np.ndarray))
            else explainer.expected_value
        )
        return SHAPValues(
            feature_importance=feature_importance,
            base_value=round(base_val, 6),
            predicted_class=pred_label,
        )
    except Exception as exc:
        logger.warning("SHAP computation failed for '%s': %s", grain, exc)
        return None


def _compute_ensemble_breakdown(grain: str, X: np.ndarray, class_labels: List[str]) -> Optional[List[dict]]:
    """Compute per-model breakdown using the cached pkl ensemble."""
    model, encoder, _ = _load_pkl_for_shap(grain)
    if model is None or not hasattr(model, "estimators_"):
        return None
    model_names = ["XGBoost", "RandomForest", "LightGBM"]
    breakdown = []
    try:
        for i, estimator in enumerate(model.estimators_):
            est_proba = estimator.predict_proba(X)[0]
            est_idx   = int(np.argmax(est_proba))
            est_label = (encoder.inverse_transform([est_idx])[0]
                         if encoder else class_labels[est_idx] if est_idx < len(class_labels) else str(est_idx))
            breakdown.append({
                "model":        model_names[i] if i < len(model_names) else f"model_{i}",
                "prediction":   est_label,
                "confidence":   round(float(np.max(est_proba)) * 100, 1),
                "probabilities": {
                    class_labels[j]: round(float(est_proba[j]) * 100, 1)
                    for j in range(len(class_labels))
                },
            })
    except Exception as exc:
        logger.warning("Ensemble breakdown failed for '%s': %s", grain, exc)
    return breakdown or None


# ── Core inference ────────────────────────────────────────────────────────────
def _fetch_rainfall(lat: float, lon: float) -> float:
    api_key = os.environ.get("OPENWEATHER_API_KEY")
    if not api_key:
        return 0.0
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}"
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            if "rain" in data and "1h" in data["rain"]:
                return float(data["rain"]["1h"])
    except Exception as exc:
        logger.warning(f"Failed to fetch OpenWeather API: {exc}")
    return 0.0


async def _fetch_sensor_history(silo_id: str, limit: int = 24) -> dict:
    """
    Fetch the last `limit` sensor readings for a silo from Supabase.
    Returns arrays ordered oldest → newest, ready for trend analysis.
    """
    from supabase_client import get_supabase_client
    try:
        client = get_supabase_client()
        resp = (
            client.table("sensor_readings")
            .select("temperature, humidity, grain_moisture, recorded_at")
            .eq("silo_id", silo_id)
            .order("recorded_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = sorted(resp.data, key=lambda x: x["recorded_at"])  # oldest → newest
        return {
            "temperature_history": [r["temperature"]    for r in rows],
            "humidity_history":    [r["humidity"]       for r in rows],
            "moisture_history":    [r["grain_moisture"] for r in rows],
        }
    except Exception as exc:
        logger.warning("History fetch failed for silo '%s': %s", silo_id, exc)
        return {"temperature_history": [], "humidity_history": [], "moisture_history": []}


def _run_inference(req: PredictionRequest) -> PredictionResponse:
    grain = req.grain_type

    # Auto-fetch rainfall if 0.0 and coordinates exist
    if req.Rainfall == 0.0 and req.latitude is not None and req.longitude is not None:
        req.Rainfall = _fetch_rainfall(req.latitude, req.longitude)

    # ── ONNX inference (fast, GIL-releasing) ──────────────────────────────────
    onnx_model = registry.get(grain)
    if onnx_model is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model for '{grain}' is not loaded yet. Check startup logs.",
        )

    target_w     = onnx_model.window_size
    X            = _build_feature_array(req, grain, target_w)
    onnx_result  = onnx_model.predict(X)

    prediction   = onnx_result["prediction"]
    confidence   = onnx_result["confidence"]  # already 0–100
    risk_score   = onnx_result["risk_score"]
    probabilities = onnx_result["probabilities"]  # already 0–100
    class_labels = list(onnx_model.class_labels)

    # ── SHAP (uses cached pkl — never ONNX session) ───────────────────────────
    shap_result = _compute_shap(grain, X.astype(np.float64), prediction, class_labels)

    # ── Per-model breakdown (uses cached pkl) ─────────────────────────────────
    breakdown = _compute_ensemble_breakdown(grain, X.astype(np.float64), class_labels)

    pest = _pest_proxy(req)
    temp = req.Temperature if req.Temperature is not None else 25.0
    hum  = req.Humidity if req.Humidity is not None else 60.0
    days = float(req.Storage_Days if req.Storage_Days is not None else 10)
    mc   = req.Grain_Moisture if req.Grain_Moisture is not None else 13.0

    features_used = {
        "Temperature":    temp,
        "Humidity":       hum,
        "Storage_Days":   days,
        "Airflow":        req.Airflow,
        "Dew_Point":      req.Dew_Point,
        "Ambient_Light":  req.Ambient_Light,
        "Pest_Presence":  pest,
        "Grain_Moisture": mc,
        "Rainfall":       req.Rainfall,
        "window_size":    float(target_w),
    }

    return PredictionResponse(
        grain_type           = grain,
        prediction           = prediction,
        confidence           = confidence,
        risk_score           = risk_score,
        model_used           = "ensemble" if confidence >= 65.0 else "ensemble_low_confidence",
        trustworthy          = confidence >= 65.0,
        probabilities        = probabilities,
        shap_values          = shap_result,
        ensemble_breakdown   = breakdown,
        natural_storage_life = _natural_storage_life(
            grain, req.Grain_Moisture, req.Temperature
        ),
        spoilage_trend       = _spoilage_trend(
            req.temperature_history, req.humidity_history, req.moisture_history,
            grain_type=req.grain_type,
        ),
        features_used        = features_used,
        model_version        = onnx_model.version,
    )


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/", summary="Health check")
def health():
    return {
        "status":        "ok",
        "service":       "GrainHero ML Service",
        "version":       "3.0.0",
        "loaded_grains": registry.loaded_grains(),
    }


@app.get("/grains", summary="Supported grain types")
def list_grains():
    return {
        "supported_grains": list(SUPPORTED_GRAINS),
        "loaded_grains":    registry.loaded_grains(),
    }


@app.post("/predict", response_model=PredictionResponse,
          summary="Single prediction + SHAP + ensemble breakdown")
async def predict(req: PredictionRequest, background_tasks: BackgroundTasks):
    """
    Returns:
    - Spoilage classification (Safe / Risky / Spoiled)
    - Confidence (%)
    - Risk score (0–100)
    - SHAP feature-importance values
    - Per-model ensemble breakdown (XGBoost / RandomForest / LightGBM)
    - Natural storage life (FAO/IRRI)
    - Spoilage trend (EMA over history arrays)

    After sending the response, logs the reading to Supabase asynchronously.
    """
    # Auto-inject history from Supabase if silo_id provided and arrays not manually passed
    if req.silo_id and not req.temperature_history:
        history = await _fetch_sensor_history(req.silo_id)
        req.temperature_history = history["temperature_history"]
        req.humidity_history    = history["humidity_history"]
        req.moisture_history    = history["moisture_history"]

    result = _run_inference(req)

    # Fire-and-forget: log to Supabase (never delays response)
    background_tasks.add_task(log_sensor_reading, {
        "grain_type":    req.grain_type,
        "temperature":   req.Temperature,
        "humidity":      req.Humidity,
        "storage_days":  req.Storage_Days,
        "airflow":       req.Airflow,
        "dew_point":     req.Dew_Point,
        "ambient_light": req.Ambient_Light,
        "pest_presence": _pest_proxy(req),
        "grain_moisture":req.Grain_Moisture,
        "rainfall":      req.Rainfall,
        "tvoc_ppb":      req.tvoc_ppb or 0.0,
        "prediction":    result.prediction,
        "confidence":    result.confidence,
        "risk_score":    result.risk_score,
    })

    # Fire-and-forget: River online learning update
    if RIVER_AVAILABLE:
        background_tasks.add_task(
            _river_update, req.grain_type, result.features_used, result.prediction
        )

    return result


@app.post("/predict/batch", summary="Batch prediction")
async def predict_batch(req: BatchPredictionRequest, background_tasks: BackgroundTasks):
    """Submit multiple readings in one call."""
    results, errors = [], []
    for i, row in enumerate(req.rows):
        try:
            r = _run_inference(row)
            background_tasks.add_task(log_sensor_reading, {
                "grain_type": row.grain_type, "temperature": row.Temperature,
                "humidity": row.Humidity, "storage_days": row.Storage_Days,
                "grain_moisture": row.Grain_Moisture, "prediction": r.prediction,
                "confidence": r.confidence, "risk_score": r.risk_score,
            })
            results.append(r)
        except HTTPException as exc:
            errors.append({"index": i, "error": exc.detail})
    return {"results": results, "errors": errors, "total": len(req.rows)}


class TrendRequest(BaseModel):
    grain_type:          str           = Field("wheat")
    silo_id:             Optional[str] = None
    temperature_history: List[float]   = Field(default_factory=list)
    humidity_history:    List[float]   = Field(default_factory=list)
    moisture_history:    List[float]   = Field(default_factory=list)


@app.post("/trend", summary="Trend-only analysis — no ONNX inference (< 5ms, call every 5 min)")
async def trend_only(req: TrendRequest):
    """
    Lightweight proactive monitoring endpoint.
    Skips ONNX entirely. Use for frequent polling (every 5 minutes).
    Returns: rate_per_hour, urgency, projected_hours_to_danger per sensor.
    """
    temp_h, hum_h, mc_h = req.temperature_history, req.humidity_history, req.moisture_history
    if req.silo_id and not temp_h:
        history = await _fetch_sensor_history(req.silo_id)
        temp_h  = history["temperature_history"]
        hum_h   = history["humidity_history"]
        mc_h    = history["moisture_history"]
    return _spoilage_trend(temp_h, hum_h, mc_h, grain_type=req.grain_type)


# ── RAG (Agentic AI) Endpoints ────────────────────────────────────────────────

class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="The user's question")
    tenant_id: str = Field(..., description="UUID of the tenant for data isolation")

@app.post("/query", summary="RAG AI Assistant Query")
async def rag_query(req: RAGQueryRequest):
    """
    Executes a query against the GrainHero AI Assistant.
    It will autonomously decide whether to query the knowledge base (manuals),
    live telemetry, or both.
    """
    try:
        agent = GrainHeroAgent(tenant_id=req.tenant_id)
        response = agent.run(req.query)
        return {"answer": response, "query": req.query, "tenant_id": req.tenant_id}
    except Exception as exc:
        logger.error("RAG Query failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/ingest", summary="Upload a document to the Knowledge Base")
async def rag_ingest(
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    category: str = Form("Manuals")
):
    """
    Ingests a PDF or TXT file into the RAG vector database.
    Performs extraction, semantic chunking, embedding, and storage.
    """
    try:
        # Save uploaded file temporarily
        suffix = Path(file.filename).suffix if file.filename else ".txt"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)

        pipeline = RAGIngestionPipeline()
        result = pipeline.ingest_file(
            file_path=tmp_path,
            tenant_id=tenant_id,
            category=category
        )
        
        # Cleanup temp file
        os.remove(tmp_path)
        
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_inserted": result.get("chunks_inserted", 0),
            "doc_id": result.get("doc_id")
        }
    except Exception as exc:
        logger.error("RAG Ingestion failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/model-info/{grain}", summary="Model metadata")
def model_info(grain: str):
    """Return model version, window size W, input dimension, hash, and class labels for a grain."""
    if grain.lower() not in SUPPORTED_GRAINS:
        raise HTTPException(status_code=404, detail=f"Grain '{grain}' not supported.")
    m = registry.get(grain.lower())
    if m is None:
        raise HTTPException(status_code=404, detail=f"Model for '{grain}' not loaded yet.")
    return {
        "grain":         grain.lower(),
        "version":       m.version,
        "hash":          m.file_hash,
        "classes":       m.class_labels,
        "window_size":   m.window_size,
        "input_dim":     m.input_dim,
        "feature_names": FEATURE_NAMES,
    }


# ── Dev entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=False)
