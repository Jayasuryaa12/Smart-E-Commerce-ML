import shap
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

def get_feature_names_from_preprocessor(preprocessor):
    """
    Extract transformed feature names from Scikit-Learn ColumnTransformer.
    """
    feature_names = []
    for name, trans, cols in preprocessor.transformers_:
        if name == 'num':
            feature_names.extend(cols)
        elif name == 'cat':
            if hasattr(trans, 'get_feature_names_out'):
                names = list(trans.get_feature_names_out(cols))
            else:
                names = list(cols)
            feature_names.extend(names)
    return feature_names

def compute_shap_explainer(pipeline, X_train_raw, sample_size=300):
    """
    Compute SHAP values for the tree-based model inside the fitted pipeline.
    """
    preprocessor = pipeline.named_steps['preprocessor']
    classifier = pipeline.named_steps['classifier']
    
    # Transform raw features
    X_train_trans = preprocessor.transform(X_train_raw)
    feature_names = get_feature_names_from_preprocessor(preprocessor)
    
    if hasattr(X_train_trans, "toarray"):
        X_train_trans = X_train_trans.toarray()
        
    df_trans = pd.DataFrame(X_train_trans, columns=feature_names)
    
    # Sample background for SHAP speed
    sample_df = df_trans.sample(n=min(sample_size, len(df_trans)), random_state=42)
    
    try:
        explainer = shap.TreeExplainer(classifier)
        shap_values = explainer(sample_df)
    except Exception:
        explainer = shap.Explainer(classifier, sample_df)
        shap_values = explainer(sample_df)
        
    # Handle multi-class or binary dimension output
    if hasattr(shap_values, "values") and len(shap_values.values.shape) == 3:
        # Select positive class (index 1)
        shap_values_pos = shap_values[:, :, 1]
    else:
        shap_values_pos = shap_values
        
    return explainer, shap_values_pos, sample_df, feature_names

def get_global_feature_importance(shap_values_pos, feature_names):
    """
    Calculate mean absolute SHAP value per feature.
    """
    vals = np.abs(shap_values_pos.values).mean(axis=0)
    df_imp = pd.DataFrame({
        'Feature': feature_names,
        'Mean_|SHAP|_Importance': vals
    }).sort_values(by='Mean_|SHAP|_Importance', ascending=False).reset_index(drop=True)
    return df_imp

def explain_single_prediction(pipeline, single_row_df):
    """
    Explain individual session prediction using model features and probabilities.
    """
    prob = pipeline.predict_proba(single_row_df)[0, 1]
    pred = pipeline.predict(single_row_df)[0]
    
    preprocessor = pipeline.named_steps['preprocessor']
    classifier = pipeline.named_steps['classifier']
    
    X_trans = preprocessor.transform(single_row_df)
    feature_names = get_feature_names_from_preprocessor(preprocessor)
    
    if hasattr(X_trans, "toarray"):
        X_trans = X_trans.toarray()
        
    df_trans = pd.DataFrame(X_trans, columns=feature_names)
    
    try:
        explainer = shap.TreeExplainer(classifier)
        sv = explainer(df_trans)
    except Exception:
        explainer = shap.Explainer(classifier, df_trans)
        sv = explainer(df_trans)
        
    if len(sv.values.shape) == 3:
        vals = sv.values[0, :, 1]
    elif len(sv.values.shape) == 2:
        vals = sv.values[0, :]
    else:
        vals = sv.values[0]
        
    df_single_exp = pd.DataFrame({
        'Feature': feature_names,
        'Value': df_trans.iloc[0].values,
        'SHAP_Impact': vals
    }).sort_values(by='SHAP_Impact', key=abs, ascending=False).reset_index(drop=True)
    
    positive_drivers = df_single_exp[df_single_exp['SHAP_Impact'] > 0].head(3)
    negative_drivers = df_single_exp[df_single_exp['SHAP_Impact'] < 0].head(3)
    
    return {
        'Prediction': 'Purchase (Revenue = True)' if pred == 1 else 'No Purchase (Revenue = False)',
        'Probability': round(prob * 100, 2),
        'Positive_Drivers': positive_drivers,
        'Negative_Drivers': negative_drivers,
        'Full_Breakdown': df_single_exp
    }
