import os
import pytest
from src.database import (
    init_db,
    save_prediction,
    save_predictions_batch,
    get_prediction_history,
    get_prediction_stats,
    check_database_health
)

TEST_DB_PATH = "data/test_predictions.db"
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH}"

@pytest.fixture(autouse=True)
def setup_test_db():
    # Clean up before and after test
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    init_db(TEST_DB_URL)
    yield
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)

def test_database_init_and_health():
    health = check_database_health(TEST_DB_URL)
    assert health['connected'] is True
    assert health['status'] == 'connected'
    assert health['engine'] == 'sqlite'
    assert health['total_records'] == 0

def test_save_single_prediction():
    sample_features = {'Administrative': 2, 'PageValues': 15.0}
    ok, pid, err = save_prediction(
        session_features=sample_features,
        prediction_class=1,
        prediction_label='Purchase Intention',
        purchase_probability=0.88,
        risk_tier='High Intent',
        recommended_action='Offer fast checkout',
        positive_drivers=[{'Feature': 'PageValues', 'SHAP_Impact': 0.8}],
        negative_drivers=[],
        db_url=TEST_DB_URL
    )
    assert ok is True
    assert pid is not None
    assert err is None

    # Verify history
    history = get_prediction_history(page=1, limit=10, include_features=True, db_url=TEST_DB_URL)
    assert history['pagination']['total'] == 1
    assert len(history['records']) == 1
    rec = history['records'][0]
    assert rec['id'] == pid
    assert rec['prediction_class'] == 1
    assert rec['prediction_label'] == 'Purchase Intention'
    assert rec['purchase_probability'] == 0.88
    assert rec['risk_tier'] == 'High Intent'
    assert rec['session_features']['PageValues'] == 15.0

def test_save_batch_predictions():
    batch = [
        {
            'session_features': {'PageValues': 0.0},
            'prediction_class': 0,
            'prediction_label': 'No Purchase Intention',
            'purchase_probability': 0.05,
            'risk_tier': 'Low Intent / Bounce Risk',
            'recommended_action': 'Show exit modal'
        },
        {
            'session_features': {'PageValues': 25.0},
            'prediction_class': 1,
            'prediction_label': 'Purchase Intention',
            'purchase_probability': 0.92,
            'risk_tier': 'High Intent',
            'recommended_action': 'Offer 1-click checkout'
        }
    ]
    count, err = save_predictions_batch(batch, db_url=TEST_DB_URL)
    assert count == 2
    assert err is None

    stats = get_prediction_stats(TEST_DB_URL)
    assert stats['total_predictions'] == 2
    assert stats['purchase_intent_count'] == 1
    assert stats['non_purchase_intent_count'] == 1
    assert stats['conversion_rate_pct'] == 50.0

def test_pagination_and_sorting():
    for i in range(15):
        save_prediction(
            session_features={'PageValues': float(i)},
            prediction_class=1 if i % 2 == 0 else 0,
            prediction_label='Purchase Intention' if i % 2 == 0 else 'No Purchase Intention',
            purchase_probability=float(i) / 20.0,
            risk_tier='High Intent' if i % 2 == 0 else 'Low Intent',
            db_url=TEST_DB_URL
        )

    # Page 1, limit 5
    p1 = get_prediction_history(page=1, limit=5, db_url=TEST_DB_URL)
    assert p1['pagination']['total'] == 15
    assert p1['pagination']['total_pages'] == 3
    assert len(p1['records']) == 5

    # Page 2, limit 5
    p2 = get_prediction_history(page=2, limit=5, db_url=TEST_DB_URL)
    assert len(p2['records']) == 5

    # Check distinct records across pages
    ids_p1 = {r['id'] for r in p1['records']}
    ids_p2 = {r['id'] for r in p2['records']}
    assert len(ids_p1.intersection(ids_p2)) == 0

def test_access_control_feature_masking():
    save_prediction(
        session_features={'Administrative': 3, 'PageValues': 12.0},
        prediction_class=1,
        prediction_label='Purchase Intention',
        purchase_probability=0.75,
        risk_tier='High Intent',
        db_url=TEST_DB_URL
    )
    # Unauthenticated / unauthorized retrieval must NOT include session_features
    public_history = get_prediction_history(page=1, limit=10, include_features=False, db_url=TEST_DB_URL)
    assert 'session_features' not in public_history['records'][0]

    # Authorized admin retrieval includes raw session_features
    admin_history = get_prediction_history(page=1, limit=10, include_features=True, db_url=TEST_DB_URL)
    assert 'session_features' in admin_history['records'][0]
    assert admin_history['records'][0]['session_features']['Administrative'] == 3
