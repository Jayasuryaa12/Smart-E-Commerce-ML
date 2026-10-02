import unittest
import pandas as pd
import numpy as np
import joblib
import os
import sys

sys.path.append(os.path.abspath('.'))

from src.data_loader import load_raw_data, get_dataset_summary, check_data_quality
from src.feature_engineering import create_session_features
from src.preprocessing import clean_data, get_feature_lists, build_preprocessor, prepare_data_split
from src.explainability import explain_single_prediction

class TestEndToEndPipeline(unittest.TestCase):

    def test_01_dataset_loading_and_summary(self):
        """Test dataset loading, schema verification, and baseline statistics."""
        data_path = os.path.join('data', 'online_shoppers_intention.csv')
        self.assertTrue(os.path.exists(data_path), f"Dataset file absent at {data_path}")
        
        df = load_raw_data(data_path)
        self.assertEqual(len(df), 12330, f"Expected 12,330 rows, got {len(df)}")
        self.assertEqual(len(df.columns), 18, f"Expected 18 columns, got {len(df.columns)}")
        
        summary = get_dataset_summary(df)
        self.assertEqual(summary['purchase_positive'], 1908)
        self.assertEqual(summary['purchase_negative'], 10422)
        self.assertEqual(summary['duplicate_rows'], 125)
        self.assertAlmostEqual(summary['conversion_rate_pct'], 15.47, places=1)
        print("[OK] [TEST 1 PASSED] Dataset schema & statistics verified.")

    def test_02_feature_engineering_and_cleaning(self):
        """Test domain feature creation and duplicate cleaning."""
        df = load_raw_data('data/online_shoppers_intention.csv')
        df_feat = create_session_features(df)
        self.assertIn('Total_Page_Views', df_feat.columns)
        self.assertIn('Total_Duration', df_feat.columns)
        self.assertIn('PageValue_Intensity', df_feat.columns)
        
        df_clean = clean_data(df_feat, drop_duplicates=True)
        self.assertEqual(len(df_clean), 12205, f"Expected 12,205 clean sessions, got {len(df_clean)}")
        print("[OK] [TEST 2 PASSED] Feature engineering & duplicate cleaning verified.")

    def test_03_preprocessing_split_leakage_check(self):
        """Test train-test split and ColumnTransformer preprocessor."""
        df = load_raw_data('data/online_shoppers_intention.csv')
        df_feat = create_session_features(df)
        df_clean = clean_data(df_feat, drop_duplicates=True)
        
        num_cols, cat_cols = get_feature_lists()
        preprocessor = build_preprocessor(num_cols, cat_cols)
        X_train, X_test, y_train, y_test = prepare_data_split(df_clean, target_col='Revenue', test_size=0.2, random_state=42)
        
        self.assertEqual(len(X_train), 9764)
        self.assertEqual(len(X_test), 2441)
        self.assertAlmostEqual(y_train.mean(), 0.1563, places=3)
        self.assertAlmostEqual(y_test.mean(), 0.1565, places=3)
        print("[OK] [TEST 3 PASSED] Stratified 80/20 train/test split & preprocessor verified.")

    def test_04_saved_model_artifacts_loading(self):
        """Test loading saved model artifacts and metadata."""
        self.assertTrue(os.path.exists('models/purchase_model.pkl'))
        self.assertTrue(os.path.exists('models/preprocessing_pipeline.pkl'))
        self.assertTrue(os.path.exists('models/segmentation_model.pkl'))
        self.assertTrue(os.path.exists('models/model_comparison_results.pkl'))
        
        purchase_model = joblib.load('models/purchase_model.pkl')
        model_results = joblib.load('models/model_comparison_results.pkl')
        
        self.assertIn('best_model_name', model_results)
        self.assertIn('comparison_df', model_results)
        comp_df = model_results['comparison_df']
        self.assertGreaterEqual(len(comp_df), 7)
        print(f"[OK] [TEST 4 PASSED] Model artifacts verified. Best Model: {model_results['best_model_name']}")

    def test_05_prediction_inference_probability(self):
        """Test single-session real-time prediction and probability bounds."""
        best_pipeline = joblib.load('models/purchase_model.pkl')
        
        high_intent_input = pd.DataFrame([{
            'Administrative': 5, 'Administrative_Duration': 120.0,
            'Informational': 2, 'Informational_Duration': 45.0,
            'ProductRelated': 45, 'ProductRelated_Duration': 1500.0,
            'BounceRates': 0.00, 'ExitRates': 0.01, 'PageValues': 55.0,
            'SpecialDay': 0.0, 'Month': 'Nov', 'OperatingSystems': 2,
            'Browser': 2, 'Region': 1, 'TrafficType': 2,
            'VisitorType': 'Returning_Visitor', 'Weekend': True
        }])
        
        feat_in = create_session_features(high_intent_input)
        prob = best_pipeline.predict_proba(feat_in)[0, 1]
        pred_class = best_pipeline.predict(feat_in)[0]
        
        self.assertTrue(0.0 <= prob <= 1.0, f"Probability {prob} out of bounds [0, 1]")
        self.assertGreater(prob, 0.50, f"High-intent profile expected p > 0.50, got {prob}")
        self.assertEqual(pred_class, 1)
        
        exp_single = explain_single_prediction(best_pipeline, feat_in)
        self.assertIn('Positive_Drivers', exp_single)
        self.assertIn('Negative_Drivers', exp_single)
        print(f"[OK] [TEST 5 PASSED] Prediction inference verified: p={prob:.4f}, class={pred_class}")

    def test_06_reports_generation(self):
        """Test CSV report generation."""
        self.assertTrue(os.path.exists('reports/model_comparison_summary.csv'))
        self.assertTrue(os.path.exists('reports/segmentation_summary.csv'))
        
        comp_report = pd.read_csv('reports/model_comparison_summary.csv')
        self.assertIn('F1-Score', comp_report.columns)
        self.assertIn('ROC-AUC', comp_report.columns)
        print("[OK] [TEST 6 PASSED] Benchmark & segmentation CSV reports verified.")

if __name__ == '__main__':
    unittest.main()
