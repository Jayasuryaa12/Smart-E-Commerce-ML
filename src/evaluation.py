import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    roc_curve, precision_recall_curve
)
from sklearn.model_selection import StratifiedKFold, cross_validate

def evaluate_classifier(pipeline, X_train, y_train, X_test, y_test, model_name="Model"):
    """
    Compute comprehensive evaluation metrics for classification pipeline.
    """
    # Fit pipeline
    pipeline.fit(X_train, y_train)
    
    # Predictions
    y_pred_train = pipeline.predict(X_train)
    y_pred_test = pipeline.predict(X_test)
    
    if hasattr(pipeline, "predict_proba"):
        y_prob_train = pipeline.predict_proba(X_train)[:, 1]
        y_prob_test = pipeline.predict_proba(X_test)[:, 1]
    else:
        y_prob_train = y_pred_train
        y_prob_test = y_pred_test
        
    # Metrics
    acc = accuracy_score(y_test, y_pred_test)
    prec = precision_score(y_test, y_pred_test, zero_division=0)
    rec = recall_score(y_test, y_pred_test, zero_division=0)
    f1 = f1_score(y_test, y_pred_test, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_prob_test)
    pr_auc = average_precision_score(y_test, y_prob_test)
    
    cm = confusion_matrix(y_test, y_pred_test)
    
    # Train set F1 & ROC-AUC for overfit check
    train_f1 = f1_score(y_train, y_pred_train, zero_division=0)
    train_roc_auc = roc_auc_score(y_train, y_prob_train)
    
    # Stratified 5-Fold Cross Validation F1 & ROC-AUC
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_results = cross_validate(
        pipeline, X_train, y_train, cv=skf,
        scoring=['f1', 'roc_auc', 'average_precision'],
        n_jobs=-1
    )
    
    cv_f1_mean = np.mean(cv_results['test_f1'])
    cv_f1_std = np.std(cv_results['test_f1'])
    cv_roc_auc_mean = np.mean(cv_results['test_roc_auc'])
    cv_pr_auc_mean = np.mean(cv_results['test_average_precision'])
    
    metrics = {
        'Model': model_name,
        'Accuracy': round(acc, 4),
        'Precision': round(prec, 4),
        'Recall': round(rec, 4),
        'F1-Score': round(f1, 4),
        'ROC-AUC': round(roc_auc, 4),
        'PR-AUC': round(pr_auc, 4),
        'CV F1 (Mean)': round(cv_f1_mean, 4),
        'CV F1 (Std)': round(cv_f1_std, 4),
        'CV ROC-AUC': round(cv_roc_auc_mean, 4),
        'CV PR-AUC': round(cv_pr_auc_mean, 4),
        'Train F1': round(train_f1, 4),
        'Train ROC-AUC': round(train_roc_auc, 4)
    }
    
    curves = {
        'fpr': None, 'tpr': None, 'precision_curve': None, 'recall_curve': None
    }
    if hasattr(pipeline, "predict_proba"):
        fpr, tpr, _ = roc_curve(y_test, y_prob_test)
        p_curve, r_curve, _ = precision_recall_curve(y_test, y_prob_test)
        curves['fpr'] = fpr
        curves['tpr'] = tpr
        curves['precision_curve'] = p_curve
        curves['recall_curve'] = r_curve
        
    return metrics, cm, curves, pipeline

def compare_all_models(model_dict, preprocessor, X_train, y_train, X_test, y_test):
    """
    Train and evaluate all candidate ML models, returning comparison DataFrame.
    """
    results_list = []
    cm_dict = {}
    curves_dict = {}
    fitted_pipelines = {}
    
    for name, model in model_dict.items():
        print(f"Training and evaluating {name}...")
        from imblearn.pipeline import Pipeline as ImbPipeline
        pipe = ImbPipeline([
            ('preprocessor', preprocessor),
            ('classifier', model)
        ])
        
        metrics, cm, curves, fitted_pipe = evaluate_classifier(
            pipe, X_train, y_train, X_test, y_test, model_name=name
        )
        
        results_list.append(metrics)
        cm_dict[name] = cm
        curves_dict[name] = curves
        fitted_pipelines[name] = fitted_pipe
        
    df_comparison = pd.DataFrame(results_list).sort_values(by='F1-Score', ascending=False).reset_index(drop=True)
    return df_comparison, cm_dict, curves_dict, fitted_pipelines
