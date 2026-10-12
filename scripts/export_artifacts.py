import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import shap

# Ensure workspace root is in python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)

from src.data_loader import load_raw_data, get_dataset_summary, check_data_quality
from src.business_insights import generate_conversion_insights, generate_actionable_recommendations, generate_model_performance_summary
from src.explainability import get_feature_names_from_preprocessor

CACHE_DIR = os.path.join(ROOT_DIR, 'reports', 'api_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

DATA_PATH = os.path.join(ROOT_DIR, 'data', 'online_shoppers_intention.csv')
MODEL_DIR = os.path.join(ROOT_DIR, 'models')

def export_all():
    print("=" * 60)
    print("Exporting Artifacts for Fast Read-Only API Serving...")
    print("=" * 60)

    # 1. Load Raw Dataset
    print("[1/6] Processing Dataset & EDA overview...")
    df = load_raw_data(DATA_PATH)
    
    # Class balance
    total_sessions = int(len(df))
    revenue_counts = df['Revenue'].value_counts().to_dict()
    buyers = int(revenue_counts.get(True, 0))
    non_buyers = int(revenue_counts.get(False, 0))
    conv_rate = round((buyers / total_sessions) * 100, 2)
    
    # Grouped conversion stats
    month_conv = df.groupby('Month')['Revenue'].agg(['count', 'mean']).reset_index()
    month_conv['rate'] = (month_conv['mean'] * 100).round(2)
    month_order = ['Feb', 'Mar', 'May', 'June', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    month_conv['Month'] = pd.Categorical(month_conv['Month'], categories=month_order, ordered=True)
    month_conv = month_conv.sort_values('Month')
    
    visitor_conv = df.groupby('VisitorType')['Revenue'].agg(['count', 'mean']).reset_index()
    visitor_conv['rate'] = (visitor_conv['mean'] * 100).round(2)
    
    weekend_conv = df.groupby('Weekend')['Revenue'].agg(['count', 'mean']).reset_index()
    weekend_conv['rate'] = (weekend_conv['mean'] * 100).round(2)
    
    traffic_conv = df.groupby('TrafficType')['Revenue'].agg(['count', 'mean']).reset_index()
    traffic_conv['rate'] = (traffic_conv['mean'] * 100).round(2)
    
    # Numerical features summary
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    num_summary = []
    for col in num_cols:
        s = df[col]
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        outliers = int(((s < (q1 - 1.5 * iqr)) | (s > (q3 + 1.5 * iqr))).sum())
        num_summary.append({
            'feature': col,
            'mean': round(float(s.mean()), 4),
            'std': round(float(s.std()), 4),
            'min': round(float(s.min()), 4),
            'median': round(float(s.median()), 4),
            'max': round(float(s.max()), 4),
            'skew': round(float(s.skew()), 4),
            'outliers_count': outliers
        })
        
    eda_overview = {
        'total_sessions': total_sessions,
        'buyers': buyers,
        'non_buyers': non_buyers,
        'conversion_rate': conv_rate,
        'month_breakdown': month_conv[['Month', 'count', 'rate']].to_dict(orient='records'),
        'visitor_breakdown': visitor_conv[['VisitorType', 'count', 'rate']].to_dict(orient='records'),
        'weekend_breakdown': weekend_conv[['Weekend', 'count', 'rate']].to_dict(orient='records'),
        'traffic_breakdown': traffic_conv[['TrafficType', 'count', 'rate']].to_dict(orient='records'),
        'numerical_summary': num_summary
    }
    with open(os.path.join(CACHE_DIR, 'eda_overview.json'), 'w') as f:
        json.dump(eda_overview, f, indent=2)

    # Correlation Matrix
    corr_df = df[num_cols].corr().round(4)
    corr_data = {
        'columns': num_cols,
        'matrix': corr_df.values.tolist()
    }
    with open(os.path.join(CACHE_DIR, 'correlation.json'), 'w') as f:
        json.dump(corr_data, f, indent=2)

    # 2. Model Comparison, Curves & Test Predictions
    print("[2/6] Processing Model Comparison Results & Curves...")
    comp_file = os.path.join(MODEL_DIR, 'model_comparison_results.pkl')
    m_data = joblib.load(comp_file)
    
    comp_df = m_data['comparison_df']
    cm_dict = m_data['cm_dict']
    curves_dict = m_data['curves_dict']
    fitted_pipes = m_data['fitted_pipelines']
    X_test = m_data['X_test']
    y_test = m_data['y_test']
    
    # Pre-evaluate test set probabilities for threshold slider
    test_probs = {}
    for name, pipe in fitted_pipes.items():
        if hasattr(pipe, 'predict_proba'):
            test_probs[name] = pipe.predict_proba(X_test)[:, 1].round(4).tolist()
        else:
            test_probs[name] = pipe.predict(X_test).tolist()
            
    with open(os.path.join(CACHE_DIR, 'test_predictions.json'), 'w') as f:
        json.dump({
            'y_test': y_test.astype(int).tolist(),
            'test_probs': test_probs
        }, f)
        
    # Curves data (sample ROC/PR points down to <=100 evenly spaced points for smooth charting)
    models_curves = {}
    for name, c in curves_dict.items():
        fpr = c.get('fpr')
        tpr = c.get('tpr')
        prec = c.get('precision_curve')
        rec = c.get('recall_curve')
        cm = cm_dict.get(name)
        
        # Downsample ROC points
        roc_pts = []
        if fpr is not None and tpr is not None:
            step = max(1, len(fpr) // 80)
            roc_pts = [{'fpr': round(float(fpr[i]), 4), 'tpr': round(float(tpr[i]), 4)} for i in range(0, len(fpr), step)]
            if roc_pts[-1]['fpr'] != 1.0:
                roc_pts.append({'fpr': 1.0, 'tpr': 1.0})
                
        # Downsample PR points
        pr_pts = []
        if prec is not None and rec is not None:
            step = max(1, len(prec) // 80)
            pr_pts = [{'recall': round(float(rec[i]), 4), 'precision': round(float(prec[i]), 4)} for i in range(0, len(prec), step)]
            
        cm_data = {
            'matrix': cm.tolist() if cm is not None else [],
            'tn': int(cm[0, 0]) if cm is not None else 0,
            'fp': int(cm[0, 1]) if cm is not None else 0,
            'fn': int(cm[1, 0]) if cm is not None else 0,
            'tp': int(cm[1, 1]) if cm is not None else 0,
        }
        
        models_curves[name] = {
            'roc_curve': roc_pts,
            'pr_curve': pr_pts,
            'confusion_matrix': cm_data
        }
        
    with open(os.path.join(CACHE_DIR, 'curves.json'), 'w') as f:
        json.dump(models_curves, f, indent=2)

    # 3. Segmentation Results & PCA Points
    print("[3/6] Processing Segmentation & PCA points...")
    seg_file = os.path.join(MODEL_DIR, 'segmentation_model.pkl')
    s_data = joblib.load(seg_file)
    
    # eval_results
    eval_df = s_data['eval_results']
    seg_eval = []
    for idx, row in eval_df.iterrows():
        seg_eval.append({
            'algorithm': str(row['Algorithm']),
            'clusters': int(row['Clusters']) if not pd.isna(row['Clusters']) else None,
            'silhouette': round(float(row['Silhouette Score']), 4) if not pd.isna(row['Silhouette Score']) else None,
            'davies_bouldin': round(float(row['Davies-Bouldin Index']), 4) if not pd.isna(row['Davies-Bouldin Index']) else None,
            'calinski_harabasz': round(float(row['Calinski-Harabasz Score']), 2) if not pd.isna(row['Calinski-Harabasz Score']) else None
        })
    with open(os.path.join(CACHE_DIR, 'segmentation_algorithms.json'), 'w') as f:
        json.dump(seg_eval, f, indent=2)

    # PCA 2D Points (Sample to 2,500 points for crisp visual responsiveness)
    pca_df = s_data['pca_df']
    sample_size = min(2500, len(pca_df))
    sampled_pca = pca_df.sample(n=sample_size, random_state=42)
    pca_points = []
    for _, row in sampled_pca.iterrows():
        c_str = str(row['Cluster'])
        c_id = int(c_str.replace('Segment ', '')) if 'Segment ' in c_str else int(row['Cluster'])
        pca_points.append({
            'pc1': round(float(row['PC1']), 3),
            'pc2': round(float(row['PC2']), 3),
            'cluster': c_id,
            'cluster_label': c_str,
            'revenue': bool(row['Revenue']),
            'page_values': round(float(row['PageValues']), 2),
            'product_duration': round(float(row['ProductRelated_Duration']), 1),
            'total_page_views': int(row['Total_Page_Views'])
        })
        
    pca_data = {
        'variance_ratio': [round(float(v), 4) for v in s_data.get('pca_var', [0.3774, 0.1478])],
        'total_points': len(pca_df),
        'sample_points': pca_points
    }
    with open(os.path.join(CACHE_DIR, 'segmentation_points.json'), 'w') as f:
        json.dump(pca_data, f, indent=2)

    # 4. SHAP Global Explainability
    print("[4/6] Processing SHAP Global Explainability & Beeswarm...")
    shap_data = m_data.get('shap_data', {})
    purchase_model = joblib.load(os.path.join(MODEL_DIR, 'purchase_model.pkl'))
    
    global_imp_df = shap_data.get('global_importance')
    sample_df = shap_data.get('sample_df')
    feature_names = shap_data.get('feature_names')
    
    # Compute SHAP values on 300 sample rows
    explainer = shap.TreeExplainer(purchase_model.named_steps['classifier'])
    sv = explainer(sample_df)
    
    if len(sv.values.shape) == 3:
        shap_matrix = sv.values[:, :, 1]
    else:
        shap_matrix = sv.values
        
    # Top 15 features by mean |SHAP|
    top_features = global_imp_df.head(15)['Feature'].tolist()
    
    # Beeswarm points for top 15 features
    beeswarm_points = []
    feature_indices = {feat: feature_names.index(feat) for feat in top_features if feat in feature_names}
    
    for row_idx in range(len(sample_df)):
        for feat in top_features:
            col_idx = feature_indices.get(feat)
            if col_idx is not None:
                val = float(sample_df.iloc[row_idx, col_idx])
                shap_val = float(shap_matrix[row_idx, col_idx])
                beeswarm_points.append({
                    'feature': feat,
                    'feature_value': round(val, 4),
                    'shap_impact': round(shap_val, 4),
                    'sample_idx': row_idx
                })
                
    # Dependence sample for top features: PageValues, PageValue_Intensity, BounceRates, ExitRates
    dependence_data = {}
    dep_targets = ['PageValues', 'PageValue_Intensity', 'BounceRates', 'ExitRates', 'ProductRelated_Duration']
    for dep_feat in dep_targets:
        if dep_feat in feature_indices:
            c_idx = feature_indices[dep_feat]
            pts = []
            for r_idx in range(len(sample_df)):
                pts.append({
                    'value': round(float(sample_df.iloc[r_idx, c_idx]), 4),
                    'shap': round(float(shap_matrix[r_idx, c_idx]), 4)
                })
            dependence_data[dep_feat] = sorted(pts, key=lambda x: x['value'])

    explain_global = {
        'importance': global_imp_df.to_dict(orient='records'),
        'beeswarm': beeswarm_points,
        'dependence': dependence_data,
        'sample_count': len(sample_df)
    }
    with open(os.path.join(CACHE_DIR, 'explain_global.json'), 'w') as f:
        json.dump(explain_global, f, indent=2)

    # 5. Business Insights
    print("[5/6] Processing Business Insights...")
    conv_insights_df = generate_conversion_insights(df)
    action_recs_df = generate_actionable_recommendations()
    model_summary = generate_model_performance_summary(comp_df)
    
    insights_data = {
        'conversion_insights': conv_insights_df.to_dict(orient='records'),
        'actionable_recommendations': action_recs_df.to_dict(orient='records'),
        'model_summary': model_summary
    }
    with open(os.path.join(CACHE_DIR, 'insights.json'), 'w') as f:
        json.dump(insights_data, f, indent=2)

    print("[6/6] All artifacts exported successfully to reports/api_cache/!")
    print("=" * 60)

if __name__ == '__main__':
    export_all()
