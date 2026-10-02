import pandas as pd
import numpy as np

def create_session_features(df):
    """
    Generate meaningful session-level behavioral features from dataset columns.
    Ensures stateless row-level feature creation without data leakage.
    """
    df_feat = df.copy()
    
    # 1. Aggregate Page Views
    df_feat['Total_Page_Views'] = (
        df_feat['Administrative'] + 
        df_feat['Informational'] + 
        df_feat['ProductRelated']
    )
    
    # 2. Aggregate Duration
    df_feat['Total_Duration'] = (
        df_feat['Administrative_Duration'] + 
        df_feat['Informational_Duration'] + 
        df_feat['ProductRelated_Duration']
    )
    
    # 3. Average Duration Per Page (clip negative values if any)
    df_feat['Total_Duration'] = df_feat['Total_Duration'].clip(lower=0)
    df_feat['Avg_Duration_Per_Page'] = np.where(
        df_feat['Total_Page_Views'] > 0,
        df_feat['Total_Duration'] / df_feat['Total_Page_Views'],
        0.0
    )
    
    # 4. Product-Focused View Ratio
    df_feat['Product_View_Ratio'] = np.where(
        df_feat['Total_Page_Views'] > 0,
        df_feat['ProductRelated'] / df_feat['Total_Page_Views'],
        0.0
    )
    
    # 5. Bounce-to-Exit Ratio
    df_feat['Bounce_Exit_Ratio'] = np.where(
        df_feat['ExitRates'] > 0,
        df_feat['BounceRates'] / df_feat['ExitRates'],
        0.0
    )
    
    # 6. Page Value Intensity
    df_feat['PageValue_Intensity'] = np.where(
        df_feat['Total_Page_Views'] > 0,
        df_feat['PageValues'] / df_feat['Total_Page_Views'],
        0.0
    )
    
    # 7. High Commercial Intent Indicator
    df_feat['High_Intent_Indicator'] = (
        (df_feat['PageValues'] > 0) & (df_feat['ProductRelated'] >= 5)
    ).astype(int)
    
    return df_feat
