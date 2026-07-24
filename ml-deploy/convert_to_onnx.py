import os
import glob
import joblib
import warnings
import numpy as np

# Supress warnings
warnings.filterwarnings('ignore')

from skl2onnx import convert_sklearn, update_registered_converter
from skl2onnx.common.data_types import FloatTensorType

# Register XGBoost
from skl2onnx.common.shape_calculator import calculate_linear_classifier_output_shapes
from onnxmltools.convert.xgboost.operator_converters.XGBoost import convert_xgboost

def register_custom_converters():
    try:
        from xgboost import XGBClassifier
        update_registered_converter(
            XGBClassifier, 'XGBoostXGBClassifier',
            calculate_linear_classifier_output_shapes, convert_xgboost,
            options={'nocl': [True, False], 'zipmap': [True, False, 'columns']}
        )
    except ImportError:
        pass

def convert_all_models():
    register_custom_converters()
    
    # We have 9 features
    initial_type = [('float_input', FloatTensorType([None, 9]))]
    
    pkl_files = glob.glob('*_ensemble_model.pkl')
    if not pkl_files and os.path.exists('ensemble_model.pkl'):
        pkl_files = ['ensemble_model.pkl']
        
    for pkl_file in pkl_files:
        print(f"Loading {pkl_file}...")
        try:
            model = joblib.load(pkl_file)
            
            # Fix skl2onnx NotImplementedError for VotingClassifier
            if hasattr(model, 'flatten_transform'):
                model.flatten_transform = False
            
            # Remove LightGBM from the ensemble before conversion
            # The library conflict is unresolvable without downgrading.
            # We will use HistGradientBoosting in future retrains.
            if hasattr(model, 'estimators'):
                model.estimators = [(n, e) for n, e in model.estimators if 'lgb' not in n.lower()]
            if hasattr(model, 'estimators_'):
                model.estimators_ = [e for e in model.estimators_ if not e.__class__.__name__ == 'LGBMClassifier']
            if hasattr(model, 'named_estimators_'):
                model.named_estimators_ = {k: v for k, v in model.named_estimators_.items() if not v.__class__.__name__ == 'LGBMClassifier'}

            # Fix XGBoost feature name issue (onnxmltools expects f0, f1...)
            if hasattr(model, 'estimators_'):
                for est in model.estimators_:
                    if hasattr(est, 'get_booster'): # XGBoost
                        booster = est.get_booster()
                        if hasattr(booster, 'feature_names'):
                            booster.feature_names = [f'f{i}' for i in range(9)]
            
            # Convert
            print(f"Converting {pkl_file} to ONNX...")
            onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset={'': 12, 'ai.onnx.ml': 3})
            
            # Save
            onnx_filename = pkl_file.replace('.pkl', '.onnx')
            with open(onnx_filename, "wb") as f:
                f.write(onnx_model.SerializeToString())
            print(f"SUCCESS: Created {onnx_filename}")
        except Exception as e:
            print(f"FAILED to convert {pkl_file}: {e}")

if __name__ == '__main__':
    convert_all_models()
