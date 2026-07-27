"""
GrainHero Ensemble Predictor
=============================
Loads the trained ensemble model and makes predictions.
Returns per-model confidence breakdown + ensemble prediction.
"""
import joblib
import numpy as np
import json
import os
import sys
import logging

logger = logging.getLogger(__name__)

ML_DIR = os.path.dirname(os.path.abspath(__file__))

FEATURE_NAMES = [
    'Temperature', 'Humidity', 'Storage_Days', 'Airflow',
    'Dew_Point', 'Ambient_Light', 'Pest_Presence',
    'Grain_Moisture', 'Rainfall'
]


def load_model(grain_type='rice'):
    """Load ensemble model and label encoder for the given grain type."""
    grain = grain_type.lower()
    
    # Try grain-specific model first, then fall back to default
    ensemble_path = os.path.join(ML_DIR, f'{grain}_ensemble_model.pkl')
    encoder_path = os.path.join(ML_DIR, f'{grain}_label_encoder.pkl')
    metadata_path = os.path.join(ML_DIR, f'{grain}_model_metadata.json')

    # Fallback to non-prefixed files
    if not os.path.exists(ensemble_path):
        ensemble_path = os.path.join(ML_DIR, 'ensemble_model.pkl')
    if not os.path.exists(encoder_path):
        encoder_path = os.path.join(ML_DIR, 'label_encoder.pkl')
    if not os.path.exists(metadata_path):
        metadata_path = os.path.join(ML_DIR, 'model_metadata.json')

    # Fall back to old model if ensemble doesn't exist yet
    if not os.path.exists(ensemble_path):
        fallback_path = os.path.join(ML_DIR, 'smartbin_model.pkl')
        if os.path.exists(fallback_path):
            model = joblib.load(fallback_path)
            encoder = None
            if os.path.exists(encoder_path):
                encoder = joblib.load(encoder_path)
            return model, encoder, None, True  # True = legacy mode
        return None, None, None, False

    model = joblib.load(ensemble_path)
    encoder = joblib.load(encoder_path) if os.path.exists(encoder_path) else None

    metadata = None
    if os.path.exists(metadata_path):
        with open(metadata_path) as f:
            metadata = json.load(f)

    return model, encoder, metadata, False


def get_natural_storage_life(grain_type, moisture_content, temperature):
    """Returns natural storage life using FAO/IRRI lookup table with IRRI halving rule."""
    grain = grain_type.lower()
    # Base thresholds: (safe_mc, safe_temp, base_months)
    thresholds = {
        'rice': (14.0, 25.0, 12.0),
        'wheat': (13.0, 20.0, 18.0),
        'maize': (14.0, 25.0, 9.0),
        'sorghum': (13.0, 28.0, 12.0),
        'barley': (13.0, 20.0, 18.0)
    }
    
    safe_mc, safe_temp, base_months = thresholds.get(grain, (13.0, 25.0, 12.0))
    
    life_months = base_months
    mc_deviation = max(0, float(moisture_content) - safe_mc)
    temp_deviation = max(0, float(temperature) - safe_temp)
    
    if mc_deviation > 0:
        halvings = int(mc_deviation / 1.0)
        life_months = life_months / (2 ** halvings)
        
    if temp_deviation > 0:
        halvings = int(temp_deviation / 5.0)
        life_months = life_months / (2 ** halvings)
        
    safe = mc_deviation == 0 and temp_deviation == 0
    warning = None
    if not safe:
        warning = f"Storage life reduced. Moisture {mc_deviation:.1f}% above safe. Temperature {temp_deviation:.1f}°C above safe."
        
    return {
        "natural_life_months": round(life_months, 1),
        "current_conditions_safe": safe,
        "deviation": {
            "moisture_above_safe_by": round(mc_deviation, 1),
            "temperature_above_safe_by": round(temp_deviation, 1)
        },
        "warning": warning,
        "source": "FAO Grain Storage Techniques 1994 / IRRI / ASABE D245.6"
    }


def compute_spoilage_trend(temperature_history, humidity_history, moisture_history):
    """Computes spoilage trend flag based on history arrays using EMA."""
    def compute_trend(history, direction='up'):
        if not history or len(history) < 3:
            return 'stable'
        alpha = 0.4
        ema = history[0]
        for val in history[1:]:
            ema = alpha * val + (1 - alpha) * ema
        delta = ema - history[0]
        if direction == 'up' and delta > 0.5:
            return 'rising'
        if direction == 'up' and delta < -0.5:
            return 'falling'
        return 'stable'

    t_trend = compute_trend(temperature_history)
    h_trend = compute_trend(humidity_history)
    m_trend = compute_trend(moisture_history)
    
    bad_trends = 0
    if t_trend == 'rising': bad_trends += 1
    if h_trend == 'rising': bad_trends += 1
    if m_trend == 'rising': bad_trends += 1
    
    overall = 'STABLE'
    alert = False
    message = "Conditions are stable."
    
    if bad_trends >= 2:
        overall = 'WORSENING'
        alert = True
        message = "Multiple key sensors are rising. Spoilage risk increasing. Intervene now."
    elif bad_trends == 1:
        overall = 'CAUTION'
        message = "One sensor is rising. Monitor closely."
        
    return {
        "temperature_trend": t_trend,
        "humidity_trend": h_trend,
        "moisture_trend": m_trend,
        "overall_trend": overall,
        "trend_alert": alert,
        "trend_message": message
    }


def predict_single(features_dict, grain_type='rice', temperature_history=None, humidity_history=None, moisture_history=None):
    """
    Predict spoilage for a single reading.

    Parameters:
        features_dict: dict with keys matching FEATURE_NAMES
        grain_type: which grain model to use (rice, wheat, maize, sorghum, barley)

    Returns:
        dict with prediction, confidence, per-model breakdown
    """
    # ── Strict Sensor Fault Check ───────────────────────────────────────────
    critical_sensors = ['Temperature', 'Humidity', 'Grain_Moisture', 'Storage_Days']
    faults = [s for s in critical_sensors if s not in features_dict or features_dict[s] is None]
    if faults:
        return {
            "error": "sensor_fault",
            "faults": faults,
            "message": "Critical sensor(s) offline. Prediction refused."
        }
    # ────────────────────────────────────────────────────────────────────────

    model, encoder, metadata, is_legacy = load_model(grain_type)

    if model is None:
        return {
            'error': f'No model found for {grain_type}. Please retrain the model first.',
            'prediction': 'Unknown',
            'confidence': 0,
            'model_type': 'none',
            'grain_type': grain_type
        }

    # ── Pest Presence Proxy ─────────────────────────────────────────────────
    # When an explicit Pest_Presence value is NOT provided by the caller we
    # derive an interim proxy from the VOC reading (tvoc_ppb / 1000), clamped
    # to [0, 1].  A high VOC relative value indicates off-gassing from grain
    # degradation or pest metabolic activity (Bosch BSEC IAQ reference).
    # Callers that already supply Pest_Presence are NOT affected.
    if 'Pest_Presence' not in features_dict or features_dict['Pest_Presence'] is None:
        tvoc_ppb = float(features_dict.get('tvoc_ppb', 0) or 0)
        if tvoc_ppb < 0:  # -999 sentinel means warming up / invalid
            tvoc_ppb = 0.0
        voc_relative = tvoc_ppb / 1000.0
        features_dict = dict(features_dict)  # don't mutate caller's dict
        features_dict['Pest_Presence'] = min(1.0, voc_relative * 0.5)
    # ────────────────────────────────────────────────────────────────────────

    # Build the feature array in correct order
    feature_values = []
    for f in FEATURE_NAMES:
        val = features_dict.get(f, 0)
        feature_values.append(float(val) if val is not None else 0.0)

    X = np.array([feature_values])

    if is_legacy:
        # Old single-model path
        pred = model.predict(X)
        pred_label = pred[0] if isinstance(pred[0], str) else str(pred[0])
        try:
            proba = model.predict_proba(X)[0]
            confidence = float(np.max(proba))
        except:
            confidence = 0.0

        return {
            'prediction': pred_label,
            'confidence': round(confidence * 100, 1),  # Normalized to 0-100 scale
            'model_used': 'legacy_single',
            'trustworthy': confidence >= 0.65,
            'ensemble_breakdown': None,
        }

    # --- Ensemble prediction ---
    pred = model.predict(X)[0]
    pred_label = encoder.inverse_transform([pred])[0] if encoder else str(pred)

    # Get ensemble probabilities
    proba = model.predict_proba(X)[0]
    class_labels = list(encoder.classes_) if encoder else ['Safe', 'Risky', 'Spoiled']
    confidence = float(np.max(proba))

    # Get per-model breakdown
    model_breakdown = []
    model_names = ['XGBoost', 'RandomForest', 'LightGBM']
    for i, estimator in enumerate(model.estimators_):
        est_proba = estimator.predict_proba(X)[0]
        est_pred_idx = int(np.argmax(est_proba))
        est_pred_label = encoder.inverse_transform([est_pred_idx])[0] if encoder else str(est_pred_idx)
        model_breakdown.append({
            'model': model_names[i] if i < len(model_names) else f'model_{i}',
            'prediction': est_pred_label,
            'confidence': round(float(np.max(est_proba)) * 100, 1),
            'probabilities': {
                class_labels[j]: round(float(est_proba[j]) * 100, 1)
                for j in range(len(class_labels))
            }
        })

    # Calculate a composite risk score (0-100)
    # Mapping: Safe -> low risk, Risky -> ~50, Spoiled -> ~100
    p_safe = float(proba[class_labels.index('Safe')]) if 'Safe' in class_labels else 0.0
    p_risky = float(proba[class_labels.index('Risky')]) if 'Risky' in class_labels else 0.0
    p_spoiled = float(proba[class_labels.index('Spoiled')]) if 'Spoiled' in class_labels else 0.0
    
    risk_score = (p_risky * 50.0) + (p_spoiled * 100.0)

    # Calculate SHAP explainability values
    shap_explanation = None
    try:
        import shap
        # We use the XGBoost estimator (usually the first one, or we find it) for TreeExplainer
        xgb_estimator = None
        for i, name in enumerate(model_names):
            if name == 'XGBoost' and i < len(model.estimators_):
                xgb_estimator = model.estimators_[i]
                break
        if xgb_estimator is None:
            xgb_estimator = model.estimators_[0]
            
        explainer = shap.TreeExplainer(xgb_estimator)
        shap_values = explainer.shap_values(X)
        
        # Format SHAP values into a dictionary mapping feature names to their importance for this prediction
        # explainer.shap_values(X) might return a list of arrays (one for each class) for multiclass
        if isinstance(shap_values, list):
            # Take the SHAP values for the predicted class
            predicted_class_idx = class_labels.index(pred_label) if pred_label in class_labels else 0
            if predicted_class_idx < len(shap_values):
                target_shap = shap_values[predicted_class_idx][0]
            else:
                target_shap = shap_values[0][0]
        else:
            target_shap = shap_values[0]
            
        shap_explanation = {FEATURE_NAMES[i]: round(float(target_shap[i]), 4) for i in range(len(FEATURE_NAMES))}
    except Exception as e:
        logger.warning(f"SHAP failed: {e}")

    natural_storage_life = get_natural_storage_life(
        grain_type, 
        features_dict.get('Grain_Moisture', 13.0), 
        features_dict.get('Temperature', 25.0)
    )
    
    spoilage_trend = compute_spoilage_trend(
        temperature_history or [], 
        humidity_history or [], 
        moisture_history or []
    )

    return {
            'prediction': pred_label,
            'confidence': round(float(confidence) * 100, 1),  # Normalized: 0-100 scale (e.g. 72.3)
            'risk_score': round(risk_score, 1),
            'model_used': 'ensemble' if confidence >= 0.65 else 'ensemble_low_confidence',
            'trustworthy': confidence >= 0.65,
            'probabilities': {
                class_labels[j]: round(float(proba[j]) * 100, 1) for j in range(len(class_labels))
            },
            'ensemble_breakdown': model_breakdown,
            'shap_explanation': shap_explanation,
            'natural_storage_life': natural_storage_life,
            'spoilage_trend': spoilage_trend,
        }


def get_model_info():
    """Get current model metadata and metrics."""
    metadata_path = os.path.join(ML_DIR, 'model_metadata.json')
    if os.path.exists(metadata_path):
        with open(metadata_path) as f:
            return json.load(f)
    return None


if __name__ == '__main__':
    # Called by Node.js via sys.argv[1] or STDIN
    input_str = ""
    if len(sys.argv) > 1:
        input_str = sys.argv[1]
    else:
        # Read from STDIN
        input_str = sys.stdin.read()

    if input_str.strip():
        try:
            features_input = json.loads(input_str)
            # Map keys: Node.js sends camelCase / lowercase — normalise to model keys
            key_map = {
                'temperature': 'Temperature', 'humidity': 'Humidity',
                'storage_days': 'Storage_Days', 'airflow': 'Airflow',
                'dew_point': 'Dew_Point', 'ambient_light': 'Ambient_Light',
                'pest_presence': 'Pest_Presence', 'grain_moisture': 'Grain_Moisture',
                'rainfall': 'Rainfall', 'Grain_Moisture': 'Grain_Moisture',
            }
            normalised = {}
            for k, v in features_input.items():
                mapped = key_map.get(k, k)
                normalised[mapped] = v
            grain_type = features_input.get('grain_type', 'rice')
            temperature_history = features_input.get('temperature_history', [])
            humidity_history = features_input.get('humidity_history', [])
            moisture_history = features_input.get('moisture_history', [])
            
            result = predict_single(
                normalised, 
                grain_type, 
                temperature_history=temperature_history, 
                humidity_history=humidity_history, 
                moisture_history=moisture_history
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({'error': str(e), 'prediction': 'Unknown', 'confidence': 0}))
            sys.exit(1)
    else:
        # Self-test with safe conditions
        test_reading = {
            'Temperature': 28.0, 'Humidity': 65.0, 'Storage_Days': 20,
            'Airflow': 0.4, 'Dew_Point': 16.0, 'Ambient_Light': 100,
            'Pest_Presence': 0, 'Grain_Moisture': 13.0, 'Rainfall': 0.0,
        }
        result = predict_single(test_reading)
        print(json.dumps(result, indent=2))
