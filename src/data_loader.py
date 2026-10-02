import os
import pandas as pd
import numpy as np

REQUIRED_COLUMNS = [
    'Administrative', 'Administrative_Duration', 'Informational',
    'Informational_Duration', 'ProductRelated', 'ProductRelated_Duration',
    'BounceRates', 'ExitRates', 'PageValues', 'SpecialDay',
    'Month', 'OperatingSystems', 'Browser', 'Region',
    'TrafficType', 'VisitorType', 'Weekend', 'Revenue'
]

def load_raw_data(data_path='data/online_shoppers_intention.csv'):
    """
    Safely load the UCI Online Shoppers Purchasing Intention dataset.
    Raises FileNotFoundError if dataset file is absent.
    """
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset file not found at: {data_path}")
    
    df = pd.read_csv(data_path)
    validate_dataset_schema(df)
    return df

def validate_dataset_schema(df):
    """
    Verify dataset schema and expected columns.
    """
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset is missing required columns: {missing_cols}")
    return True

def get_dataset_summary(df):
    """
    Calculate comprehensive data quality statistics for raw or processed dataset.
    """
    total_records = len(df)
    total_cols = len(df.columns)
    missing_count = int(df.isnull().sum().sum())
    duplicate_count = int(df.duplicated().sum())
    
    if 'Revenue' in df.columns:
        purchase_positive = int(df['Revenue'].astype(bool).sum())
        purchase_negative = int(total_records - purchase_positive)
        conversion_rate = round((purchase_positive / total_records) * 100, 2)
    else:
        purchase_positive, purchase_negative, conversion_rate = 0, 0, 0.0
        
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    return {
        'total_records': total_records,
        'total_columns': total_cols,
        'missing_values': missing_count,
        'duplicate_rows': duplicate_count,
        'purchase_positive': purchase_positive,
        'purchase_negative': purchase_negative,
        'conversion_rate_pct': conversion_rate,
        'numeric_columns': num_cols,
        'categorical_columns': cat_cols
    }

def check_data_quality(df):
    """
    Return a detailed column-by-column diagnostic summary.
    """
    stats = []
    for col in df.columns:
        stats.append({
            'Column': col,
            'DataType': str(df[col].dtype),
            'Non-Null Count': int(df[col].count()),
            'Null Count': int(df[col].isnull().sum()),
            'Null Pct (%)': round((df[col].isnull().sum() / len(df)) * 100, 2),
            'Unique Values': int(df[col].nunique()),
            'Sample Values': str(df[col].dropna().unique()[:3].tolist())
        })
    return pd.DataFrame(stats)
