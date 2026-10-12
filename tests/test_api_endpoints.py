import json
import pytest
from server import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_endpoint(client):
    res = client.get('/')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'online'
    assert 'endpoints' in data
    assert len(data['endpoints']) >= 10

def test_health_endpoint(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'healthy'
    assert data['dataset_loaded'] is True
    assert data['model_loaded'] is True
    assert data['active_model_name'] == 'CatBoost'

def test_meta_endpoint(client):
    res = client.get('/api/meta')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['data']['best_model_name'] == 'CatBoost'
    assert data['data']['dataset_total_sessions'] == 12330

def test_dataset_summary(client):
    res = client.get('/api/dataset/summary')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['data']['total_records'] == 12330

def test_dataset_quality(client):
    res = client.get('/api/dataset/quality')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert isinstance(data['data'], list)
    assert len(data['data']) > 0

def test_eda_overview(client):
    res = client.get('/api/eda/overview')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['data']['total_sessions'] == 12330
    assert 'month_breakdown' in data['data']
    assert 'visitor_breakdown' in data['data']
    assert 'numerical_summary' in data['data']

def test_eda_distribution(client):
    res = client.get('/api/eda/distribution?feature=PageValues&bins=15')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['feature'] == 'PageValues'
    assert len(data['data']) == 15
    assert 'buyer_conversion_rate' in data['data'][0]

def test_eda_correlation(client):
    res = client.get('/api/eda/correlation')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert 'columns' in data['data']
    assert 'matrix' in data['data']

def test_models_endpoint(client):
    res = client.get('/api/models')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['best_model'] == 'CatBoost'
    assert len(data['metrics']) == 8

def test_models_curves(client):
    res = client.get('/api/models/curves')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert 'CatBoost' in data['data']
    assert 'roc_curve' in data['data']['CatBoost']
    assert 'pr_curve' in data['data']['CatBoost']
    assert 'confusion_matrix' in data['data']['CatBoost']

def test_models_threshold(client):
    res = client.get('/api/models/threshold?model=CatBoost&t=0.5')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['model'] == 'CatBoost'
    assert data['threshold'] == 0.5
    assert 'f1_score' in data['metrics']
    assert 'confusion_matrix' in data

def test_segmentation_endpoint(client):
    res = client.get('/api/segmentation')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['k'] == 2
    assert len(data['profiles']) == 2

def test_segmentation_points(client):
    res = client.get('/api/segmentation/points')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert 'sample_points' in data['data']
    assert len(data['data']['sample_points']) > 0

def test_segmentation_algorithms(client):
    res = client.get('/api/segmentation/algorithms')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert isinstance(data['data'], list)
    assert len(data['data']) > 5

def test_explain_global(client):
    res = client.get('/api/explain/global')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert 'importance' in data['data']
    assert 'beeswarm' in data['data']
    assert 'dependence' in data['data']

def test_insights(client):
    res = client.get('/api/insights')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert 'conversion_insights' in data['data']
    assert 'actionable_recommendations' in data['data']

def test_predict_single(client):
    sample_payload = {
        'Administrative': 2,
        'Administrative_Duration': 50.0,
        'Informational': 1,
        'Informational_Duration': 20.0,
        'ProductRelated': 25,
        'ProductRelated_Duration': 1200.0,
        'BounceRates': 0.01,
        'ExitRates': 0.03,
        'PageValues': 15.5,
        'SpecialDay': 0.0,
        'Month': 'Nov',
        'OperatingSystems': 2,
        'Browser': 2,
        'Region': 1,
        'TrafficType': 2,
        'VisitorType': 'Returning_Visitor',
        'Weekend': False
    }
    res = client.post('/api/predict', data=json.dumps(sample_payload), content_type='application/json')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert 'purchase_probability' in data
    assert 'positive_drivers' in data
    assert 'risk_tier' in data
    assert 'recommended_action' in data

def test_predict_batch(client):
    rows = [
        {
            'Administrative': 0, 'Administrative_Duration': 0.0,
            'Informational': 0, 'Informational_Duration': 0.0,
            'ProductRelated': 1, 'ProductRelated_Duration': 10.0,
            'BounceRates': 0.2, 'ExitRates': 0.2, 'PageValues': 0.0,
            'SpecialDay': 0.0, 'Month': 'Feb', 'OperatingSystems': 1,
            'Browser': 1, 'Region': 1, 'TrafficType': 1,
            'VisitorType': 'Returning_Visitor', 'Weekend': False
        },
        {
            'Administrative': 3, 'Administrative_Duration': 120.0,
            'Informational': 2, 'Informational_Duration': 60.0,
            'ProductRelated': 40, 'ProductRelated_Duration': 2500.0,
            'BounceRates': 0.005, 'ExitRates': 0.02, 'PageValues': 45.0,
            'SpecialDay': 0.0, 'Month': 'Nov', 'OperatingSystems': 2,
            'Browser': 2, 'Region': 3, 'TrafficType': 2,
            'VisitorType': 'Returning_Visitor', 'Weekend': True
        }
    ]
    res = client.post('/api/predict/batch', data=json.dumps(rows), content_type='application/json')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'success'
    assert data['total_records'] == 2
    assert len(data['results']) == 2
    assert 'distribution' in data
    assert 'summary' in data
