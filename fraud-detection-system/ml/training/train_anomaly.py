import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.neighbors import LocalOutlierFactor
from evaluation.metrics import get_evaluation_metrics

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_anomaly_models(X_train, y_train, X_test, y_test, contamination=0.05):
    """
    Trains Anomaly Detection models: Isolation Forest, One-Class SVM, Local Outlier Factor.
    Note: Anomaly models usually train on ONLY normal data (y=0), but sometimes they can 
    tolerate contaminated data. We'll train on mostly normal data.
    """
    # Filter only normal transactions for training (or mostly normal)
    X_train_normal = X_train[y_train == 0]
    
    models = {
        "IsolationForest": IsolationForest(contamination=contamination, random_state=42, n_jobs=-1),
        "OneClassSVM": OneClassSVM(nu=contamination, kernel="rbf", gamma="auto"),
        "LocalOutlierFactor": LocalOutlierFactor(contamination=contamination, novelty=True, n_jobs=-1)
    }

    results = {}
    best_model = None
    best_recall = -1
    best_name = ""

    for name, clf in models.items():
        print(f"Training Anomaly Model: {name}...")
        
        # Fit on normal data
        clf.fit(X_train_normal)
        
        # Predict on test set
        # Returns -1 for outliers (fraud) and 1 for inliers (normal)
        y_pred_raw = clf.predict(X_test)
        
        # Convert to 1 for fraud, 0 for normal
        y_pred = np.where(y_pred_raw == -1, 1, 0)
        
        metrics = get_evaluation_metrics(y_test, y_pred)
        print(f"[{name}] Recall: {metrics['recall']:.4f}, Precision: {metrics['precision']:.4f}, F1: {metrics['f1']:.4f}")
        
        results[name] = {
            "model": clf,
            "metrics": metrics
        }
        
        if metrics["recall"] > best_recall:
            best_recall = metrics["recall"]
            best_model = clf
            best_name = name

    print(f"Best Anomaly Model: {best_name} with Recall: {best_recall:.4f}")
    
    # Save the best model
    model_path = os.path.join(MODELS_DIR, "anomaly_model.pkl")
    joblib.dump({
        "model_name": best_name,
        "model": best_model,
        "metrics": results[best_name]["metrics"]
    }, model_path)
    print(f"Saved best anomaly model to {model_path}")
    
    return results

if __name__ == "__main__":
    print("This module is intended to be imported and run by a main training script.")
