# Smart E-Commerce ML REST API Specification

The REST API server (`server.py`) exposes 18 endpoints to serve machine learning predictions, evaluation benchmarks, behavioral distributions, and segmentation intelligence.

**Base URL**: `http://localhost:5000` (Local) / `https://smart-ecommerce-ml.onrender.com` (Render Production)

---

## 1. System & Health Endpoints

### `GET /`
Returns service status, model version, active champion model, and available route inventory.

### `GET /api/health`
Returns system health, dataset status, loaded artifacts, active model name, and CORS origin.
```json
{
  "status": "healthy",
  "dataset_loaded": true,
  "model_loaded": true,
  "active_model_name": "CatBoost",
  "timestamp": "2026-10-12T06:30:00Z"
}
```

### `GET /api/meta`
Returns training timestamp, model version, total sessions, and evaluation metrics from `models/model_metadata.json`.

---

## 2. Dataset & EDA Endpoints

### `GET /api/dataset/summary`
Returns total records (12,330), column names, missing values, duplicates, class distribution, and baseline conversion rate.

### `GET /api/dataset/quality`
Returns array of column-level data quality records: missing count, percentage, unique values, dtype, and sample values.

### `GET /api/eda/overview`
Returns class balance counts, conversion rates grouped by `Month`, `VisitorType`, `Weekend`, and `TrafficType`, plus 5-number descriptive statistics for numerical features.

### `GET /api/eda/distribution?feature=<name>&bins=<int>`
Calculates histogram bin boundaries, total counts, buyer counts, non-buyer counts, and conversion rate per bin.
- **Query Params**:
  - `feature` (string, default: `PageValues`): Any numerical feature column.
  - `bins` (integer, default: `20`): Number of histogram bins.

### `GET /api/eda/correlation`
Returns Pearson correlation matrix across all numerical features.

---

## 3. Machine Learning Models & Evaluation

### `GET /api/models`
Returns leaderboard of all 8 candidate models evaluated on stratified test split with Accuracy, Precision, Recall, F1, ROC-AUC, PR-AUC, 5-Fold CV metrics, and train-vs-test gap.

### `GET /api/models/curves`
Returns downsampled ROC curves (`fpr`, `tpr`), Precision-Recall curves (`precision`, `recall`), and confusion matrix metrics per model.

### `GET /api/models/threshold?model=<name>&t=<float>`
Vectorized decision threshold evaluator across test set ($N=2,441$).
- **Query Params**:
  - `model` (string, default: `CatBoost`)
  - `t` (float, range: `0.0` - `1.0`): Decision probability threshold.
- **Returns**: Precision, Recall, F1, Accuracy, and 2x2 confusion matrix counts at that threshold.

---

## 4. Visitor Segmentation & Unsupervised Clustering

### `GET /api/segmentation`
Returns discovered clusters ($k=2$) and summary profiles: session count, volume share (%), conversion rate (%), average duration, page values, bounce rate, and persona name.

### `GET /api/segmentation/points`
Returns 2D PCA latent feature coordinates ($N \le 2,500$) with cluster label, conversion flag, page values, and PCA explained variance ratio.

### `GET /api/segmentation/algorithms`
Returns benchmark comparison across K-Means (k=2–6), GMM (k=2–6), and DBSCAN with Silhouette, Davies-Bouldin, and Calinski-Harabasz scores.

---

## 5. Explainability & Business Strategy

### `GET /api/explain/global`
Returns mean absolute SHAP feature importance ranking, beeswarm sample points ($N=300$), and non-linear partial dependence coordinates.

### `GET /api/insights`
Returns structured conversion insights, actionable recommendations grouped by pillar (CRO, Retention, Friction, ML), and executive model uplift summary.

---

## 6. Live & Batch Inference

### `POST /api/predict`
Calculates real-time purchase intent for a single browsing session.
- **Payload**:
```json
{
  "Administrative": 4,
  "Administrative_Duration": 120.0,
  "Informational": 2,
  "Informational_Duration": 60.0,
  "ProductRelated": 35,
  "ProductRelated_Duration": 1850.0,
  "BounceRates": 0.005,
  "ExitRates": 0.015,
  "PageValues": 38.5,
  "SpecialDay": 0.0,
  "Month": "Nov",
  "OperatingSystems": 2,
  "Browser": 2,
  "Region": 1,
  "TrafficType": 2,
  "VisitorType": "Returning_Visitor",
  "Weekend": true
}
```
- **Response**:
```json
{
  "status": "success",
  "prediction_class": 1,
  "prediction_label": "Purchase Intention",
  "purchase_probability": 0.8842,
  "probability_percentage": 88.42,
  "risk_tier": "High Intent",
  "recommended_action": "Trigger 1-click Express Checkout or free express shipping badge to close sale immediately.",
  "positive_drivers": [
    { "Feature": "PageValues", "Value": 38.5, "SHAP_Impact": 1.25 }
  ],
  "negative_drivers": []
}
```

### `POST /api/predict/batch`
Accepts JSON array of session objects or multipart CSV upload. Evaluates all rows, computes summary metrics, probability histogram, and per-row predictions.
