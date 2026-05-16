import os
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier

from preprocessing.cleaning import clean_dataset, apply_scaling, get_stratified_split, get_class_weights
from evaluation.metrics import get_evaluation_metrics, optimize_threshold_for_recall

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_classification_models(X_train, y_train, X_test, y_test, model_name_prefix="payment"):
    """
    Trains multiple classification models and selects the best one based on Recall.
    """
    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=100, class_weight='balanced', max_depth=10, random_state=42, n_jobs=-1),
        "XGBoost": XGBClassifier(n_estimators=100, max_depth=6, scale_pos_weight=(len(y_train) - sum(y_train)) / sum(y_train) if sum(y_train)>0 else 1, random_state=42, n_jobs=-1),
        "LightGBM": LGBMClassifier(n_estimators=100, class_weight='balanced', random_state=42, n_jobs=-1),
        "CatBoost": CatBoostClassifier(iterations=100, auto_class_weights='Balanced', random_state=42, verbose=0, thread_count=-1)
    }

    results = {}
    best_model = None
    best_recall = -1
    best_name = ""

    for name, clf in models.items():
        print(f"Training {name}...")
        clf.fit(X_train, y_train)
        
        # Predict
        if hasattr(clf, "predict_proba"):
            y_prob = clf.predict_proba(X_test)[:, 1]
        else:
            y_prob = clf.predict(X_test) # fallback
            
        # Optimize threshold for high recall
        best_t = optimize_threshold_for_recall(y_test, y_prob, target_recall=0.90)
        y_pred = (y_prob >= best_t).astype(int)
        
        metrics = get_evaluation_metrics(y_test, y_pred, y_prob)
        print(f"[{name}] Recall: {metrics['recall']:.4f}, Precision: {metrics['precision']:.4f}, F1: {metrics['f1']:.4f}, Threshold: {best_t:.4f}")
        
        results[name] = {
            "model": clf,
            "metrics": metrics,
            "threshold": best_t
        }
        
        if metrics["recall"] > best_recall:
            best_recall = metrics["recall"]
            best_model = clf
            best_name = name

    print(f"Best Model: {best_name} with Recall: {best_recall:.4f}")
    
    # Save the best model
    model_path = os.path.join(MODELS_DIR, f"{model_name_prefix}_model.pkl")
    joblib.dump({
        "model_name": best_name,
        "model": best_model,
        "threshold": results[best_name]["threshold"],
        "metrics": results[best_name]["metrics"]
    }, model_path)
    print(f"Saved best model to {model_path}")
    
    return results

if __name__ == "__main__":
    # Test stub for running the script standalone
    print("This module is intended to be imported and run by a main training script.")
