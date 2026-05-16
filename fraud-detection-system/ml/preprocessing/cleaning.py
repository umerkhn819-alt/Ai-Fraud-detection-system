import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
import warnings

def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans dataset by removing duplicates and handling missing values.
    """
    print(f"Original shape: {df.shape}")
    
    # Remove duplicates
    df = df.drop_duplicates()
    print(f"Shape after removing duplicates: {df.shape}")
    
    # Handle missing values
    # For numerical cols: fill with median
    # For categorical cols: fill with mode
    for col in df.columns:
        if df[col].isnull().any():
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].median())
            else:
                df[col] = df[col].fillna(df[col].mode()[0])
    
    print("Missing values handled.")
    return df

def apply_scaling(X_train, X_test, cols_to_scale=None):
    """
    Applies StandardScaler to numerical columns.
    """
    scaler = StandardScaler()
    if cols_to_scale is None:
        # Scale all if not specified
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        return pd.DataFrame(X_train_scaled, columns=X_train.columns, index=X_train.index), \
               pd.DataFrame(X_test_scaled, columns=X_test.columns, index=X_test.index), scaler
    else:
        X_train_scaled = X_train.copy()
        X_test_scaled = X_test.copy()
        X_train_scaled[cols_to_scale] = scaler.fit_transform(X_train[cols_to_scale])
        X_test_scaled[cols_to_scale] = scaler.transform(X_test[cols_to_scale])
        return X_train_scaled, X_test_scaled, scaler

def handle_imbalance_smote(X_train, y_train):
    """
    Applies SMOTE to handle class imbalance.
    """
    print(f"Class distribution before SMOTE: {np.bincount(y_train)}")
    smote = SMOTE(random_state=42)
    X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)
    print(f"Class distribution after SMOTE: {np.bincount(y_train_sm)}")
    return X_train_sm, y_train_sm

def get_class_weights(y_train):
    """
    Calculates class weights for models that support it.
    """
    n_samples = len(y_train)
    n_classes = len(np.unique(y_train))
    bincount = np.bincount(y_train)
    # Avoid division by zero
    weights = n_samples / (n_classes * bincount + 1e-6)
    weight_dict = {i: weights[i] for i in range(n_classes)}
    return weight_dict

def get_stratified_split(X, y, test_size=0.2, random_state=42):
    """
    Returns a stratified train-test split.
    """
    return train_test_split(X, y, test_size=test_size, stratify=y, random_state=random_state)
