import pandas as pd

# Define the rules
RULES = [
    {
        "id": "R001",
        "description": "High transaction amount",
        "condition": lambda x: x.get("Amount", 0) > 5000,
        "score": 20,
        "reason": "high transaction amount"
    },
    {
        "id": "R002",
        "description": "Country mismatch",
        "condition": lambda x: x.get("country_mismatch", 0) == 1,
        "score": 15,
        "reason": "country mismatch"
    },
    {
        "id": "R003",
        "description": "New device used",
        "condition": lambda x: x.get("new_device", 0) == 1,
        "score": 10,
        "reason": "new device"
    },
    {
        "id": "R004",
        "description": "Night transaction",
        "condition": lambda x: x.get("night_transaction", 0) == 1,
        "score": 5,
        "reason": "night transaction"
    },
    {
        "id": "R005",
        "description": "High velocity",
        "condition": lambda x: x.get("transactions_last_1h", 0) > 5,
        "score": 15,
        "reason": "high transaction velocity"
    }
]

def evaluate_rules(transaction: dict):
    """
    Evaluates a single transaction against the predefined rules.
    Returns the total rule score and a list of triggered reasons.
    """
    total_score = 0
    triggered_reasons = []
    
    for rule in RULES:
        try:
            if rule["condition"](transaction):
                total_score += rule["score"]
                triggered_reasons.append(rule["reason"])
        except Exception as e:
            # Handle missing keys gracefully
            continue
            
    # Cap rule score at 100 for normalization purposes later
    total_score = min(total_score, 100)
    
    return total_score, triggered_reasons
