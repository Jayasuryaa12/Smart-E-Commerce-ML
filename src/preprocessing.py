import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
import joblib
import os

MONTH_MAP = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'June': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

def load_raw_data(data_path):
    """Load the raw UCI Online Shoppers Purchasing Intention dataset."""
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at path: {data_path}")
    df = pd.read_csv(data_path)
    return df

def clean_data(df, drop_duplicates=True):
    """Clean the raw dataframe."""
    df_clean = df.copy()
    if drop_duplicates:
        df_clean = df_clean.drop_duplicates().reset_index(drop=True)
    return df_clean

def get_feature_lists():
    """Return numeric and categorical feature lists."""
    num_cols = [
        'Administrative', 'Administrative_Duration',
        'Informational', 'Informational_Duration',
        'ProductRelated', 'ProductRelated_Duration',
        'BounceRates', 'ExitRates', 'PageValues', 'SpecialDay',
        'Total_Page_Views', 'Total_Duration', 'Avg_Duration_Per_Page',
        'Product_View_Ratio', 'Bounce_Exit_Ratio', 'PageValue_Intensity'
    ]
    cat_cols = ['Month', 'OperatingSystems', 'Browser', 'Region', 'TrafficType', 'VisitorType', 'Weekend']
    return num_cols, cat_cols

def build_preprocessor(num_cols, cat_cols):
    """Build scikit-learn ColumnTransformer for numerical scaling and categorical encoding without data leakage."""
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols)
        ],
        remainder='drop'
    )
    return preprocessor

def prepare_data_split(df_processed, target_col='Revenue', test_size=0.2, random_state=42):
    """Perform stratified train-test split."""
    X = df_processed.drop(columns=[target_col])
    y = df_processed[target_col].astype(int)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=random_state
    )
    return X_train, X_test, y_train, y_test
