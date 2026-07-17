import pandas as pd
import numpy as np
import joblib
import json
from datetime import datetime
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import optuna
import os

class SmartBinModelTrainer:
    def __init__(self, grain_type='combined'):
        self.grain_type = grain_type.lower()
        self.ml_dir = os.path.dirname(os.path.abspath(__file__))
        dataset_files = {
            "rice":    "rice_spoilage_10k.csv",
            "wheat":   "wheat_spoilage_10k.csv",
            "maize":   "maize_spoilage_10k.csv",
            "sorghum": "sorghum_spoilage_10k.csv",
            "barley":  "barley_spoilage_10k.csv",
            "combined": "grain_spoilage_dataset.csv",
        }
        base_file = dataset_files.get(self.grain_type, "grain_spoilage_dataset.csv")
        self.base_data_path = os.path.join(self.ml_dir, base_file)
        self.combined_data_path = os.path.join(self.ml_dir, f'combined_training_data_{self.grain_type}.csv')
        self.model = None
        self.label_encoder = LabelEncoder()
        self.feature_names = ['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point', 'Storage_Days', 'Airflow', 'Ambient_Light', 'Pest_Presence', 'Rainfall']
        self.training_history = []
        
    def load_and_preprocess_data(self):
        """Load and preprocess the dataset"""
        try:
            # Use data_manager to create combined dataset from base + any manual additions
            import sys
            sys.path.insert(0, self.ml_dir)
            from data_manager import DataManager
            data_manager = DataManager(grain_type=self.grain_type)
            data_manager.create_combined_dataset()
            
            # Load the combined dataset
            if os.path.exists(self.combined_data_path):
                df = pd.read_csv(self.combined_data_path)
                print(f"\u2705 Loaded combined dataset with {len(df)} records")
            else:
                df = pd.read_csv(self.base_data_path)
                print(f"\u2705 Loaded base dataset with {len(df)} records")
            
            # Normalize: Spoilage_Class (int) → Spoilage_Label (string)
            if 'Spoilage_Class' in df.columns and 'Spoilage_Label' not in df.columns:
                label_map = {0: 'Safe', 1: 'Risky', 2: 'Spoiled'}
                df['Spoilage_Label'] = df['Spoilage_Class'].map(lambda x: label_map.get(int(x), 'Safe') if pd.notna(x) else 'Safe')
            
            # Drop rows where Spoilage_Label is missing
            df = df.dropna(subset=['Spoilage_Label'])
            
            # Handle missing feature values
            for col in self.feature_names:
                if col not in df.columns:
                    df[col] = 0
            df[self.feature_names] = df[self.feature_names].fillna(df[self.feature_names].median())
            
            # Prepare features and target
            X = df[self.feature_names]
            y = df['Spoilage_Label']
            
            # Encode labels
            y_encoded = self.label_encoder.fit_transform(y)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
            )
            
            print(f"\u2705 Data split: {len(X_train)} train, {len(X_test)} test samples")
            print(f"   Classes: {dict(zip(self.label_encoder.classes_, np.bincount(y_encoded)))}")
            return X_train, X_test, y_train, y_test, df
            
        except Exception as e:
            print(f"\u274c Error loading data: {e}")
            import traceback
            traceback.print_exc()
            return None, None, None, None, None
    
    def hyperparameter_tuning(self, X_train, y_train, n_trials=30):
        """Optimize hyperparameters using Optuna"""
        def objective(trial):
            params = {
                'max_depth': trial.suggest_int('max_depth', 3, 12),
                'n_estimators': trial.suggest_int('n_estimators', 50, 500),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'gamma': trial.suggest_float('gamma', 0, 2),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 10),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 10)
            }
            
            model = XGBClassifier(**params, random_state=42)
            scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
            return scores.mean()
        
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=n_trials)
        
        print(f"✅ Hyperparameter tuning completed. Best score: {study.best_value:.4f}")
        return study.best_params
    
    def train_model(self, X_train, X_test, y_train, y_test, best_params=None):
        """Train the XGBoost model"""
        if best_params is None:
            best_params = {
                'max_depth': 6,
                'n_estimators': 200,
                'learning_rate': 0.1,
                'gamma': 0,
                'subsample': 0.8,
                'colsample_bytree': 0.8
            }
        
        # Train model
        self.model = XGBClassifier(**best_params, random_state=42)
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted')
        recall = recall_score(y_test, y_pred, average='weighted')
        f1 = f1_score(y_test, y_pred, average='weighted')
        
        # Cross-validation score
        cv_scores = cross_val_score(self.model, X_train, y_train, cv=5)
        
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'cv_mean': float(cv_scores.mean()),
            'cv_std': float(cv_scores.std()),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"✅ Model trained successfully!")
        print(f"   Accuracy: {accuracy:.4f}")
        print(f"   F1-Score: {f1:.4f}")
        print(f"   CV Score: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
        
        return metrics
    
    def save_model(self, metrics, best_params):
        """Save model and metadata"""
        try:
            model_path = os.path.join(self.ml_dir, f'{self.grain_type}_smartbin_model.pkl')
            encoder_path = os.path.join(self.ml_dir, f'{self.grain_type}_label_encoder.pkl')
            metadata_path = os.path.join(self.ml_dir, f'{self.grain_type}_smartbin_metadata.json')
            
            joblib.dump(self.model, model_path)
            joblib.dump(self.label_encoder, encoder_path)
            
            metadata = {
                'model_type': 'XGBoost',
                'version': '2.0.0',
                'features': self.feature_names,
                'label_classes': self.label_encoder.classes_.tolist(),
                'best_params': best_params,
                'metrics': metrics,
                'training_date': datetime.now().isoformat()
            }
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            print("\u2705 Model and metadata saved successfully")
            return True
            
        except Exception as e:
            print(f"\u274c Error saving model: {e}")
            return False
    
    def incremental_training(self, new_data_path=None):
        """Perform incremental training with new data"""
        if new_data_path and os.path.exists(new_data_path):
            # Load new data
            new_df = pd.read_csv(new_data_path)
            print(f"✅ Loaded {len(new_df)} new records for incremental training")

            # Combine with existing data (FIX #5: was self.data_path — undefined; now self.combined_data_path)
            base_path = self.combined_data_path if os.path.exists(self.combined_data_path) else self.base_data_path
            existing_df = pd.read_csv(base_path)
            combined_df = pd.concat([existing_df, new_df], ignore_index=True)

            # Write the updated combined dataset in place (no temp file needed)
            combined_df.to_csv(self.combined_data_path, index=False)
            print(f"✅ Combined dataset updated: {len(combined_df)} total records → {self.combined_data_path}")

            return True
        return False

    
    def get_feature_importance(self):
        """Get feature importance from the trained model"""
        if self.model is None:
            return None
        
        importance = self.model.feature_importances_
        feature_importance = dict(zip(self.feature_names, importance))
        return sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    
    def predict(self, input_data):
        """Make prediction on new data"""
        if self.model is None:
            return None
        
        try:
            # Ensure input is in correct format
            if isinstance(input_data, dict):
                input_array = np.array([[input_data.get(f, 0) for f in self.feature_names]])
            else:
                input_array = np.array(input_data).reshape(1, -1)
            
            prediction = self.model.predict(input_array)[0]
            probability = self.model.predict_proba(input_array)[0]
            
            # Decode prediction
            prediction_label = self.label_encoder.inverse_transform([prediction])[0]
            
            return {
                'prediction': prediction_label,
                'confidence': float(max(probability)),
                'probabilities': {
                    label: float(prob) for label, prob in zip(self.label_encoder.classes_, probability)
                }
            }
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return None

def main():
    """Main training function"""
    import sys
    grain_type = sys.argv[1] if len(sys.argv) > 1 else 'combined'
    print(f"🚀 Starting SmartBin Model Training for {grain_type.upper()}...")
    
    trainer = SmartBinModelTrainer(grain_type=grain_type)
    
    # Load data
    X_train, X_test, y_train, y_test, df = trainer.load_and_preprocess_data()
    if X_train is None:
        return
    
    # Hyperparameter tuning
    print("🔧 Optimizing hyperparameters...")
    best_params = trainer.hyperparameter_tuning(X_train, y_train, n_trials=20)
    
    # Train model
    print("🎯 Training model...")
    metrics = trainer.train_model(X_train, X_test, y_train, y_test, best_params)
    
    # Save model
    print("💾 Saving model...")
    success = trainer.save_model(metrics, best_params)
    
    if success:
        print("✅ Training completed successfully!")
        
        # Feature importance
        importance = trainer.get_feature_importance()
        print("\n📊 Feature Importance:")
        for feature, score in importance:
            print(f"   {feature}: {score:.4f}")
    else:
        print("❌ Training failed!")

if __name__ == "__main__":
    main()
