import json
import os
from datetime import datetime

DRIFT_LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "evaluation", "drift_logs.json")

def log_prediction_distribution(prediction_score: float, fraud_type: str = "payment"):
    """
    Logs prediction scores to monitor for data drift or model degradation.
    In a real system, this would write to a time-series database or Prometheus/Grafana.
    """
    # Create the evaluation dir if it doesn't exist
    os.makedirs(os.path.dirname(DRIFT_LOG_FILE), exist_ok=True)
    
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "score": prediction_score,
        "fraud_type": fraud_type
    }
    
    # Append to log file
    with open(DRIFT_LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")

def check_for_drift(window_size_hours: int = 24, threshold: float = 0.1):
    """
    Simulates checking the recent window of predictions against historical baseline.
    Returns True if drift detected, False otherwise.
    """
    if not os.path.exists(DRIFT_LOG_FILE):
        return False
        
    scores = []
    with open(DRIFT_LOG_FILE, "r") as f:
        for line in f:
            try:
                data = json.loads(line)
                scores.append(data["score"])
            except json.JSONDecodeError:
                continue
                
    if len(scores) < 100:
        return False # Not enough data
        
    # Simplified drift logic: if mean score shifts by threshold
    recent_mean = sum(scores[-100:]) / 100
    hist_mean = sum(scores[:-100]) / len(scores[:-100]) if len(scores) > 100 else recent_mean
    
    if abs(recent_mean - hist_mean) > threshold:
        print(f"WARNING: Drift detected. Historical Mean: {hist_mean:.3f}, Recent Mean: {recent_mean:.3f}")
        return True
        
    return False
