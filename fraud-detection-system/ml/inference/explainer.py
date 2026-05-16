def generate_explanation(final_score: float, rule_reasons: list, ml_score: float, anomaly_score: float) -> dict:
    """
    Translates the raw ensemble score into a human-readable risk profile.
    
    Inputs:
    - final_score: float between 0 and 1
    - rule_reasons: list of strings indicating triggered rules
    - ml_score: float between 0 and 1
    - anomaly_score: float between 0 and 1
    """
    
    # Scale score to 0-100
    risk_score = int(final_score * 100)
    
    # Standardized Decision
    if risk_score >= 80:
        risk_level = "critical"
        decision = "BLOCK"
    elif risk_score >= 60:
        risk_level = "high"
        decision = "BLOCK"
    elif risk_score >= 35:
        risk_level = "medium"
        decision = "REVIEW"
    else:
        risk_level = "low"
        decision = "ALLOW"
        
    # Calculate Confidence
    model_variance = abs(ml_score - anomaly_score)
    base_confidence = abs(final_score - 0.5) * 2
    confidence_penalty = model_variance * 0.2
    confidence = max(0.5, min(0.99, base_confidence + 0.5 - confidence_penalty))
    
    # Compile Reasons
    reasons = list(rule_reasons)
    # SHAP reasons will be passed in from predict.py via rule_reasons or a new param
    
    if not reasons and decision == "ALLOW":
        reasons.append("Transaction characteristics match normal behavior profiles")
        
    return {
        "risk_score": risk_score,
        "decision": decision,
        "risk_level": risk_level,
        "confidence": round(float(confidence), 2),
        "reasons": reasons
    }
