import os
import sys
import datetime
import pandas as pd
import numpy as np
import joblib
from flask import Flask, request, jsonify

sys.path.append(os.path.abspath('.'))

from src.data_loader import load_raw_data, get_dataset_summary, check_data_quality
from src.feature_engineering import create_session_features
from src.explainability import explain_single_prediction

app = Flask(__name__)

# Configure Dynamic CORS for Production (Vercel / Frontend Origins)
@app.after_request
def add_cors_headers(response):
    allowed_origin = os.environ.get("CORS_ORIGINS", "*")
    response.headers['Access-Control-Allow-Origin'] = allowed_origin
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

# Optional flask_cors integration if package is present
try:
    from flask_cors import CORS
    CORS(app, resources={r"/*": {"origins": os.environ.get("CORS_ORIGINS", "*")}})
except ImportError:
    pass

# Project Relative Paths
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'online_shoppers_intention.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

def load_artifacts():
    try:
        purchase_model = joblib.load(os.path.join(MODEL_DIR, 'purchase_model.pkl'))
        preprocessor = joblib.load(os.path.join(MODEL_DIR, 'preprocessing_pipeline.pkl'))
        model_results = joblib.load(os.path.join(MODEL_DIR, 'model_comparison_results.pkl'))
        seg_data = joblib.load(os.path.join(MODEL_DIR, 'segmentation_model.pkl'))
        return purchase_model, preprocessor, model_results, seg_data
    except Exception as e:
        print(f"[WARNING] Error loading model artifacts: {e}")
        return None, None, None, None

purchase_model, preprocessor, model_results, seg_data = load_artifacts()

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'online',
        'system': 'Smart E-Commerce Customer Intelligence & Purchase Prediction API',
        'version': '1.0.0-PhaseII',
        'active_model': model_results.get('best_model_name', 'CatBoost') if model_results else 'CatBoost',
        'endpoints': [
            '/health',
            '/api/health',
            '/api/dataset/summary',
            '/api/dataset/quality',
            '/api/predict',
            '/api/segmentation',
            '/api/models'
        ]
    })

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'dataset_loaded': os.path.exists(DATA_PATH),
        'model_loaded': purchase_model is not None,
        'active_model_name': model_results.get('best_model_name', 'CatBoost') if model_results else 'CatBoost',
        'allowed_cors_origin': os.environ.get("CORS_ORIGINS", "*")
    }), 200

@app.route('/api/dataset/summary', methods=['GET'])
def dataset_summary():
    try:
        df = load_raw_data(DATA_PATH)
        summary = get_dataset_summary(df)
        return jsonify({'status': 'success', 'data': summary})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/dataset/quality', methods=['GET'])
def dataset_quality():
    try:
        df = load_raw_data(DATA_PATH)
        dq_df = check_data_quality(df)
        return jsonify({'status': 'success', 'data': dq_df.to_dict(orient='records')})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    if model_results is None or 'comparison_df' not in model_results:
        return jsonify({'status': 'error', 'message': 'Model comparison results not available'}), 404
    
    comp_df = model_results['comparison_df']
    return jsonify({
        'status': 'success',
        'best_model': model_results.get('best_model_name'),
        'metrics': comp_df.to_dict(orient='records')
    })

@app.route('/api/segmentation', methods=['GET'])
def get_segmentation():
    if seg_data is None or 'profile_summary' not in seg_data:
        return jsonify({'status': 'error', 'message': 'Segmentation data not available'}), 404
    
    profile_df = seg_data['profile_summary']
    return jsonify({
        'status': 'success',
        'k': seg_data.get('k'),
        'profiles': profile_df.reset_index().to_dict(orient='records')
    })

@app.route('/api/predict', methods=['POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    if purchase_model is None:
        return jsonify({'status': 'error', 'message': 'Prediction model artifact not loaded'}), 500
    
    try:
        payload = request.get_json(force=True)
        if not payload:
            return jsonify({'status': 'error', 'message': 'No JSON payload provided'}), 400
        
        if isinstance(payload, dict):
            raw_in = pd.DataFrame([payload])
        elif isinstance(payload, list):
            raw_in = pd.DataFrame(payload)
        else:
            return jsonify({'status': 'error', 'message': 'Invalid payload format'}), 400
            
        feat_in = create_session_features(raw_in)
        prob = float(purchase_model.predict_proba(feat_in)[0, 1])
        pred_class = int(purchase_model.predict(feat_in)[0])
        
        explanation = explain_single_prediction(purchase_model, feat_in)
        pos_drivers = explanation['Positive_Drivers'][['Feature', 'Value', 'SHAP_Impact']].to_dict(orient='records')
        neg_drivers = explanation['Negative_Drivers'][['Feature', 'Value', 'SHAP_Impact']].to_dict(orient='records')
        
        return jsonify({
            'status': 'success',
            'prediction_class': pred_class,
            'prediction_label': 'Purchase Intention' if pred_class == 1 else 'No Purchase Intention',
            'purchase_probability': round(prob, 4),
            'probability_percentage': round(prob * 100, 2),
            'positive_drivers': pos_drivers,
            'negative_drivers': neg_drivers
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print("=" * 70)
    print("STARTING SMART E-COMMERCE ML REST BACKEND SERVER")
    print(f"Backend API listening on port {port}")
    print("=" * 70)
    app.run(host='0.0.0.0', port=port, debug=False)
