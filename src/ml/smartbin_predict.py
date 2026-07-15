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


def predict_single(features_dict, grain_type='rice'):
    """
    Predict spoilage for a single reading.

    Parameters:
        features_dict: dict with keys matching FEATURE_NAMES
        grain_type: which grain model to use (rice, wheat, maize, sorghum, barley)

    Returns:
        dict with prediction, confidence, per-model breakdown
    """
    model, encoder, metadata, is_legacy = load_model(grain_type)

    if model is None:
        return {
            'error': f'No model found for {grain_type}. Please retrain the model first.',
            'prediction': 'Unknown',
            'confidence': 0,
            'model_type': 'none',
            'grain_type': grain_type
        }

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
            'confidence': round(confidence * 100, 1),
            'model_type': 'legacy_single',
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

    return {
        'prediction': pred_label,
        'confidence': round(confidence * 100, 1),
        'model_type': 'ensemble',
        'probabilities': {
            class_labels[j]: round(float(proba[j]) * 100, 1) for j in range(len(class_labels))
        },
        'ensemble_breakdown': model_breakdown,
    }


def get_model_info():
    """Get current model metadata and metrics."""
    metadata_path = os.path.join(ML_DIR, 'model_metadata.json')
    if os.path.exists(metadata_path):
        with open(metadata_path) as f:
            return json.load(f)
    return None


if __name__ == '__main__':
    # Called by Node.js: python smartbin_predict.py '{"Temperature":30,...}'
    if len(sys.argv) > 1:
        try:
            features_input = json.loads(sys.argv[1])
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
            result = predict_single(normalised, grain_type)
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
