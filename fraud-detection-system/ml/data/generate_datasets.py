import os
import pandas as pd
import numpy as np

# Ensure data directories exist
RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")
os.makedirs(RAW_DIR, exist_ok=True)

def generate_account_fraud(num_samples=10000):
    """
    Features: ip_risk, failed_attempts, new_location, device_reputation
    Label: is_fraud (suspicious logins, account takeover, fake accounts)
    """
    np.random.seed(42)
    
    # Legit (95%)
    num_legit = int(num_samples * 0.95)
    legit_ip_risk = np.random.uniform(0, 0.3, num_legit)
    legit_failed_attempts = np.random.poisson(0.1, num_legit)
    legit_new_location = np.random.choice([0, 1], p=[0.9, 0.1], size=num_legit)
    legit_device_rep = np.random.uniform(0.7, 1.0, num_legit)
    legit_label = np.zeros(num_legit)
    
    # Fraud (5%)
    num_fraud = num_samples - num_legit
    fraud_ip_risk = np.random.uniform(0.6, 1.0, num_fraud)
    fraud_failed_attempts = np.random.poisson(3.5, num_fraud)
    fraud_new_location = np.random.choice([0, 1], p=[0.2, 0.8], size=num_fraud)
    fraud_device_rep = np.random.uniform(0.0, 0.4, num_fraud)
    fraud_label = np.ones(num_fraud)
    
    df = pd.DataFrame({
        "ip_risk": np.concatenate([legit_ip_risk, fraud_ip_risk]),
        "failed_attempts": np.concatenate([legit_failed_attempts, fraud_failed_attempts]),
        "new_location": np.concatenate([legit_new_location, fraud_new_location]),
        "device_reputation": np.concatenate([legit_device_rep, fraud_device_rep]),
        "is_fraud": np.concatenate([legit_label, fraud_label])
    })
    
    # Shuffle
    df = df.sample(frac=1).reset_index(drop=True)
    
    filepath = os.path.join(RAW_DIR, "account_fraud.csv")
    df.to_csv(filepath, index=False)
    print(f"Generated {filepath} ({len(df)} rows)")

def generate_refund_abuse(num_samples=8000):
    """
    Features: repeated_refunds, claim_amount, days_since_purchase, promo_abuse_score
    Label: is_abuse
    """
    np.random.seed(43)
    
    num_legit = int(num_samples * 0.92)
    num_fraud = num_samples - num_legit
    
    df_legit = pd.DataFrame({
        "repeated_refunds": np.random.poisson(0.5, num_legit),
        "claim_amount": np.random.exponential(40, num_legit),
        "days_since_purchase": np.random.randint(1, 30, num_legit),
        "promo_abuse_score": np.random.uniform(0, 0.2, num_legit),
        "is_abuse": 0
    })
    
    df_fraud = pd.DataFrame({
        "repeated_refunds": np.random.poisson(4, num_fraud),
        "claim_amount": np.random.exponential(150, num_fraud),
        "days_since_purchase": np.random.randint(25, 60, num_fraud),
        "promo_abuse_score": np.random.uniform(0.7, 1.0, num_fraud),
        "is_abuse": 1
    })
    
    df = pd.concat([df_legit, df_fraud]).sample(frac=1).reset_index(drop=True)
    filepath = os.path.join(RAW_DIR, "refund_abuse.csv")
    df.to_csv(filepath, index=False)
    print(f"Generated {filepath} ({len(df)} rows)")

def generate_bot_detection(num_samples=15000):
    """
    Features: request_velocity, repetitive_actions, automation_patterns_score
    Label: is_bot
    """
    np.random.seed(44)
    
    num_legit = int(num_samples * 0.90)
    num_fraud = num_samples - num_legit
    
    df_legit = pd.DataFrame({
        "request_velocity": np.random.exponential(5, num_legit), # requests per min
        "repetitive_actions": np.random.poisson(1, num_legit),
        "automation_patterns_score": np.random.uniform(0, 0.3, num_legit),
        "is_bot": 0
    })
    
    df_fraud = pd.DataFrame({
        "request_velocity": np.random.exponential(60, num_fraud),
        "repetitive_actions": np.random.poisson(15, num_fraud),
        "automation_patterns_score": np.random.uniform(0.8, 1.0, num_fraud),
        "is_bot": 1
    })
    
    df = pd.concat([df_legit, df_fraud]).sample(frac=1).reset_index(drop=True)
    filepath = os.path.join(RAW_DIR, "bot_detection.csv")
    df.to_csv(filepath, index=False)
    print(f"Generated {filepath} ({len(df)} rows)")

def generate_synthetic_attack_samples(base_df_path, out_path, num_samples=1000):
    """
    Injects synthetic complex attack patterns into existing dataset (edge cases).
    """
    if not os.path.exists(base_df_path):
        print(f"Cannot generate attack samples, {base_df_path} missing.")
        return
        
    df = pd.read_csv(base_df_path)
    
    # We'll just create a pure synthetic set of edge cases for the main model
    # High amount but normal behavior, low amount but weird behavior, etc.
    cols = df.columns
    attack_data = {}
    
    for c in cols:
        if c == 'Class' or c == 'is_fraud':
            attack_data[c] = np.ones(num_samples) # All attacks are fraud
        elif c == 'Amount':
            attack_data[c] = np.random.exponential(1000, num_samples) # large amounts
        elif c == 'Time':
            attack_data[c] = np.random.uniform(0, 172800, num_samples)
        else:
            # Random noise for V1-V28
            attack_data[c] = np.random.normal(0, 5, num_samples)
            
    df_attacks = pd.DataFrame(attack_data)
    
    df_combined = pd.concat([df, df_attacks]).sample(frac=1).reset_index(drop=True)
    df_combined.to_csv(out_path, index=False)
    print(f"Generated edge case synthetic samples in {out_path} ({len(df_combined)} rows)")

if __name__ == "__main__":
    print("Generating synthetic datasets...")
    generate_account_fraud()
    generate_refund_abuse()
    generate_bot_detection()
    
    cc_path = os.path.join(RAW_DIR, "creditcard.csv")
    cc_synth_path = os.path.join(RAW_DIR, "creditcard_with_attacks.csv")
    
    # We'll generate attacks if creditcard.csv exists
    if os.path.exists(cc_path):
        generate_synthetic_attack_samples(cc_path, cc_synth_path, 2000)
