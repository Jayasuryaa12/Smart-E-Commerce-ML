import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, StackingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE
import joblib

def get_base_models(scale_pos_weight=5.45):
    """
    Define Machine Learning Models tuned for imbalanced e-commerce purchase prediction,
    including Logistic Regression baseline, tree ensembles, and Stacking.
    """
    models = {
        'Logistic Regression (Baseline)': LogisticRegression(
            class_weight='balanced', max_iter=1000, random_state=42
        ),
        'Random Forest': RandomForestClassifier(
            n_estimators=100, max_depth=12, min_samples_split=5,
            class_weight='balanced', random_state=42, n_jobs=-1
        ),
        'XGBoost': XGBClassifier(
            n_estimators=100, max_depth=6, learning_rate=0.08,
            scale_pos_weight=scale_pos_weight, random_state=42, eval_metric='logloss', n_jobs=-1
        ),
        'LightGBM': LGBMClassifier(
            n_estimators=100, max_depth=6, learning_rate=0.08,
            is_unbalance=True, random_state=42, verbose=-1, n_jobs=-1
        ),
        'CatBoost': CatBoostClassifier(
            iterations=120, depth=6, learning_rate=0.08,
            auto_class_weights='Balanced', random_state=42, verbose=0, thread_count=-1
        ),
        'Gradient Boosting': GradientBoostingClassifier(
            n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42
        ),
        'MLP / Neural Network': MLPClassifier(
            hidden_layer_sizes=(64, 32), max_iter=200, activation='relu',
            solver='adam', random_state=42, early_stopping=True
        )
    }
    
    # Stacking Ensemble using base tree estimators and LogisticRegression meta-classifier
    estimators = [
        ('rf', models['Random Forest']),
        ('xgb', models['XGBoost']),
        ('lgbm', models['LightGBM'])
    ]
    models['Stacking Ensemble'] = StackingClassifier(
        estimators=estimators,
        final_estimator=LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42),
        cv=3,
        n_jobs=-1
    )
    
    return models

def build_model_pipeline(preprocessor, model, use_smote=False):
    """
    Construct a leakage-free Scikit-Learn / Imbalanced-Learn Pipeline.
    Preprocessing and optional SMOTE are executed inside CV folds.
    """
    steps = [('preprocessor', preprocessor)]
    if use_smote:
        steps.append(('smote', SMOTE(random_state=42)))
    steps.append(('classifier', model))
    
    pipeline = ImbPipeline(steps)
    return pipeline

def hyperparameter_tune_rf(X_train, y_train, preprocessor):
    """
    Hyperparameter tuning for Random Forest using RandomizedSearchCV with Stratified CV.
    """
    rf = RandomForestClassifier(class_weight='balanced', random_state=42, n_jobs=-1)
    pipe = ImbPipeline([
        ('preprocessor', preprocessor),
        ('classifier', rf)
    ])
    
    param_distributions = {
        'classifier__n_estimators': [100, 150],
        'classifier__max_depth': [8, 10, 12, None],
        'classifier__min_samples_split': [2, 5],
        'classifier__min_samples_leaf': [1, 2]
    }
    
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    search = RandomizedSearchCV(
        pipe,
        param_distributions=param_distributions,
        n_iter=5,
        scoring='roc_auc',
        cv=cv,
        random_state=42,
        n_jobs=-1
    )
    search.fit(X_train, y_train)
    return search.best_estimator_, search.best_params_

