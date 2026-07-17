import json
import os
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from typing import Dict, List, Optional

class ModelPerformanceTracker:
    def __init__(self, grain_type='rice'):
        self.grain_type = grain_type.lower()
        self.ml_dir = os.path.dirname(os.path.abspath(__file__))
        self.performance_file = os.path.join(self.ml_dir, f'{self.grain_type}_model_performance.json')
        self.performance_history = self.load_performance_history()
    
    def load_performance_history(self):
        """Load existing performance history"""
        if os.path.exists(self.performance_file):
            try:
                with open(self.performance_file, 'r') as f:
                    return json.load(f)
            except:
                return {'training_sessions': [], 'performance_trends': {}}
        return {'training_sessions': [], 'performance_trends': {}}
    
    def save_performance_history(self):
        """Save performance history to file"""
        try:
            with open(self.performance_file, 'w') as f:
                json.dump(self.performance_history, f, indent=2)
            
            if self.grain_type == 'rice':
                fallback = os.path.join(self.ml_dir, 'model_performance.json')
                with open(fallback, 'w') as f:
                    json.dump(self.performance_history, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving performance history: {e}")
            return False
    
    def record_training_session(self, metrics: Dict, training_data_size: int, 
                              hyperparameters: Dict, improvement: Optional[Dict] = None):
        """Record a new training session"""
        session = {
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics,
            'training_data_size': training_data_size,
            'hyperparameters': hyperparameters,
            'improvement': improvement or {}
        }
        
        self.performance_history['training_sessions'].append(session)
        
        # Calculate improvement if this is not the first session
        if len(self.performance_history['training_sessions']) > 1:
            previous_session = self.performance_history['training_sessions'][-2]
            improvement = self.calculate_improvement(previous_session['metrics'], metrics)
            session['improvement'] = improvement
        
        self.save_performance_history()
        return session
    
    def calculate_improvement(self, previous_metrics: Dict, current_metrics: Dict) -> Dict:
        """Calculate improvement metrics"""
        improvement = {}
        
        for metric in ['accuracy', 'precision', 'recall', 'f1_score', 'cv_mean']:
            if metric in previous_metrics and metric in current_metrics:
                prev_val = previous_metrics[metric]
                curr_val = current_metrics[metric]
                improvement[f'{metric}_improvement'] = curr_val - prev_val
                improvement[f'{metric}_improvement_pct'] = ((curr_val - prev_val) / prev_val) * 100 if prev_val > 0 else 0
        
        return improvement
    
    def get_performance_summary(self) -> Dict:
        """Get overall performance summary"""
        if not self.performance_history['training_sessions']:
            return {}
        
        latest_session = self.performance_history['training_sessions'][-1]
        first_session = self.performance_history['training_sessions'][0]
        
        # Calculate overall improvement
        overall_improvement = self.calculate_improvement(
            first_session['metrics'], 
            latest_session['metrics']
        )
        
        # Calculate trends
        sessions = self.performance_history['training_sessions']
        accuracy_trend = [s['metrics']['accuracy'] for s in sessions]
        f1_trend = [s['metrics']['f1_score'] for s in sessions]
        
        return {
            'total_training_sessions': len(sessions),
            'latest_metrics': latest_session['metrics'],
            'overall_improvement': overall_improvement,
            'accuracy_trend': accuracy_trend,
            'f1_trend': f1_trend,
            'training_frequency': self.calculate_training_frequency(),
            'best_performance': self.get_best_performance()
        }
    
    def calculate_training_frequency(self) -> str:
        """Calculate how often the model is being retrained"""
        sessions = self.performance_history['training_sessions']
        if len(sessions) < 2:
            return "First training"
        
        # Calculate average time between training sessions
        timestamps = [datetime.fromisoformat(s['timestamp']) for s in sessions]
        time_diffs = [(timestamps[i+1] - timestamps[i]).days for i in range(len(timestamps)-1)]
        avg_days = sum(time_diffs) / len(time_diffs)
        
        if avg_days < 1:
            return "Multiple times daily"
        elif avg_days < 7:
            return f"Every {avg_days:.1f} days"
        elif avg_days < 30:
            return f"Every {avg_days/7:.1f} weeks"
        else:
            return f"Every {avg_days/30:.1f} months"
    
    def get_best_performance(self) -> Dict:
        """Get the best performance metrics achieved"""
        sessions = self.performance_history['training_sessions']
        if not sessions:
            return {}
        
        best_accuracy = max(sessions, key=lambda x: x['metrics']['accuracy'])
        best_f1 = max(sessions, key=lambda x: x['metrics']['f1_score'])
        
        return {
            'best_accuracy': {
                'value': best_accuracy['metrics']['accuracy'],
                'timestamp': best_accuracy['timestamp']
            },
            'best_f1': {
                'value': best_f1['metrics']['f1_score'],
                'timestamp': best_f1['timestamp']
            }
        }
    
    def get_training_insights(self) -> Dict:
        """Get insights about the training process"""
        sessions = self.performance_history['training_sessions']
        if len(sessions) < 2:
            return {'insights': ['Not enough data for insights yet']}
        
        insights = []
        
        # Check for consistent improvement
        recent_sessions = sessions[-3:] if len(sessions) >= 3 else sessions
        accuracy_values = [s['metrics']['accuracy'] for s in recent_sessions]
        
        if all(accuracy_values[i] <= accuracy_values[i+1] for i in range(len(accuracy_values)-1)):
            insights.append("✅ Model shows consistent improvement in recent training sessions")
        elif accuracy_values[-1] > accuracy_values[0]:
            insights.append("📈 Overall improvement since first training")
        else:
            insights.append("⚠️ Recent performance may need attention")
        
        # Check training frequency
        frequency = self.calculate_training_frequency()
        if "daily" in frequency:
            insights.append("🔄 High training frequency - model is actively learning")
        elif "weekly" in frequency:
            insights.append("📅 Regular training schedule maintained")
        else:
            insights.append("⏰ Consider more frequent training for better performance")
        
        # Check data growth
        data_sizes = [s['training_data_size'] for s in sessions]
        if data_sizes[-1] > data_sizes[0]:
            growth = ((data_sizes[-1] - data_sizes[0]) / data_sizes[0]) * 100
            insights.append(f"📊 Training data increased by {growth:.1f}% since first training")
        
        return {'insights': insights}
    
    def generate_training_report(self) -> Dict:
        """Generate a comprehensive training report"""
        summary = self.get_performance_summary()
        insights = self.get_training_insights()
        
        return {
            'summary': summary,
            'insights': insights,
            'recommendations': self.get_recommendations()
        }
    
    def get_recommendations(self) -> List[str]:
        """Get recommendations for model improvement"""
        sessions = self.performance_history['training_sessions']
        if not sessions:
            return ["Start training the model to see recommendations"]
        
        recommendations = []
        latest = sessions[-1]
        
        # Check accuracy
        if latest['metrics']['accuracy'] < 0.85:
            recommendations.append("🎯 Consider collecting more diverse training data")
        
        # Check F1 score
        if latest['metrics']['f1_score'] < 0.80:
            recommendations.append("⚖️ Model may need better class balance handling")
        
        # Check CV score
        if latest['metrics']['cv_std'] > 0.05:
            recommendations.append("🔄 High variance suggests need for more training data")
        
        # Check training frequency
        if len(sessions) < 3:
            recommendations.append("📈 Train more frequently to improve performance")
        
        if not recommendations:
            recommendations.append("✅ Model performance looks good! Continue regular training")
        
        return recommendations


# Global instance removed. Instantiate per-grain where needed.

if __name__ == '__main__':
    import sys
    command = sys.argv[1] if len(sys.argv) > 1 else 'get_summary'
    grain_type = sys.argv[2] if len(sys.argv) > 2 else 'rice'
    
    performance_tracker = ModelPerformanceTracker(grain_type=grain_type)

    if command == 'get_summary':
        summary = performance_tracker.get_performance_summary()
        insights = performance_tracker.get_training_insights()
        recommendations = performance_tracker.get_recommendations()
        print(json.dumps({
            'summary': summary,
            'insights': insights,
            'recommendations': recommendations
        }))
    elif command == 'get_history':
        history = performance_tracker.performance_history
        print(json.dumps({
            'training_sessions': history.get('training_sessions', []),
            'performance_trends': history.get('performance_trends', {})
        }))
    else:
        print(json.dumps({'error': f'Unknown command: {command}'}))
        sys.exit(1)
