import numpy as np
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix, precision_recall_curve
)

def get_evaluation_metrics(y_true, y_pred, y_prob=None):
    """
    Computes comprehensive evaluation metrics.
    Prioritizes HIGH RECALL as per fraud detection requirements.
    """
    metrics = {
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0)
    }
    
    cm = confusion_matrix(y_true, y_pred)
    # Binary classification: tn, fp, fn, tp
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
        metrics["confusion_matrix"] = {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}
    else:
        metrics["confusion_matrix"] = cm.tolist()
        
    if y_prob is not None:
        try:
            metrics["roc_auc"] = roc_auc_score(y_true, y_prob)
            metrics["pr_auc"] = average_precision_score(y_true, y_prob)
        except ValueError:
            # E.g. only one class present in y_true
            pass
            
    return metrics

def optimize_threshold_for_recall(y_true, y_prob, target_recall=0.95):
    """
    Finds the threshold that achieves the target recall while maximizing precision.
    """
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_prob)
    
    # Filter thresholds where recall >= target_recall
    valid_idx = np.where(recalls >= target_recall)[0]
    
    if len(valid_idx) == 0:
        # Fallback to standard 0.5 or best F1
        return find_best_f1_threshold(y_true, y_prob)
        
    # Get index with highest precision among valid recalls
    best_idx = valid_idx[np.argmax(precisions[valid_idx])]
    
    # Handle the case where best_idx might be out of bounds for thresholds array
    if best_idx < len(thresholds):
        best_threshold = thresholds[best_idx]
    else:
        best_threshold = 0.5
        
    return best_threshold

def find_best_f1_threshold(y_true, y_prob):
    """
    Finds threshold that maximizes F1 score.
    """
    best_t, best_f1 = 0.5, -1.0
    for t in np.linspace(0.01, 0.99, 100):
        pred = (y_prob >= t).astype(int)
        fs = f1_score(y_true, pred, zero_division=0)
        if fs > best_f1:
            best_f1 = fs
            best_t = t
    return best_t
