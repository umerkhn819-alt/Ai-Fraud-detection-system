import pandas as pd
from feature_engineering.features import apply_all_features

def create_features(data: pd.DataFrame) -> pd.DataFrame:
    """
    Shared feature pipeline for all models.
    Applies all engineered features to the raw data.
    """
    # Defensive copy
    df = data.copy()
    
    # Standardize column names if needed
    
    # Apply feature engineering
    df = apply_all_features(df)
    
    # Drop columns that are not useful for modeling if necessary
    # For instance, if 'user_id' was generated temporarily for feature creation
    if "user_id" in df.columns:
        # Keep user_id if needed for other things, or drop. 
        # For our models, we probably want to drop it before training.
        pass
        
    return df
