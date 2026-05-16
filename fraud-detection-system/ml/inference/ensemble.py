def combine_scores(ml_score: float, anomaly_score: float, rule_score: float) -> float:
    """
    Combines outputs from different systems into a single final score.
    
    Weights as requested:
    0.5 * xgboost_score + 0.3 * anomaly_score + 0.2 * rule_score
    
    Inputs:
    - ml_score: Probability from primary classification model (0.0 to 1.0)
    - anomaly_score: Score from anomaly model (0.0 to 1.0)
    - rule_score: Score from rule engine (scaled 0.0 to 1.0, e.g., raw_score / 100)
    
    Returns:
    - final_score: A combined score between 0.0 and 1.0
    """
    
    # Ensure inputs are clamped between 0 and 1
    ml_s = max(0.0, min(1.0, ml_score))
    an_s = max(0.0, min(1.0, anomaly_score))
    ru_s = max(0.0, min(1.0, rule_score))
    
    final_score = (0.5 * ml_s) + (0.3 * an_s) + (0.2 * ru_s)
    
    return final_score
