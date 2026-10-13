import os
import json
import uuid
import datetime
from typing import Dict, Any, List, Optional, Tuple

DATABASE_URL = os.environ.get('DATABASE_URL')
DEFAULT_ADMIN_KEY = os.environ.get('ADMIN_API_KEY', 'ecommerce-admin-secret-key')

def get_engine_type(db_url: Optional[str] = None) -> str:
    url = db_url or os.environ.get('DATABASE_URL')
    if not url:
        return 'none'
    url_lower = url.lower()
    if url_lower.startswith('postgres://') or url_lower.startswith('postgresql://'):
        return 'postgresql'
    if url_lower.startswith('sqlite'):
        return 'sqlite'
    return 'unknown'

def normalize_db_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    # Render provides postgres://, which psycopg2/SQLAlchemy standardizes to postgresql://
    if url.startswith('postgres://'):
        return 'postgresql://' + url[len('postgres://'):]
    return url

def get_connection(db_url: Optional[str] = None):
    url = normalize_db_url(db_url or os.environ.get('DATABASE_URL'))
    engine = get_engine_type(url)
    
    if engine == 'postgresql':
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(url)
        return conn, 'postgresql'
    elif engine == 'sqlite':
        import sqlite3
        sqlite_path = url.replace('sqlite:///', '').replace('sqlite://', '')
        if sqlite_path in ('', ':memory:'):
            sqlite_path = ':memory:'
        else:
            # Ensure directory exists
            os.makedirs(os.path.dirname(os.path.abspath(sqlite_path)), exist_ok=True)
        conn = sqlite3.connect(sqlite_path)
        conn.row_factory = sqlite3.Row
        return conn, 'sqlite'
    else:
        return None, 'none'

def init_db(db_url: Optional[str] = None) -> bool:
    """
    Initializes the prediction_history table and indexes safely.
    Works with both PostgreSQL (production) and SQLite (testing/local).
    """
    conn, engine = get_connection(db_url)
    if conn is None:
        print("[DATABASE] No DATABASE_URL configured. Persistence is inactive.")
        return False

    try:
        cur = conn.cursor()
        if engine == 'postgresql':
            cur.execute("""
            CREATE TABLE IF NOT EXISTS prediction_history (
                id VARCHAR(64) PRIMARY KEY,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                session_features JSONB NOT NULL,
                prediction_class INTEGER NOT NULL,
                prediction_label VARCHAR(64) NOT NULL,
                purchase_probability DOUBLE PRECISION NOT NULL,
                risk_tier VARCHAR(64) NOT NULL,
                recommended_action TEXT,
                positive_drivers JSONB,
                negative_drivers JSONB
            );
            CREATE INDEX IF NOT EXISTS idx_prediction_history_created_at ON prediction_history (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_prediction_history_class ON prediction_history (prediction_class);
            CREATE INDEX IF NOT EXISTS idx_prediction_history_risk_tier ON prediction_history (risk_tier);
            """)
        elif engine == 'sqlite':
            cur.executescript("""
            CREATE TABLE IF NOT EXISTS prediction_history (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                session_features TEXT NOT NULL,
                prediction_class INTEGER NOT NULL,
                prediction_label TEXT NOT NULL,
                purchase_probability REAL NOT NULL,
                risk_tier TEXT NOT NULL,
                recommended_action TEXT,
                positive_drivers TEXT,
                negative_drivers TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_prediction_history_created_at ON prediction_history (created_at DESC);
            """)
        conn.commit()
        cur.close()
        conn.close()
        print(f"[DATABASE] Schema initialized successfully on engine: {engine}")
        return True
    except Exception as e:
        print(f"[DATABASE WARNING] Schema initialization failed: {e}")
        try:
            conn.close()
        except Exception:
            pass
        return False

def save_prediction(
    session_features: Dict[str, Any],
    prediction_class: int,
    prediction_label: str,
    purchase_probability: float,
    risk_tier: str,
    recommended_action: Optional[str] = None,
    positive_drivers: Optional[List[Dict[str, Any]]] = None,
    negative_drivers: Optional[List[Dict[str, Any]]] = None,
    db_url: Optional[str] = None
) -> Tuple[bool, str, Optional[str]]:
    """
    Saves a single prediction record to PostgreSQL or SQLite.
    Returns (success, prediction_id, error_message).
    """
    prediction_id = str(uuid.uuid4())
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    
    conn, engine = get_connection(db_url)
    if conn is None:
        return False, prediction_id, "Database not configured (DATABASE_URL unset)"

    try:
        cur = conn.cursor()
        if engine == 'postgresql':
            import psycopg2.extras
            cur.execute("""
                INSERT INTO prediction_history (
                    id, created_at, session_features, prediction_class,
                    prediction_label, purchase_probability, risk_tier,
                    recommended_action, positive_drivers, negative_drivers
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                prediction_id,
                now_utc,
                psycopg2.extras.Json(session_features),
                int(prediction_class),
                str(prediction_label),
                float(purchase_probability),
                str(risk_tier),
                recommended_action,
                psycopg2.extras.Json(positive_drivers or []),
                psycopg2.extras.Json(negative_drivers or [])
            ))
        elif engine == 'sqlite':
            cur.execute("""
                INSERT INTO prediction_history (
                    id, created_at, session_features, prediction_class,
                    prediction_label, purchase_probability, risk_tier,
                    recommended_action, positive_drivers, negative_drivers
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                prediction_id,
                now_utc.isoformat(),
                json.dumps(session_features),
                int(prediction_class),
                str(prediction_label),
                float(purchase_probability),
                str(risk_tier),
                recommended_action,
                json.dumps(positive_drivers or []),
                json.dumps(negative_drivers or [])
            ))

        conn.commit()
        cur.close()
        conn.close()
        return True, prediction_id, None
    except Exception as e:
        err_msg = str(e)
        print(f"[DATABASE ERROR] Failed to save prediction {prediction_id}: {err_msg}")
        try:
            conn.close()
        except Exception:
            pass
        return False, prediction_id, err_msg

def save_predictions_batch(
    records: List[Dict[str, Any]],
    db_url: Optional[str] = None
) -> Tuple[int, Optional[str]]:
    """
    Saves multiple prediction records in a single database transaction.
    Returns (saved_count, error_message).
    """
    if not records:
        return 0, None

    conn, engine = get_connection(db_url)
    if conn is None:
        return 0, "Database not configured (DATABASE_URL unset)"

    saved_count = 0
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    try:
        cur = conn.cursor()
        for r in records:
            p_id = r.get('id') or str(uuid.uuid4())
            ts = r.get('created_at') or now_utc
            features = r.get('session_features', {})
            p_class = int(r.get('prediction_class', 0))
            p_label = str(r.get('prediction_label', 'No Purchase Intention'))
            p_prob = float(r.get('purchase_probability', 0.0))
            p_tier = str(r.get('risk_tier', 'Low Intent'))
            rec_action = r.get('recommended_action', '')
            pos = r.get('positive_drivers', [])
            neg = r.get('negative_drivers', [])

            if engine == 'postgresql':
                import psycopg2.extras
                cur.execute("""
                    INSERT INTO prediction_history (
                        id, created_at, session_features, prediction_class,
                        prediction_label, purchase_probability, risk_tier,
                        recommended_action, positive_drivers, negative_drivers
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    p_id, ts, psycopg2.extras.Json(features),
                    p_class, p_label, p_prob, p_tier, rec_action,
                    psycopg2.extras.Json(pos), psycopg2.extras.Json(neg)
                ))
            elif engine == 'sqlite':
                cur.execute("""
                    INSERT INTO prediction_history (
                        id, created_at, session_features, prediction_class,
                        prediction_label, purchase_probability, risk_tier,
                        recommended_action, positive_drivers, negative_drivers
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p_id,
                    ts.isoformat() if hasattr(ts, 'isoformat') else str(ts),
                    json.dumps(features),
                    p_class, p_label, p_prob, p_tier, rec_action,
                    json.dumps(pos), json.dumps(neg)
                ))
            saved_count += 1

        conn.commit()
        cur.close()
        conn.close()
        return saved_count, None
    except Exception as e:
        err_msg = str(e)
        print(f"[DATABASE ERROR] Batch prediction insert failed: {err_msg}")
        try:
            conn.close()
        except Exception:
            pass
        return saved_count, err_msg

def get_prediction_history(
    page: int = 1,
    limit: int = 20,
    risk_tier: Optional[str] = None,
    prediction_class: Optional[int] = None,
    include_features: bool = False,
    db_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns paginated prediction history, sorted newest to oldest.
    """
    conn, engine = get_connection(db_url)
    if conn is None:
        return {
            'records': [],
            'pagination': {'total': 0, 'page': page, 'limit': limit, 'total_pages': 0},
            'database_configured': False
        }

    page = max(1, page)
    limit = max(1, min(100, limit))
    offset = (page - 1) * limit

    conditions = []
    params: List[Any] = []

    if risk_tier:
        conditions.append("risk_tier = %s" if engine == 'postgresql' else "risk_tier = ?")
        params.append(risk_tier)

    if prediction_class is not None:
        conditions.append("prediction_class = %s" if engine == 'postgresql' else "prediction_class = ?")
        params.append(int(prediction_class))

    where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    try:
        cur = conn.cursor()
        # Count total
        count_sql = f"SELECT COUNT(*) FROM prediction_history {where_clause}"
        cur.execute(count_sql, tuple(params))
        total_count = cur.fetchone()[0]

        # Fetch records
        param_placeholder = "%s" if engine == 'postgresql' else "?"
        select_sql = f"""
            SELECT id, created_at, session_features, prediction_class,
                   prediction_label, purchase_probability, risk_tier,
                   recommended_action, positive_drivers, negative_drivers
            FROM prediction_history
            {where_clause}
            ORDER BY created_at DESC
            LIMIT {param_placeholder} OFFSET {param_placeholder}
        """
        cur.execute(select_sql, tuple(params + [limit, offset]))
        rows = cur.fetchall()

        records = []
        for r in rows:
            # Parse row fields
            r_id, r_created_at, r_features, r_class, r_label, r_prob, r_tier, r_action, r_pos, r_neg = r
            
            # Format datetime
            created_str = r_created_at.isoformat() if hasattr(r_created_at, 'isoformat') else str(r_created_at)
            
            # Parse JSON if needed
            feat_val = r_features if isinstance(r_features, dict) else (json.loads(r_features) if r_features else {})
            pos_val = r_pos if isinstance(r_pos, list) else (json.loads(r_pos) if r_pos else [])
            neg_val = r_neg if isinstance(r_neg, list) else (json.loads(r_neg) if r_neg else [])

            record_item = {
                'id': r_id,
                'created_at': created_str,
                'prediction_class': int(r_class),
                'prediction_label': r_label,
                'purchase_probability': round(float(r_prob), 4),
                'probability_percentage': round(float(r_prob) * 100, 2),
                'risk_tier': r_tier,
                'recommended_action': r_action,
                'positive_drivers': pos_val,
                'negative_drivers': neg_val,
            }
            if include_features:
                record_item['session_features'] = feat_val

            records.append(record_item)

        cur.close()
        conn.close()

        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1

        return {
            'records': records,
            'pagination': {
                'total': total_count,
                'page': page,
                'limit': limit,
                'total_pages': total_pages
            },
            'database_configured': True
        }
    except Exception as e:
        print(f"[DATABASE ERROR] Failed to fetch prediction history: {e}")
        try:
            conn.close()
        except Exception:
            pass
        return {
            'records': [],
            'pagination': {'total': 0, 'page': page, 'limit': limit, 'total_pages': 0},
            'error': str(e),
            'database_configured': True
        }

def get_prediction_stats(db_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Aggregates metrics across all stored predictions.
    """
    conn, engine = get_connection(db_url)
    if conn is None:
        return {
            'total_predictions': 0,
            'purchase_intent_count': 0,
            'non_purchase_intent_count': 0,
            'conversion_rate_pct': 0.0,
            'avg_purchase_probability': 0.0,
            'tier_distribution': {'High Intent': 0, 'Moderate Intent': 0, 'Low Intent / Bounce Risk': 0},
            'database_configured': False
        }

    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), AVG(purchase_probability) FROM prediction_history")
        row = cur.fetchone()
        total_count = row[0] if row else 0
        avg_prob = float(row[1]) if row and row[1] is not None else 0.0

        cur.execute("SELECT prediction_class, COUNT(*) FROM prediction_history GROUP BY prediction_class")
        class_rows = cur.fetchall()
        class_counts = {int(r[0]): int(r[1]) for r in class_rows}
        purchases = class_counts.get(1, 0)
        non_purchases = class_counts.get(0, 0)

        cur.execute("SELECT risk_tier, COUNT(*) FROM prediction_history GROUP BY risk_tier")
        tier_rows = cur.fetchall()
        tier_counts = {str(r[0]): int(r[1]) for r in tier_rows}

        cur.close()
        conn.close()

        conversion_rate = round((purchases / total_count * 100), 2) if total_count > 0 else 0.0

        return {
            'total_predictions': total_count,
            'purchase_intent_count': purchases,
            'non_purchase_intent_count': non_purchases,
            'conversion_rate_pct': conversion_rate,
            'avg_purchase_probability': round(avg_prob * 100, 2),
            'tier_distribution': tier_counts,
            'database_configured': True
        }
    except Exception as e:
        print(f"[DATABASE ERROR] Failed to fetch prediction stats: {e}")
        try:
            conn.close()
        except Exception:
            pass
        return {
            'total_predictions': 0,
            'purchase_intent_count': 0,
            'non_purchase_intent_count': 0,
            'conversion_rate_pct': 0.0,
            'avg_purchase_probability': 0.0,
            'tier_distribution': {},
            'error': str(e),
            'database_configured': True
        }

def check_database_health(db_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Checks database connectivity and readiness without exposing credentials.
    """
    url = normalize_db_url(db_url or os.environ.get('DATABASE_URL'))
    engine = get_engine_type(url)

    if engine == 'none':
        return {
            'status': 'unconfigured',
            'connected': False,
            'engine': 'none',
            'message': 'DATABASE_URL environment variable is not configured on this host.',
            'total_records': 0
        }

    conn, eng = get_connection(url)
    if conn is None:
        return {
            'status': 'error',
            'connected': False,
            'engine': engine,
            'message': 'Failed to establish database connection.',
            'total_records': 0
        }

    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM prediction_history")
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return {
            'status': 'connected',
            'connected': True,
            'engine': engine,
            'total_records': int(count),
            'message': f"Database connected successfully ({engine.upper()})."
        }
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        return {
            'status': 'degraded',
            'connected': False,
            'engine': engine,
            'message': f"Connected to database server but table query failed: {e}",
            'total_records': 0
        }
