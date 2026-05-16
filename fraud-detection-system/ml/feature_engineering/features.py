import pandas as pd
import numpy as np

def create_velocity_features(df):
    """
    Simulated velocity features based on timestamp / user groups.
    In a real streaming system, these would be computed using rolling windows.
    Since 'Time' in creditcard.csv is seconds elapsed, we'll estimate grouping.
    """
    df = df.copy()
    if "Time" in df.columns:
        # Assuming df is sorted by time and user_id exists. If not, mock it.
        if "user_id" not in df.columns:
            # Mock user_id for the purpose of demonstrating the pipeline
            df["user_id"] = np.random.randint(1, 1000, size=len(df))
        
        # Sort for proper rolling window (simulated)
        df = df.sort_values(by=["user_id", "Time"])
        
        # transactions_last_1h: count of transactions in the last 3600 seconds
        # For simplicity in offline batch processing without actual datetime:
        df["transactions_last_1h"] = df.groupby("user_id")["Time"].transform(lambda x: x.diff().le(3600).astype(int).cumsum())
        
        # transactions_last_24h
        df["transactions_last_24h"] = df.groupby("user_id")["Time"].transform(lambda x: x.diff().le(86400).astype(int).cumsum())
    else:
        df["transactions_last_1h"] = 0
        df["transactions_last_24h"] = 0
    return df

def create_spending_behavior_features(df):
    df = df.copy()
    if "Amount" in df.columns and "user_id" in df.columns:
        df["average_transaction_amount"] = df.groupby("user_id")["Amount"].transform("mean")
        df["amount_deviation"] = df["Amount"] - df["average_transaction_amount"]
        df["daily_spending"] = df.groupby("user_id")["Amount"].transform("sum") # Simplified
    else:
        df["average_transaction_amount"] = 0.0
        df["amount_deviation"] = 0.0
        df["daily_spending"] = 0.0
    return df

def create_time_features(df):
    df = df.copy()
    if "Time" in df.columns:
        # Time in creditcard.csv is seconds elapsed from first transaction.
        # We can simulate time of day by modulo 86400 (seconds in a day)
        time_of_day = df["Time"] % 86400
        df["hour_of_day"] = (time_of_day // 3600).astype(int)
        
        # 0-6 AM considered night transaction
        df["night_transaction"] = df["hour_of_day"].apply(lambda x: 1 if 0 <= x <= 6 else 0)
        
        # Simulate weekend (assuming day 0 is Monday)
        day_of_week = (df["Time"] // 86400) % 7
        df["is_weekend"] = day_of_week.apply(lambda x: 1 if x >= 5 else 0)
    else:
        df["hour_of_day"] = 0
        df["night_transaction"] = 0
        df["is_weekend"] = 0
    return df

def create_geographic_features(df):
    df = df.copy()
    # These are typically derived from IP, billing, and shipping addresses
    # We will simulate them if not present.
    if "country_mismatch" not in df.columns:
        df["country_mismatch"] = np.random.choice([0, 1], size=len(df), p=[0.95, 0.05])
    if "geo_distance" not in df.columns:
        df["geo_distance"] = np.random.exponential(scale=50, size=len(df)) # Distance in km
    if "high_risk_country" not in df.columns:
        df["high_risk_country"] = np.random.choice([0, 1], size=len(df), p=[0.98, 0.02])
    return df

def create_device_features(df):
    df = df.copy()
    if "new_device" not in df.columns:
        df["new_device"] = np.random.choice([0, 1], size=len(df), p=[0.9, 0.1])
    if "device_change_frequency" not in df.columns:
        df["device_change_frequency"] = np.random.poisson(lam=1, size=len(df))
    if "browser_change" not in df.columns:
        df["browser_change"] = np.random.choice([0, 1], size=len(df), p=[0.8, 0.2])
    return df

def create_user_features(df):
    df = df.copy()
    if "account_age" not in df.columns:
        df["account_age"] = np.random.randint(1, 3650, size=len(df)) # days
    if "failed_logins" not in df.columns:
        df["failed_logins"] = np.random.poisson(lam=0.5, size=len(df))
    if "login_velocity" not in df.columns:
        df["login_velocity"] = np.random.exponential(scale=2, size=len(df)) # logins per day
    return df

def apply_all_features(df):
    """
    Applies all feature engineering steps.
    """
    df = df.copy()
    df = create_velocity_features(df)
    df = create_spending_behavior_features(df)
    df = create_time_features(df)
    df = create_geographic_features(df)
    df = create_device_features(df)
    df = create_user_features(df)
    return df
