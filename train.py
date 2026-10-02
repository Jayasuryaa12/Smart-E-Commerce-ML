import os
import joblib
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

from src.preprocessing import (
    load_raw_data, clean_data, get_feature_lists,
    build_preprocessor, prepare_data_split
)
from src.feature_engineering import create_session_features
from src.segmentation import (
    evaluate_kmeans_range, evaluate_gmm_range, evaluate_dbscan,
    profile_clusters
)
from src.models import get_base_models, hyperparameter_tune_rf
from src.evaluation import compare_all_models
from src.explainability import compute_shap_explainer, get_global_feature_importance
from sklearn.preprocessing import StandardScaler

def run_training_pipeline():
    print("=" * 70)
    print("STARTING E-COMMERCE ML LAB PIPELINE TRAINING & EVALUATION")
    print("=" * 70)
    
    os.makedirs('models', exist_ok=True)
    os.makedirs('data', exist_ok=True)
    os.makedirs('reports', exist_ok=True)
    
    data_path = os.path.join('data', 'online_shoppers_intention.csv')
    df_raw = load_raw_data(data_path)
    print(f"[1/7] Loaded dataset: {df_raw.shape[0]} rows, {df_raw.shape[1]} columns", flush=True)
    
    # 1. Feature Engineering
    df_feat = create_session_features(df_raw)
    print(f"[2/7] Generated session behavioral features. Total columns: {df_feat.shape[1]}", flush=True)
    
    # 2. Data Cleaning
    df_clean = clean_data(df_feat, drop_duplicates=True)
    print(f"[3/7] Cleaned dataset (removed duplicates): {df_clean.shape[0]} sessions", flush=True)
    
    # 3. Session Segmentation (Clustering)
    print("\n--- [4/7] Running Session Segmentation (K-Means, GMM, DBSCAN) ---", flush=True)
    num_cols_cluster = [
        'Administrative', 'Administrative_Duration', 'Informational',
        'Informational_Duration', 'ProductRelated', 'ProductRelated_Duration',
        'BounceRates', 'ExitRates', 'PageValues', 'Total_Page_Views',
        'Total_Duration', 'Avg_Duration_Per_Page', 'PageValue_Intensity'
    ]
    
    scaler_cluster = StandardScaler()
    X_cluster_scaled = scaler_cluster.fit_transform(df_clean[num_cols_cluster])
    
    kmeans_results = evaluate_kmeans_range(X_cluster_scaled, range(2, 7))
    gmm_results = evaluate_gmm_range(X_cluster_scaled, range(2, 7))
    dbscan_results = evaluate_dbscan(X_cluster_scaled)
    
    all_cluster_eval = pd.concat([kmeans_results, gmm_results, dbscan_results], ignore_index=True)
    
    # Best KMeans model selection based on Silhouette Score
    best_km_row = kmeans_results.sort_values(by='Silhouette Score', ascending=False).iloc[0]
    best_k = best_km_row['Clusters']
    best_seg_model = best_km_row['Model']
    best_seg_labels = best_km_row['Labels']
    
    print(f"Optimal Session Segmentation: K-Means (k={best_k}) | Silhouette Score: {best_km_row['Silhouette Score']}", flush=True)
    
    profile_summary, df_segmented = profile_clusters(df_clean, best_seg_labels)
    profile_summary.to_csv('reports/segmentation_summary.csv')
    
    # Compute 2D PCA projection for interactive cluster visualization
    from sklearn.decomposition import PCA
    pca = PCA(n_components=2, random_state=42)
    pca_coords = pca.fit_transform(X_cluster_scaled)
    pca_df = pd.DataFrame(pca_coords, columns=['PC1', 'PC2'])
    pca_df['Cluster'] = [f"Segment {l}" if l != -1 else "Noise" for l in best_seg_labels]
    pca_df['Revenue'] = df_clean['Revenue'].map({True: 'Purchase', False: 'No Purchase'})
    pca_df['PageValues'] = df_clean['PageValues'].round(2)
    pca_df['ProductRelated_Duration'] = df_clean['ProductRelated_Duration'].round(1)
    pca_df['Total_Page_Views'] = df_clean['Total_Page_Views']
    
    # Save Segmentation artifacts
    joblib.dump({
        'model': best_seg_model,
        'scaler': scaler_cluster,
        'features': num_cols_cluster,
        'eval_results': all_cluster_eval,
        'profile_summary': profile_summary,
        'k': best_k,
        'pca_df': pca_df,
        'pca_var': pca.explained_variance_ratio_
    }, 'models/segmentation_model.pkl')
    print("Saved models/segmentation_model.pkl with PCA visualization data", flush=True)
    
    # 4. Preprocessing & Data Splitting
    print("\n--- [5/7] Preparing Classification Data Split (Stratified 80/20) ---", flush=True)
    num_cols, cat_cols = get_feature_lists()
    preprocessor = build_preprocessor(num_cols, cat_cols)
    
    X_train, X_test, y_train, y_test = prepare_data_split(df_clean, target_col='Revenue', test_size=0.2, random_state=42)
    print(f"Train set: {X_train.shape[0]} sessions | Test set: {X_test.shape[0]} sessions", flush=True)
    print(f"Train Purchase Rate: {y_train.mean()*100:.2f}% | Test Purchase Rate: {y_test.mean()*100:.2f}%", flush=True)
    
    # 5. Machine Learning Model Training & Comparison
    print("\n--- [6/7] Training ML Classification Models ---", flush=True)
    pos_weight = (len(y_train) - sum(y_train)) / sum(y_train)
    candidate_models = get_base_models(scale_pos_weight=pos_weight)
    
    df_comparison, cm_dict, curves_dict, fitted_pipelines = compare_all_models(
        candidate_models, preprocessor, X_train, y_train, X_test, y_test
    )
    
    print("\n" + "="*50, flush=True)
    print("MODEL COMPARISON SUMMARY METRICS", flush=True)
    print("="*50, flush=True)
    print(df_comparison.to_string(index=False), flush=True)
    
    # Save CSV report
    df_comparison.to_csv('reports/model_comparison_summary.csv', index=False)
    
    # Select best model based on F1-Score & PR-AUC
    best_model_name = df_comparison.iloc[0]['Model']
    best_pipeline = fitted_pipelines[best_model_name]
    print(f"\nSelected Best Model: {best_model_name}", flush=True)
    
    # Hyperparameter tune Random Forest as an optimized benchmark
    print("\nHyperparameter tuning Random Forest for refined benchmark...", flush=True)
    tuned_rf, tuned_params = hyperparameter_tune_rf(X_train, y_train, preprocessor)
    print(f"Best RF Parameters: {tuned_params}", flush=True)
    
    # 6. Model Explainability (SHAP)
    print("\n--- [7/7] Computing SHAP Model Explainability ---", flush=True)
    try:
        explainer, shap_values, sample_df, feature_names = compute_shap_explainer(best_pipeline, X_train, sample_size=300)
        global_imp = get_global_feature_importance(shap_values, feature_names)
        shap_data = {
            'global_importance': global_imp,
            'feature_names': feature_names,
            'sample_df': sample_df
        }
    except Exception as e:
        print(f"SHAP computation warning: {e}", flush=True)
        shap_data = None
        
    # Model Metadata export
    import datetime, json
    best_row_dict = df_comparison.iloc[0].to_dict()
    model_metadata = {
        'model_version': '1.0.0-PhaseII',
        'training_timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'best_model_name': best_model_name,
        'dataset_total_sessions': len(df_raw),
        'train_sessions': len(X_train),
        'test_sessions': len(X_test),
        'numerical_features': num_cols,
        'categorical_features': cat_cols,
        'evaluation_metrics': best_row_dict
    }
    with open('models/model_metadata.json', 'w') as f:
        json.dump(model_metadata, f, indent=2, default=str)
    print("Saved models/model_metadata.json", flush=True)
        
    # Save all artifacts
    joblib.dump(best_pipeline, 'models/purchase_model.pkl')
    joblib.dump(preprocessor, 'models/preprocessing_pipeline.pkl')
    joblib.dump({
        'comparison_df': df_comparison,
        'cm_dict': cm_dict,
        'curves_dict': curves_dict,
        'best_model_name': best_model_name,
        'fitted_pipelines': fitted_pipelines,
        'shap_data': shap_data,
        'X_train': X_train,
        'X_test': X_test,
        'y_train': y_train,
        'y_test': y_test,
        'model_metadata': model_metadata
    }, 'models/model_comparison_results.pkl')
    
    print("\n" + "="*70, flush=True)
    print("TRAINING PIPELINE COMPLETED SUCCESSFULLY!", flush=True)
    print("Artifacts saved in models/ and reports/ directories:", flush=True)
    print("  - models/segmentation_model.pkl")
    print("  - models/preprocessing_pipeline.pkl")
    print("  - models/purchase_model.pkl")
    print("  - models/model_comparison_results.pkl")
    print("  - models/model_metadata.json")

    print("  - reports/model_comparison_summary.csv")
    print("  - reports/segmentation_summary.csv")
    print("="*70, flush=True)


if __name__ == '__main__':
    run_training_pipeline()
