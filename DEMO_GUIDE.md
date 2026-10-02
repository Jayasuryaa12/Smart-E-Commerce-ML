# 🎭 Live Academic Demonstration & Presentation Guide

**Project Title:** Smart E-Commerce Customer Intelligence & Purchase Prediction System  
**Target Audience:** Academic Evaluators, Machine Learning Faculty, Data Analytics Assessors  
**Platform:** Streamlit Production SaaS Application (`app.py`)

---

## ⚡ Quick Launch Command

To start the application during a live demo, open a terminal in the project directory and run:

```bash
streamlit run app.py
```

The application will launch automatically in your browser at `http://localhost:8501`.

---

## 🗺️ Recommended 11-Step Demonstration Order

Follow this sequence to present the project features in a logical flow:

### 1. Project Introduction & Overview (`🏠 Executive Dashboard`)
- **Action:** Open the dashboard page. Point out the top header bar showing active model status (`CatBoost Active • 12,330 Sessions Analyzed`).
- **Key Talking Points:**
  - Session-level dataset (12,330 records, 18 features).
  - Observed conversion rate is **15.47%** (1,908 purchase-positive sessions out of 12,330).
  - Target variable: `Revenue` (Binary purchase outcome).
  - Metric cards highlight total volume, conversion rate, best model F1-Score (**0.6715**), and ROC-AUC (**0.9352**).

### 2. Exploratory Analytics (`📊 Data Explorer & EDA`)
- **Action:** Select `📊 Data Explorer & EDA`.
- **Key Talking Points:**
  - Demonstrate interactive filter controls (Filter by Visitor Type, Month, Weekend, and Min Page Value).
  - Show the numerical feature distribution histogram with boxplot overlays.
  - View the correlation heatmap highlighting strong relationships between `BounceRates` and `ExitRates`.
  - Point out dataset CSV download functionality.

### 3. Data Preprocessing Architecture (`🛠️ Data Preprocessing & Pipeline`)
- **Action:** Select `🛠️ Data Preprocessing & Pipeline`.
- **Key Talking Points:**
  - Explain the leak-free preprocessing pipeline fitted strictly on `X_train` (80/20 Stratified Split).
  - Highlight data cleaning: 125 duplicate rows identified and removed (0.97% of raw dataset).
  - Explain `StandardScaler` for numeric columns and `OneHotEncoder(handle_unknown='ignore')` for categorical features.

### 4. Visitor Session Segmentation (`👥 Visitor/Session Segmentation`)
- **Action:** Select `👥 Visitor/Session Segmentation`.
- **Key Talking Points:**
  - Compare unsupervised clustering algorithms: **K-Means**, **Gaussian Mixture Models (GMM)**, and **DBSCAN**.
  - Show metric evaluation table (Silhouette Score = `0.4904`, Davies-Bouldin Index, Calinski-Harabasz Score).
  - Explain 2D PCA cluster visualization scatter plot.
  - Explain data-grounded segment profiles (e.g., Segment 0: High-Intent Buyer Sessions vs Segment 1: Casual Visitor Browsing Sessions).

### 5. AI Model Benchmark & Comparison (`🤖 Model Comparison & Evaluation`)
- **Action:** Select `🤖 Model Comparison & Evaluation`.
- **Key Talking Points:**
  - Present the 8-model comparison table (**CatBoost**, **Gradient Boosting**, **Random Forest**, **LightGBM**, **Stacking Ensemble**, **XGBoost**, **Logistic Regression Baseline**, **MLP Neural Network**).
  - Explain model selection criterion: Selected **CatBoost** based on **F1-Score (0.6715)** and **PR-AUC (0.7482)** under target class imbalance (15.5% positive class).
  - Show ROC & Precision-Recall overlay curves.
  - Inspect the Confusion Matrix heatmap for business risk analysis (True Positives vs False Positives).
  - Highlight the 1-click **Pipeline Retraining Trigger** button.

### 6. Real-Time Purchase Intent Prediction (`🎯 Purchase Intent Prediction`)
- **Action:** Select `🎯 Purchase Intent Prediction`.
- **Key Talking Points:**
  - Demonstrate 1-click preset buttons:
    - Click **"🔥 High-Intent Buyer Session"** → Click **"🚀 Compute Real-Time Purchase Intent"**. Observe High Purchase Intent status (>85% probability).
    - Click **"⚠️ Low-Engagement Bounce Session"** → Click **"🚀 Compute Real-Time Purchase Intent"**. Observe Low Purchase Intent status (<10% probability).
  - Show real-time SHAP feature attribution drivers explaining *why* the model assigned that probability.
  - Emphasize disclaimer: probability is a statistical ML estimate, not a guaranteed transaction.

### 7. Explainable AI (`🧠 Explainability & SHAP`)
- **Action:** Select `🧠 Explainability & SHAP`.
- **Key Talking Points:**
  - View global SHAP feature importance bar plot.
  - Identify top predictors: `PageValues` (#1 driver), `ProductRelated_Duration`, `ExitRates` (negative driver), and `Month (Nov)`.

### 8. Evidence-Based Business Insights (`💡 Business Insights & Strategy`)
- **Action:** Select `💡 Business Insights & Strategy`.
- **Key Talking Points:**
  - Present strategic Conversion Rate Optimization (CRO) recommendations backed by empirical findings.
  - Highlight exit-intent popups for sessions with `PageValues > 10` and November promotional budgeting.

### 9. Technology Stack & Architecture (`📘 Methodology & Tech Stack`)
- **Action:** Select `📘 Methodology & Tech Stack`.
- **Key Talking Points:**
  - Core stack: Python, Scikit-Learn, CatBoost, XGBoost, LightGBM, SHAP, Plotly, Streamlit.
  - Show modular file structure (`src/`, `models/`, `reports/`).

---

## 🛠️ Common Troubleshooting Steps

| Issue | Root Cause | Resolution Step |
|---|---|---|
| Streamlit fails to start | Missing dependencies | Run `pip install -r requirements.txt` |
| `models/*.pkl not found` error banner | Artifacts not compiled | Run `python train.py` to regenerate all model artifacts |
| Port 8501 already in use | Previous Streamlit instance running | Run `streamlit run app.py --server.port 8502` |
| Plotly chart text cut off | Browser window zoomed | Reset browser zoom to 100% (Ctrl+0 / Cmd+0) |

---

## 🌐 Offline Backup Demonstration Procedure

If internet access is unavailable during the live demonstration:
1. All model artifacts (`models/*.pkl`), reports (`reports/*.csv`), and dataset files (`data/*.csv`) are stored locally in the workspace.
2. The Streamlit web server runs completely offline at `http://localhost:8501`. No external web connectivity or API keys are required.
3. Pre-generated evaluation reports are accessible in `reports/model_comparison_summary.csv` and `reports/segmentation_summary.csv`.
