"""
GrainHero Ensemble Model Trainer
================================
Trains XGBoost + Random Forest + LightGBM with soft voting.
Used by the backend retrain-public endpoint.
Supports multiple grain types via CLI argument.

Based on Weka evaluation results:
  - Random Forest:  97.26% accuracy
  - J48/Tree:       96.44% accuracy
  - Stacking:       97.16% accuracy
  -> Ensemble of XGBoost + RF + LightGBM with soft voting expected: 96-99%
"""
import pandas as pd
import numpy as np
import joblib
import json
import os
import sys
from datetime import datetime
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, classification_report, confusion_matrix)
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from imblearn.over_sampling import SMOTE
import optuna
import warnings

warnings.filterwarnings('ignore')
optuna.logging.set_verbosity(optuna.logging.WARNING)

# Fix Windows encoding issues
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ML_DIR = os.path.dirname(os.path.abspath(__file__))

SUPPORTED_GRAINS = ['rice', 'wheat', 'maize', 'sorghum', 'barley']


class GrainEnsembleTrainer:
    """Trains an ensemble of XGBoost + Random Forest + LightGBM with soft voting."""

    def __init__(self, grain_type='rice', dataset_path=None):
        self.grain_type = grain_type.lower()
        
        # Map to the same files that live_append_pipeline.py uses
        dataset_mapping = {
            "rice":    "grain_spoilage_dataset.csv",
            "wheat":   "wheat_spoilage_10k.csv",
            "maize":   "maize_spoilage_10k.csv",
            "sorghum": "sorghum_spoilage_10k.csv",
            "barley":  "barley_spoilage_10k.csv",
        }
        filename = dataset_mapping.get(self.grain_type, f'{self.grain_type}_spoilage_10k.csv')
        self.dataset_path = dataset_path or os.path.join(ML_DIR, filename)
        self.feature_names = [
            'Temperature', 'Humidity', 'Storage_Days', 'Airflow',
            'Dew_Point', 'Ambient_Light', 'Pest_Presence',
            'Grain_Moisture', 'Rainfall'
        ]
        self.label_encoder = LabelEncoder()
        self.ensemble = None
        self.individual_models = {}
        self.metrics = {}

    def load_data(self):
        """Load and preprocess the dataset."""
        print(f"Loading dataset: {self.dataset_path}")
        if not os.path.exists(self.dataset_path):
            print(f"Dataset not found: {self.dataset_path}")
            return None, None, None, None

        df = pd.read_csv(self.dataset_path)
        print(f"   Rows: {len(df)}")

        # Normalize label column
        if 'Spoilage_Label' in df.columns:
            label_col = 'Spoilage_Label'
        elif 'Spoilage_Class' in df.columns:
            label_map = {0: 'Safe', 1: 'Risky', 2: 'Spoiled'}
            df['Spoilage_Label'] = df['Spoilage_Class'].map(
                lambda x: label_map.get(int(x), 'Safe') if pd.notna(x) else 'Safe'
            )
            label_col = 'Spoilage_Label'
        else:
            print("No Spoilage_Label or Spoilage_Class column found")
            return None, None, None, None

        df = df.dropna(subset=[label_col])

        # Ensure all features exist
        for col in self.feature_names:
            if col not in df.columns:
                df[col] = 0
        df[self.feature_names] = df[self.feature_names].apply(pd.to_numeric, errors='coerce')
        df[self.feature_names] = df[self.feature_names].fillna(df[self.feature_names].median())

        X = df[self.feature_names]
        y = self.label_encoder.fit_transform(df[label_col])

        print(f"   Classes: {dict(zip(self.label_encoder.classes_, np.bincount(y)))}")
        print(f"   Features: {self.feature_names}")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        print(f"   Train: {len(X_train)}, Test: {len(X_test)}")
        
        # SMOTE Class Balance Check
        class_counts = np.bincount(y_train)
        total_train = len(y_train)
        print(f"   Original Training Distribution: {dict(zip(self.label_encoder.classes_, class_counts))}")
        
        needs_smote = False
        for count in class_counts:
            if (count / total_train) < 0.20:
                needs_smote = True
                break
                
        if needs_smote:
            print("   ⚠️ Class imbalance detected (< 20%). Applying SMOTE...")
            smote = SMOTE(random_state=42)
            X_train, y_train = smote.fit_resample(X_train, y_train)
            new_counts = np.bincount(y_train)
            print(f"   Balanced Training Distribution: {dict(zip(self.label_encoder.classes_, new_counts))}")
            
        return X_train, X_test, y_train, y_test

    def _tune_xgboost(self, X_train, y_train, n_trials=15):
        n_classes = len(np.unique(y_train))
        def objective(trial):
            params = {
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'n_estimators': trial.suggest_int('n_estimators', 100, 500),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'gamma': trial.suggest_float('gamma', 0, 2),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 5),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 5),
            }
            model = XGBClassifier(**params, random_state=42, verbosity=0,
                                  num_class=n_classes, objective='multi:softprob')
            scores = cross_val_score(model, X_train, y_train, cv=3, scoring='accuracy', n_jobs=1)
            return scores.mean()
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
        print(f"   XGBoost best CV: {study.best_value:.4f}")
        return study.best_params

    def _tune_rf(self, X_train, y_train, n_trials=15):
        def objective(trial):
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 100, 600),
                'max_depth': trial.suggest_int('max_depth', 5, 30),
                'min_samples_split': trial.suggest_int('min_samples_split', 2, 10),
                'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 5),
                'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2']),
            }
            model = RandomForestClassifier(**params, random_state=42, n_jobs=1)
            scores = cross_val_score(model, X_train, y_train, cv=3, scoring='accuracy', n_jobs=1)
            return scores.mean()
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
        print(f"   RandomForest best CV: {study.best_value:.4f}")
        return study.best_params

    def _tune_lgbm(self, X_train, y_train, n_trials=15):
        def objective(trial):
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 100, 500),
                'max_depth': trial.suggest_int('max_depth', 3, 15),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'num_leaves': trial.suggest_int('num_leaves', 20, 100),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 5),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 5),
            }
            model = LGBMClassifier(**params, random_state=42, verbosity=-1, n_jobs=1)
            scores = cross_val_score(model, X_train, y_train, cv=3, scoring='accuracy', n_jobs=1)
            return scores.mean()
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
        print(f"   LightGBM best CV: {study.best_value:.4f}")
        return study.best_params

    def train(self, X_train, X_test, y_train, y_test, n_tuning_trials=15):
        """Train all 3 models + ensemble."""
        n_classes = len(np.unique(y_train))

        print("\nTuning XGBoost...")
        xgb_params = self._tune_xgboost(X_train, y_train, n_tuning_trials)
        print("Tuning Random Forest...")
        rf_params = self._tune_rf(X_train, y_train, n_tuning_trials)
        print("Tuning LightGBM...")
        lgbm_params = self._tune_lgbm(X_train, y_train, n_tuning_trials)

        xgb_model = XGBClassifier(**xgb_params, random_state=42, verbosity=0,
                                   num_class=n_classes, objective='multi:softprob')
        rf_model = RandomForestClassifier(**rf_params, random_state=42, n_jobs=1)
        lgbm_model = LGBMClassifier(**lgbm_params, random_state=42, verbosity=-1, n_jobs=1)

        print("\nTraining individual models...")
        models = {
            'XGBoost': xgb_model,
            'RandomForest': rf_model,
            'LightGBM': lgbm_model,
        }
        best_params_all = {
            'XGBoost': xgb_params,
            'RandomForest': rf_params,
            'LightGBM': lgbm_params,
        }

        for name, model in models.items():
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            acc = accuracy_score(y_test, y_pred)
            prec = precision_score(y_test, y_pred, average='weighted')
            rec = recall_score(y_test, y_pred, average='weighted')
            f1 = f1_score(y_test, y_pred, average='weighted')
            cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')

            self.metrics[name] = {
                'accuracy': round(float(acc), 4),
                'precision': round(float(prec), 4),
                'recall': round(float(rec), 4),
                'f1_score': round(float(f1), 4),
                'cv_mean': round(float(cv_scores.mean()), 4),
                'cv_std': round(float(cv_scores.std()), 4),
            }
            self.individual_models[name] = model
            print(f"   {name}: Acc={acc:.4f}, F1={f1:.4f}, CV={cv_scores.mean():.4f}")

        print("\nBuilding soft voting ensemble...")
        self.ensemble = VotingClassifier(
            estimators=[('xgb', xgb_model), ('rf', rf_model), ('lgbm', lgbm_model)],
            voting='soft', n_jobs=1
        )
        self.ensemble.fit(X_train, y_train)
        y_pred_ensemble = self.ensemble.predict(X_test)

        ens_acc = accuracy_score(y_test, y_pred_ensemble)
        ens_prec = precision_score(y_test, y_pred_ensemble, average='weighted')
        ens_rec = recall_score(y_test, y_pred_ensemble, average='weighted')
        ens_f1 = f1_score(y_test, y_pred_ensemble, average='weighted')
        cv_ens = cross_val_score(self.ensemble, X_train, y_train, cv=5, scoring='accuracy')

        self.metrics['Ensemble'] = {
            'accuracy': round(float(ens_acc), 4),
            'precision': round(float(ens_prec), 4),
            'recall': round(float(ens_rec), 4),
            'f1_score': round(float(ens_f1), 4),
            'cv_mean': round(float(cv_ens.mean()), 4),
            'cv_std': round(float(cv_ens.std()), 4),
        }
        print(f"   Ensemble: Acc={ens_acc:.4f}, F1={ens_f1:.4f}, CV={cv_ens.mean():.4f}")

        # Feature importance (average across all 3)
        importances = np.zeros(len(self.feature_names))
        for model in [xgb_model, rf_model, lgbm_model]:
            importances += model.feature_importances_
        importances /= 3
        self.feature_importance = sorted(
            zip(self.feature_names, importances), key=lambda x: x[1], reverse=True
        )

        cm = confusion_matrix(y_test, y_pred_ensemble)
        print(f"\nConfusion Matrix (Ensemble):")
        print(f"   Classes: {list(self.label_encoder.classes_)}")
        print(f"   {cm}")

        return self.metrics, best_params_all

    def save(self, best_params_all):
        """Save ensemble model, label encoder, and metadata."""
        prefix = self.grain_type
        
        # Output directly to huggingface_deployment folder
        # ML_DIR is legacy-backend/ml, so HF is ../../huggingface_deployment
        HF_DIR = os.path.abspath(os.path.join(ML_DIR, '..', '..', 'huggingface_deployment'))
        os.makedirs(HF_DIR, exist_ok=True)

        ensemble_path = os.path.join(HF_DIR, f'{prefix}_ensemble_model.pkl')
        encoder_path = os.path.join(HF_DIR, f'{prefix}_label_encoder.pkl')
        metadata_path = os.path.join(HF_DIR, f'{prefix}_model_metadata.json')

        joblib.dump(self.ensemble, ensemble_path)
        joblib.dump(self.label_encoder, encoder_path)

        # Backward compat: rice also saves as default names
        if self.grain_type == 'rice':
            joblib.dump(self.ensemble, os.path.join(HF_DIR, 'ensemble_model.pkl'))
            joblib.dump(self.ensemble, os.path.join(HF_DIR, 'smartbin_model.pkl'))
            joblib.dump(self.label_encoder, os.path.join(HF_DIR, 'label_encoder.pkl'))

        # Count dataset rows
        dataset_rows = 0
        try:
            with open(self.dataset_path) as f:
                dataset_rows = sum(1 for _ in f) - 1
        except Exception:
            pass

        metadata = {
            'model_type': 'Soft Voting Ensemble (XGBoost + RandomForest + LightGBM)',
            'version': '3.0.0',
            'grain_type': self.grain_type,
            'features': self.feature_names,
            'label_classes': list(self.label_encoder.classes_),
            'best_params': best_params_all,
            'metrics': self.metrics,
            'feature_importance': self.feature_importance,
            'training_date': datetime.now().isoformat(),
            'dataset': self.dataset_path,
            'dataset_rows': dataset_rows,
            'weka_comparison': {
                'Random Forest (Weka)': {'accuracy': 0.9726, 'f1': 0.973},
                'J48 (Weka)': {'accuracy': 0.9644, 'f1': 0.964},
                'Stacking (Weka)': {'accuracy': 0.9716, 'f1': 0.972},
            }
        }

        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)
        if self.grain_type == 'rice':
            with open(os.path.join(HF_DIR, 'model_metadata.json'), 'w') as f:
                json.dump(metadata, f, indent=2, default=str)

        print(f"Saved ({self.grain_type}): {ensemble_path}")


def main():
    """Main entry point -- called by the backend retrain-public endpoint."""
    grain_type = 'rice'
    if len(sys.argv) > 1 and sys.argv[1] in SUPPORTED_GRAINS:
        grain_type = sys.argv[1]

    print("=" * 60)
    print(f"GrainHero Ensemble Training - {grain_type.upper()}")
    print("   XGBoost + Random Forest + LightGBM (Soft Voting)")
    print("=" * 60)

    trainer = GrainEnsembleTrainer(grain_type=grain_type)

    X_train, X_test, y_train, y_test = trainer.load_data()
    if X_train is None:
        print("Failed to load data")
        sys.exit(1)

    metrics, best_params = trainer.train(X_train, X_test, y_train, y_test, n_tuning_trials=15)
    trainer.save(best_params)

    print("\n" + "=" * 60)
    print(f"TRAINING COMPLETE - {grain_type.upper()}")
    print("=" * 60)
    for name, m in metrics.items():
        print(f"   {name:15s}  Acc={m['accuracy']:.4f}  F1={m['f1_score']:.4f}  CV={m['cv_mean']:.4f}")

    print("\n__METRICS_JSON__")
    output_data = dict(metrics)
    output_data['_grain_type'] = grain_type
    print(json.dumps(output_data, indent=2))
    print("__END_METRICS__")


if __name__ == '__main__':
    main()
