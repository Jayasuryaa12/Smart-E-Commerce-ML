import os
import sys
import datetime
import json
import uuid
import pandas as pd
import numpy as np
import joblib
from flask import Flask, request, jsonify

sys.path.append(os.path.abspath('.'))

from src.data_loader import load_raw_data, get_dataset_summary, check_data_quality
from src.feature_engineering import create_session_features
from src.explainability import explain_single_prediction
from src.database import (
    init_db, save_prediction, save_predictions_batch,
    get_prediction_history, get_prediction_stats, check_database_health
)

# Initialize database schema safely if configured
try:
    init_db()
except Exception as e:
    print(f"[WARNING] Database auto-init warning: {e}")

app = Flask(__name__)

# Configure CORS cleanly for production (Vercel & local development)
allowed_origins_env = os.environ.get("CORS_ORIGINS", "*")
try:
    from flask_cors import CORS
    if allowed_origins_env == "*":
        CORS(app, resources={r"/*": {"origins": "*"}})
    else:
        origins_list = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
        if "https://smart-e-commerce-ml.vercel.app" not in origins_list:
            origins_list.append("https://smart-e-commerce-ml.vercel.app")
        CORS(app, resources={r"/*": {"origins": origins_list}})
except ImportError:
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = allowed_origins_env
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        return response

@app.before_request
def handle_options_preflight():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        return response

# Project Relative Paths
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(ROOT_DIR, 'data', 'online_shoppers_intention.csv')
MODEL_DIR = os.path.join(ROOT_DIR, 'models')
CACHE_DIR = os.path.join(ROOT_DIR, 'reports', 'api_cache')

def load_artifacts():
    p_model, prep, m_results, s_data = None, None, None, None
    print(f"[STARTUP] Loading ML model artifacts from: {MODEL_DIR}")
    
    try:
        p_model = joblib.load(os.path.join(MODEL_DIR, 'purchase_model.pkl'))
        print("  ✓ Loaded purchase_model.pkl")
    except Exception as e:
        print(f"  ✗ Failed to load purchase_model.pkl: {e}")

    try:
        prep = joblib.load(os.path.join(MODEL_DIR, 'preprocessing_pipeline.pkl'))
        print("  ✓ Loaded preprocessing_pipeline.pkl")
    except Exception as e:
        print(f"  ✗ Failed to load preprocessing_pipeline.pkl: {e}")

    try:
        m_results = joblib.load(os.path.join(MODEL_DIR, 'model_comparison_results.pkl'))
        print("  ✓ Loaded model_comparison_results.pkl")
    except Exception as e:
        print(f"  ✗ Failed to load model_comparison_results.pkl: {e}")

    try:
        s_data = joblib.load(os.path.join(MODEL_DIR, 'segmentation_model.pkl'))
        print("  ✓ Loaded segmentation_model.pkl")
    except Exception as e:
        print(f"  ✗ Failed to load segmentation_model.pkl: {e}")

    return p_model, prep, m_results, s_data

def read_cache_json(filename):
    cache_file = os.path.join(CACHE_DIR, filename)
    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            return json.load(f)
    return None

# Ensure cache exists; if not, trigger export
if not os.path.exists(CACHE_DIR) or not os.path.exists(os.path.join(CACHE_DIR, 'eda_overview.json')):
    try:
        from scripts.export_artifacts import export_all
        export_all()
    except Exception as e:
        print(f"[WARNING] Auto-export artifacts failed: {e}")

purchase_model, preprocessor, model_results, seg_data = load_artifacts()

# In-memory cached dataset to prevent repeated disk I/O on hot endpoints
_cached_raw_df = None
def get_raw_df():
    global _cached_raw_df
    if _cached_raw_df is None:
        if os.path.exists(DATA_PATH):
            _cached_raw_df = load_raw_data(DATA_PATH)
    return _cached_raw_df

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
            '/api/meta',
            '/api/dataset/summary',
            '/api/dataset/quality',
            '/api/eda/overview',
            '/api/eda/distribution',
            '/api/eda/correlation',
            '/api/models',
            '/api/models/curves',
            '/api/models/threshold',
            '/api/segmentation',
            '/api/segmentation/points',
            '/api/segmentation/algorithms',
            '/api/explain/global',
            '/api/insights',
            '/api/predict',
            '/api/predict/batch',
            '/api/predictions/history',
            '/api/predictions/stats',
            '/api/predictions/health'
        ]
    })

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    models_ready = (purchase_model is not None and preprocessor is not None)
    data_ready = os.path.exists(DATA_PATH)
    is_healthy = models_ready and data_ready
    db_health = check_database_health()

    payload = {
        'status': 'healthy' if is_healthy else 'degraded',
        'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'dataset_loaded': data_ready,
        'model_loaded': models_ready,
        'database_status': db_health.get('status', 'unconfigured'),
        'database_connected': db_health.get('connected', False),
        'models_readiness': {
            'purchase_model': purchase_model is not None,
            'preprocessor': preprocessor is not None,
            'model_comparison_results': model_results is not None,
            'segmentation_model': seg_data is not None
        },
        'active_model_name': model_results.get('best_model_name', 'CatBoost') if model_results else 'CatBoost',
        'allowed_cors_origin': os.environ.get("CORS_ORIGINS", "*")
    }
    return jsonify(payload), 200 if is_healthy else 503

@app.route('/api/meta', methods=['GET'])
def get_meta():
    try:
        meta_file = os.path.join(MODEL_DIR, 'model_metadata.json')
        if os.path.exists(meta_file):
            with open(meta_file, 'r') as f:
                meta_data = json.load(f)
            return jsonify({'status': 'success', 'data': meta_data})
        return jsonify({'status': 'error', 'message': 'model_metadata.json not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/dataset/summary', methods=['GET'])
def dataset_summary():
    try:
        df = get_raw_df()
        if df is None:
            return jsonify({'status': 'error', 'message': 'Dataset file not found'}), 404
        summary = get_dataset_summary(df)
        return jsonify({'status': 'success', 'data': summary})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/dataset/quality', methods=['GET'])
def dataset_quality():
    try:
        df = get_raw_df()
        if df is None:
            return jsonify({'status': 'error', 'message': 'Dataset file not found'}), 404
        dq_df = check_data_quality(df)
        return jsonify({'status': 'success', 'data': dq_df.to_dict(orient='records')})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/eda/overview', methods=['GET'])
def eda_overview():
    try:
        cached = read_cache_json('eda_overview.json')
        if cached:
            return jsonify({'status': 'success', 'data': cached})
        return jsonify({'status': 'error', 'message': 'EDA overview cache not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/eda/distribution', methods=['GET'])
def eda_distribution():
    try:
        feature = request.args.get('feature', 'PageValues')
        bins = int(request.args.get('bins', 20))
        df = get_raw_df()
        if df is None:
            return jsonify({'status': 'error', 'message': 'Dataset not found'}), 404
        if feature not in df.columns:
            return jsonify({'status': 'error', 'message': f"Feature '{feature}' not in dataset"}), 400
        
        series = df[feature].dropna()
        if not np.issubdtype(series.dtype, np.number):
            return jsonify({'status': 'error', 'message': f"Feature '{feature}' is not numeric"}), 400
            
        counts, bin_edges = np.histogram(series, bins=bins)
        
        buyers = df[df['Revenue'] == True][feature].dropna()
        non_buyers = df[df['Revenue'] == False][feature].dropna()
        buyers_counts, _ = np.histogram(buyers, bins=bin_edges)
        non_buyers_counts, _ = np.histogram(non_buyers, bins=bin_edges)
        
        bin_items = []
        for i in range(len(counts)):
            bin_items.append({
                'bin_start': round(float(bin_edges[i]), 4),
                'bin_end': round(float(bin_edges[i+1]), 4),
                'bin_label': f"{round(float(bin_edges[i]), 2)} - {round(float(bin_edges[i+1]), 2)}",
                'total_count': int(counts[i]),
                'buyers_count': int(buyers_counts[i]),
                'non_buyers_count': int(non_buyers_counts[i]),
                'buyer_conversion_rate': round(float(buyers_counts[i] / counts[i] * 100), 2) if counts[i] > 0 else 0.0
            })
            
        return jsonify({
            'status': 'success',
            'feature': feature,
            'bins_count': bins,
            'summary': {
                'min': round(float(series.min()), 4),
                'max': round(float(series.max()), 4),
                'mean': round(float(series.mean()), 4),
                'median': round(float(series.median()), 4),
                'std': round(float(series.std()), 4)
            },
            'data': bin_items
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/eda/correlation', methods=['GET'])
def eda_correlation():
    try:
        cached = read_cache_json('correlation.json')
        if cached:
            return jsonify({'status': 'success', 'data': cached})
        return jsonify({'status': 'error', 'message': 'Correlation cache not found'}), 404
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

@app.route('/api/models/curves', methods=['GET'])
def get_curves():
    try:
        cached = read_cache_json('curves.json')
        if cached:
            return jsonify({'status': 'success', 'data': cached})
        return jsonify({'status': 'error', 'message': 'Curves cache not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/models/threshold', methods=['GET'])
def get_model_threshold():
    try:
        model_name = request.args.get('model', 'CatBoost')
        try:
            t = float(request.args.get('t', 0.5))
        except ValueError:
            return jsonify({'status': 'error', 'message': 'Invalid threshold value'}), 400
            
        if t < 0.0 or t > 1.0:
            return jsonify({'status': 'error', 'message': 'Threshold must be between 0.0 and 1.0'}), 400
            
        cached_preds = read_cache_json('test_predictions.json')
        if not cached_preds or model_name not in cached_preds.get('test_probs', {}):
            return jsonify({'status': 'error', 'message': f"Predictions for model '{model_name}' not found"}), 404
            
        y_true = np.array(cached_preds['y_test'])
        probs = np.array(cached_preds['test_probs'][model_name])
        y_pred = (probs >= t).astype(int)
        
        tn = int(np.sum((y_true == 0) & (y_pred == 0)))
        fp = int(np.sum((y_true == 0) & (y_pred == 1)))
        fn = int(np.sum((y_true == 1) & (y_pred == 0)))
        tp = int(np.sum((y_true == 1) & (y_pred == 1)))
        
        prec = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        rec = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float(2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
        acc = float((tp + tn) / len(y_true))
        
        return jsonify({
            'status': 'success',
            'model': model_name,
            'threshold': round(t, 4),
            'metrics': {
                'precision': round(prec, 4),
                'recall': round(rec, 4),
                'f1_score': round(f1, 4),
                'accuracy': round(acc, 4)
            },
            'confusion_matrix': {
                'tn': tn, 'fp': fp, 'fn': fn, 'tp': tp,
                'total': len(y_true),
                'matrix': [[tn, fp], [fn, tp]]
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/segmentation', methods=['GET'])
def get_segmentation():
    if seg_data is None or 'profile_summary' not in seg_data:
        return jsonify({'status': 'error', 'message': 'Segmentation data not available'}), 404
    
    profile_df = seg_data['profile_summary']
    profiles_data = json.loads(profile_df.reset_index().to_json(orient='records'))
    return jsonify({
        'status': 'success',
        'k': int(seg_data.get('k', 2)),
        'profiles': profiles_data
    })

@app.route('/api/segmentation/points', methods=['GET'])
def get_segmentation_points():
    try:
        cached = read_cache_json('segmentation_points.json')
        if cached:
            return jsonify({'status': 'success', 'data': cached})
        return jsonify({'status': 'error', 'message': 'Segmentation points cache not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/segmentation/algorithms', methods=['GET'])
def get_segmentation_algorithms():
    try:
        cached = read_cache_json('segmentation_algorithms.json')
        if cached:
            return jsonify({'status': 'success', 'data': cached})
        return jsonify({'status': 'error', 'message': 'Segmentation algorithm evaluation cache not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/explain/global', methods=['GET'])
def get_explain_global():
    try:
        cached = read_cache_json('explain_global.json')
        if cached:
            return jsonify({'status': 'success', 'data': cached})
        return jsonify({'status': 'error', 'message': 'Explainability cache not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/insights', methods=['GET'])
def get_insights():
    try:
        cached = read_cache_json('insights.json')
        if cached:
            return jsonify({'status': 'success', 'data': cached})
        return jsonify({'status': 'error', 'message': 'Insights cache not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

REQUIRED_PREDICT_COLS = [
    'Administrative', 'Administrative_Duration', 'Informational', 'Informational_Duration',
    'ProductRelated', 'ProductRelated_Duration', 'BounceRates', 'ExitRates', 'PageValues',
    'SpecialDay', 'Month', 'OperatingSystems', 'Browser', 'Region', 'TrafficType',
    'VisitorType', 'Weekend'
]

@app.route('/api/predict', methods=['POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    if purchase_model is None or preprocessor is None:
        return jsonify({'status': 'error', 'message': 'Prediction model artifact not loaded'}), 503
    
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

        missing = [c for c in REQUIRED_PREDICT_COLS if c not in raw_in.columns]
        if missing:
            return jsonify({
                'status': 'error',
                'message': f"Missing required fields: {', '.join(missing)}"
            }), 400
            
        feat_in = create_session_features(raw_in)
        prob = float(purchase_model.predict_proba(feat_in)[0, 1])
        pred_class = int(purchase_model.predict(feat_in)[0])
        
        explanation = explain_single_prediction(purchase_model, feat_in)
        pos_drivers = explanation['Positive_Drivers'][['Feature', 'Value', 'SHAP_Impact']].to_dict(orient='records')
        neg_drivers = explanation['Negative_Drivers'][['Feature', 'Value', 'SHAP_Impact']].to_dict(orient='records')
        
        # Risk tier definition
        if prob >= 0.70:
            risk_tier = 'High Intent'
        elif prob >= 0.35:
            risk_tier = 'Moderate Intent'
        else:
            risk_tier = 'Low Intent / Bounce Risk'

        # Actionable strategy derived from prediction
        if prob >= 0.70:
            recommended_action = "Trigger 1-click Express Checkout or free express shipping badge to close sale immediately."
        elif prob >= 0.35:
            recommended_action = "Display limited-time 10% coupon or customer review highlights to nudge tentative buyer."
        else:
            recommended_action = "Show exit-intent engagement modal or relevant popular category suggestions."
            
        # Persist prediction to database layer
        saved_ok, pred_id, save_err = save_prediction(
            session_features=raw_in.iloc[0].to_dict(),
            prediction_class=pred_class,
            prediction_label='Purchase Intention' if pred_class == 1 else 'No Purchase Intention',
            purchase_probability=round(prob, 4),
            risk_tier=risk_tier,
            recommended_action=recommended_action,
            positive_drivers=pos_drivers,
            negative_drivers=neg_drivers
        )
            
        return jsonify({
            'status': 'success',
            'prediction_id': pred_id,
            'persisted': saved_ok,
            'persistence_status': 'stored' if saved_ok else f'unpersisted ({save_err})',
            'prediction_class': pred_class,
            'prediction_label': 'Purchase Intention' if pred_class == 1 else 'No Purchase Intention',
            'purchase_probability': round(prob, 4),
            'probability_percentage': round(prob * 100, 2),
            'risk_tier': risk_tier,
            'recommended_action': recommended_action,
            'positive_drivers': pos_drivers,
            'negative_drivers': neg_drivers
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/predict/batch', methods=['POST', 'OPTIONS'])
def predict_batch():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    if purchase_model is None or preprocessor is None:
        return jsonify({'status': 'error', 'message': 'Prediction model artifact not loaded'}), 503
        
    try:
        # Check if CSV file upload or JSON
        if 'file' in request.files:
            file = request.files['file']
            if not file.filename.endswith('.csv'):
                return jsonify({'status': 'error', 'message': 'Only CSV files are supported for file upload'}), 400
            raw_df = pd.read_csv(file)
        else:
            payload = request.get_json(force=True)
            if not payload or not isinstance(payload, list):
                return jsonify({'status': 'error', 'message': 'Expected a JSON array of records or multipart CSV file'}), 400
            raw_df = pd.DataFrame(payload)

        total_records = len(raw_df)
        if total_records == 0:
            return jsonify({'status': 'error', 'message': 'Empty payload provided'}), 400

        required_cols = [
            'Administrative', 'Administrative_Duration', 'Informational', 'Informational_Duration',
            'ProductRelated', 'ProductRelated_Duration', 'BounceRates', 'ExitRates', 'PageValues',
            'SpecialDay', 'Month', 'OperatingSystems', 'Browser', 'Region', 'TrafficType',
            'VisitorType', 'Weekend'
        ]
        
        # Validate column schema
        missing_cols = [c for c in required_cols if c not in raw_df.columns]
        if missing_cols:
            return jsonify({
                'status': 'error',
                'message': f"Missing required columns: {', '.join(missing_cols)}"
            }), 400

        # Vectorized feature engineering & scoring
        feat_df = create_session_features(raw_df)
        probs = purchase_model.predict_proba(feat_df)[:, 1]
        preds = purchase_model.predict(feat_df)
        
        results = []
        purchases = 0
        non_purchases = 0
        high_tier = 0
        med_tier = 0
        low_tier = 0
        batch_to_persist = []
        
        for i in range(total_records):
            p = float(probs[i])
            c = int(preds[i])
            if c == 1:
                purchases += 1
            else:
                non_purchases += 1
                
            if p >= 0.70:
                tier = 'High Intent'
                high_tier += 1
            elif p >= 0.35:
                tier = 'Moderate Intent'
                med_tier += 1
            else:
                tier = 'Low Intent / Bounce Risk'
                low_tier += 1
                
            row_id = str(uuid.uuid4())
            results.append({
                'id': row_id,
                'row_index': i + 1,
                'valid': True,
                'purchase_probability': round(p, 4),
                'probability_percentage': round(p * 100, 2),
                'prediction_class': c,
                'prediction_label': 'Purchase Intention' if c == 1 else 'No Purchase Intention',
                'risk_tier': tier
            })

            batch_to_persist.append({
                'id': row_id,
                'session_features': raw_df.iloc[i].to_dict(),
                'prediction_class': c,
                'prediction_label': 'Purchase Intention' if c == 1 else 'No Purchase Intention',
                'purchase_probability': round(p, 4),
                'risk_tier': tier,
                'recommended_action': "High intent conversion strategy" if c == 1 else "Engagement / retention strategy"
            })

        # Persist batch records to database
        saved_batch_count, batch_save_err = save_predictions_batch(batch_to_persist)

        # Probability histogram (10 bins)
        hist_counts, hist_edges = np.histogram(probs, bins=10, range=(0.0, 1.0))
        hist_data = []
        for h in range(len(hist_counts)):
            hist_data.append({
                'range': f"{int(hist_edges[h]*100)}-{int(hist_edges[h+1]*100)}%",
                'count': int(hist_counts[h])
            })

        return jsonify({
            'status': 'success',
            'total_records': total_records,
            'valid_records': total_records,
            'invalid_records': 0,
            'persisted_records': saved_batch_count,
            'summary': {
                'predicted_purchases': purchases,
                'predicted_non_purchases': non_purchases,
                'conversion_rate': round(purchases / total_records * 100, 2),
                'avg_probability': round(float(np.mean(probs)) * 100, 2),
                'high_tier_count': high_tier,
                'moderate_tier_count': med_tier,
                'low_tier_count': low_tier,
                'persisted_count': saved_batch_count
            },
            'distribution': hist_data,
            'results': results[:500] # return first 500 for snappy UI rendering, full count in summary
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/api/predictions/history', methods=['GET', 'OPTIONS'])
def predictions_history():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    risk_tier = request.args.get('tier', None, type=str)
    pred_class = request.args.get('class', None, type=int)

    # Access control: authenticate admin to show raw session features
    auth_header = request.headers.get("Authorization", "")
    admin_key_header = request.headers.get("X-Admin-Key", "")
    admin_key_param = request.args.get("api_key", "")
    expected_key = os.environ.get("ADMIN_API_KEY", "ecommerce-admin-secret-key")

    is_admin = False
    if (auth_header and auth_header.startswith("Bearer ") and auth_header[7:].strip() == expected_key) or \
       (admin_key_header and admin_key_header.strip() == expected_key) or \
       (admin_key_param and admin_key_param.strip() == expected_key):
        is_admin = True

    history_data = get_prediction_history(
        page=page,
        limit=limit,
        risk_tier=risk_tier,
        prediction_class=pred_class,
        include_features=is_admin
    )

    return jsonify({
        'status': 'success',
        'data': history_data['records'],
        'pagination': history_data['pagination'],
        'is_admin': is_admin,
        'database_configured': history_data.get('database_configured', False)
    }), 200

@app.route('/api/predictions/stats', methods=['GET', 'OPTIONS'])
def predictions_stats():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    stats = get_prediction_stats()
    return jsonify({
        'status': 'success',
        'data': stats
    }), 200

@app.route('/api/predictions/health', methods=['GET', 'OPTIONS'])
def predictions_health():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    health_info = check_database_health()
    status_code = 200 if health_info.get('connected', False) else 503
    return jsonify({
        'status': 'success' if health_info.get('connected', False) else 'warning',
        'data': health_info
    }), status_code

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print("=" * 70)
    print("STARTING SMART E-COMMERCE ML REST BACKEND SERVER")
    print(f"Backend API listening on port {port}")
    print("=" * 70)
    app.run(host='0.0.0.0', port=port, debug=False)
