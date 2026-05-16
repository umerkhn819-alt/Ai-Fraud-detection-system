import os
import sys
import pandas as pd

# Add the parent directory to sys.path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from preprocessing.pipeline import create_features
from preprocessing.cleaning import clean_dataset, get_stratified_split, apply_scaling
from training.train_classifiers import train_classification_models
from training.train_anomaly import train_anomaly_models

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")

def process_and_train(dataset_name, model_prefix, label_col="Class", sample_fraction=1.0):
    """
    Generic pipeline to load data, engineer features, clean, scale, and train.
    """
    filepath = os.path.join(DATA_DIR, dataset_name)
    if not os.path.exists(filepath):
        print(f"Skipping {dataset_name}, file not found.")
        return
        
    print(f"\n{'='*50}\nProcessing {dataset_name} for {model_prefix} model\n{'='*50}")
    
    # 1. Load Data
    df = pd.read_csv(filepath)
    if sample_fraction < 1.0:
        df = df.sample(frac=sample_fraction, random_state=42)
    
    # Rename label column to standard 'label' for internal processing if needed
    if label_col != "label":
        df = df.rename(columns={label_col: "label"})
    
    # 2. Engineer Features
    df = create_features(df)
    
    # 3. Clean
    df = clean_dataset(df)
    
    X = df.drop(columns=["label"])
    y = df["label"].values
    
    # 4. Split
    X_train, X_test, y_train, y_test = get_stratified_split(X, y)
    
    # 5. Scale
    X_train_scaled, X_test_scaled, scaler = apply_scaling(X_train, X_test)
    
    # 6. Train Classification Models
    train_classification_models(X_train_scaled, y_train, X_test_scaled, y_test, model_name_prefix=model_prefix)
    
    # 7. For payment model, also train Anomaly Detection
    if model_prefix == "payment":
        # Anomaly detection usually trains better with just normal or lightly contaminated data
        train_anomaly_models(X_train_scaled, y_train, X_test_scaled, y_test)

if __name__ == "__main__":
    # Train Payment & Anomaly Model (using the synthetic attacks one if exists, else standard)
    cc_synth = "creditcard_with_attacks.csv"
    cc_std = "creditcard.csv"
    if os.path.exists(os.path.join(DATA_DIR, cc_synth)):
        process_and_train(cc_synth, "payment", "Class", sample_fraction=0.1) # Subsample for speed
    elif os.path.exists(os.path.join(DATA_DIR, cc_std)):
        process_and_train(cc_std, "payment", "Class", sample_fraction=0.1)
        
    # Train Account Fraud Model
    process_and_train("account_fraud.csv", "account", "is_fraud")
    
    # Train Refund Abuse Model
    process_and_train("refund_abuse.csv", "refund", "is_abuse")
    
    # Train Bot Detection Model
    process_and_train("bot_detection.csv", "bot", "is_bot")
    
    print("\nAll models trained and saved to ml/models/")
