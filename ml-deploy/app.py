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

from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import shap
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

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
    ensemble_path = ML_DIR / f"{grain_l}_ensemble_model.pkl"
    encoder_path  = ML_DIR / f"{grain_l}_label_encoder.pkl"

    if not ensemble_path.exists():
        ensemble_path = ML_DIR / "ensemble_model.pkl"
    if not encoder_path.exists():
        encoder_path = ML_DIR / "label_encoder.pkl"

    if not ensemble_path.exists():
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
def _spoilage_trend(temp_h: List[float], hum_h: List[float], mc_h: List[float]) -> dict:
    def trend(history):
        if len(history) < 3:
            return "stable"
        alpha, ema = 0.4, history[0]
        for v in history[1:]:
            ema = alpha * v + (1 - alpha) * ema
        delta = ema - history[0]
        return "rising" if delta > 0.5 else ("falling" if delta < -0.5 else "stable")

    t, h, m = trend(temp_h), trend(hum_h), trend(mc_h)
    bads = sum(x == "rising" for x in [t, h, m])
    return {
        "temperature_trend": t,
        "humidity_trend":    h,
        "moisture_trend":    m,
        "overall_trend":     "WORSENING" if bads >= 2 else ("CAUTION" if bads == 1 else "STABLE"),
        "trend_alert":       bads >= 2,
        "trend_message": (
            "Multiple key sensors rising. Spoilage risk increasing. Intervene now."
            if bads >= 2 else
            "One sensor rising. Monitor closely." if bads == 1 else
            "Conditions are stable."
        ),
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
    Temperature:    float = Field(..., ge=0,   le=60)
    Humidity:       float = Field(..., ge=0,   le=100)
    Storage_Days:   int   = Field(..., ge=0,   le=730)
    Airflow:        float = Field(0.0, ge=0.0, le=1.0)
    Dew_Point:      float = Field(0.0, ge=-20, le=50)
    Ambient_Light:  float = Field(0.0, ge=0.0, le=100)
    Pest_Presence:  Optional[float] = Field(None, ge=0.0, le=100.0,
                        description="0–100% pest presence. Omit to use VOC proxy.")
    Grain_Moisture: float = Field(..., ge=0,   le=50)
    Rainfall:       float = Field(0.0, ge=0.0)
    latitude:       Optional[float] = Field(None, description="Used to auto-fetch rainfall if omitted")
    longitude:      Optional[float] = Field(None, description="Used to auto-fetch rainfall if omitted")
    tvoc_ppb:       Optional[float] = Field(None,
                        description="Raw TVOC in ppb (used if Pest_Presence omitted)")

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


def _build_feature_array(req: PredictionRequest) -> np.ndarray:
    pest_percent = _pest_proxy(req)
    # Model was trained on 0.0-1.0 float, so we scale the percentage back down internally
    pest_scaled = pest_percent / 100.0
    return np.array([[
        req.Temperature, req.Humidity, float(req.Storage_Days),
        req.Airflow, req.Dew_Point, req.Ambient_Light,
        pest_scaled, req.Grain_Moisture, req.Rainfall,
    ]], dtype=np.float32)


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

        feature_importance = {
            FEATURE_NAMES[i]: round(float(shap_row[i]), 6)
            for i in range(len(FEATURE_NAMES))
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
        return SHAPValues(
            feature_importance={f: 0.0 for f in FEATURE_NAMES},
            base_value=0.0,
            predicted_class=pred_label,
        )


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
            # OpenWeather returns rain in mm for the last 1h
            if "rain" in data and "1h" in data["rain"]:
                return float(data["rain"]["1h"])
    except Exception as exc:
        logger.warning(f"Failed to fetch OpenWeather API: {exc}")
    return 0.0


def _run_inference(req: PredictionRequest) -> PredictionResponse:
    grain = req.grain_type

    # Auto-fetch rainfall if 0.0 and coordinates exist
    if req.Rainfall == 0.0 and req.latitude is not None and req.longitude is not None:
        req.Rainfall = _fetch_rainfall(req.latitude, req.longitude)

    # Critical sensor fault check
    faults = [k for k, v in {
        "Temperature":    req.Temperature,
        "Humidity":       req.Humidity,
        "Grain_Moisture": req.Grain_Moisture,
        "Storage_Days":   req.Storage_Days,
    }.items() if v is None]
    if faults:
        raise HTTPException(status_code=422, detail=f"Critical sensor(s) offline: {faults}")

    # ── ONNX inference (fast, GIL-releasing) ──────────────────────────────────
    onnx_model = registry.get(grain)
    if onnx_model is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model for '{grain}' is not loaded yet. Check startup logs.",
        )

    X            = _build_feature_array(req)
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
    features_used = {
        "Temperature":    req.Temperature,
        "Humidity":       req.Humidity,
        "Storage_Days":   float(req.Storage_Days),
        "Airflow":        req.Airflow,
        "Dew_Point":      req.Dew_Point,
        "Ambient_Light":  req.Ambient_Light,
        "Pest_Presence":  pest,
        "Grain_Moisture": req.Grain_Moisture,
        "Rainfall":       req.Rainfall,
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
            req.temperature_history, req.humidity_history, req.moisture_history
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


@app.get("/model-info/{grain}", summary="Model metadata")
def model_info(grain: str):
    """Return model version, hash, and class labels for a grain."""
    if grain.lower() not in SUPPORTED_GRAINS:
        raise HTTPException(status_code=404, detail=f"Grain '{grain}' not supported.")
    m = registry.get(grain.lower())
    if m is None:
        raise HTTPException(status_code=404, detail=f"Model for '{grain}' not loaded yet.")
    return {
        "grain":   grain.lower(),
        "version": m.version,
        "hash":    m.file_hash,
        "classes": m.class_labels,
    }


# ── Dev entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=False)
