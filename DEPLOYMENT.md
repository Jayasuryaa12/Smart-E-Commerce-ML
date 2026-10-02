# 🚀 Production Deployment Guide

**Smart E-Commerce Customer Intelligence & Purchase Prediction System**

This document provides step-by-step instructions for deploying the project to **Vercel** (Frontend) and **Render** (Backend REST API).

---

## 🏗️ Deployment Overview

- **Frontend Application:** Streamlit SaaS Web Dashboard (`app.py`) deployed on **Vercel** / **Streamlit Community Cloud**.
- **Backend API Service:** Python Flask ML REST API (`server.py`) deployed on **Render** (Web Service).
- **Communication Flow:** Frontend communicates with Render backend REST endpoints via HTTP/JSON.

---

## 1. Prepare GitHub Repository

1. Initialize git and commit all required files:
   ```bash
   git add .
   git commit -m "Prepare production deployment for Render and Vercel"
   git push origin main
   ```
2. Verify that the following files are pushed:
   - `app.py`, `server.py`, `train.py`
   - `src/*.py`
   - `models/*.pkl`, `models/model_metadata.json`
   - `data/online_shoppers_intention.csv`
   - `requirements.txt`
   - `Procfile`, `render.yaml`, `vercel.json`
   - `.streamlit/config.toml`

---

## 2. Deploy Backend API to Render

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **"New +"** → Select **"Web Service"**.
3. Connect your GitHub repository.
4. Fill in the service configuration:
   - **Name:** `smart-ecommerce-ml-backend`
   - **Region:** Select closest region (e.g., Oregon or Frankfurt)
   - **Branch:** `main`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn server:app`
5. Under **Environment Variables**, add:
   - `CORS_ORIGINS` = `*` (or your deployed Vercel frontend URL once generated)
   - `PYTHON_VERSION` = `3.10.12`
6. Click **"Create Web Service"**.
7. Once deployment finishes, copy your public backend Render URL (e.g., `https://smart-ecommerce-ml-backend.onrender.com`).
8. Verify production backend health:
   ```bash
   curl https://smart-ecommerce-ml-backend.onrender.com/health
   ```

---

## 3. Deploy Frontend Application to Vercel (or Streamlit Cloud)

### Option A: Streamlit Community Cloud (Recommended for Streamlit Apps)
1. Log in to [share.streamlit.io](https://share.streamlit.io).
2. Click **"New App"** → Select your GitHub repo, branch `main`, and main file `app.py`.
3. Under **Advanced Settings**, add Environment Variables:
   - `BACKEND_URL` = `https://smart-ecommerce-ml-backend.onrender.com`
4. Click **"Deploy!"**.

### Option B: Deploying on Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **"Add New..."** → **"Project"** → Import your GitHub repository.
3. Under **Environment Variables**, add:
   - `BACKEND_URL` = `https://smart-ecommerce-ml-backend.onrender.com`
4. Framework Preset: Select `Other` (uses `vercel.json` python runtime).
5. Click **"Deploy"**.

---

## 4. Environment Variables Reference

| Service | Variable | Value Example | Purpose |
|---|---|---|---|
| **Render (Backend)** | `CORS_ORIGINS` | `https://your-frontend.vercel.app` or `*` | Allows cross-origin REST requests from frontend |
| **Render (Backend)** | `PYTHON_VERSION` | `3.10.12` | Ensures compatible Python runtime on Render |
| **Vercel / Streamlit (Frontend)** | `BACKEND_URL` | `https://smart-ecommerce-ml-backend.onrender.com` | Target URL for REST API calls |

---

## 5. Post-Deployment Testing

1. Open your backend health check:
   `https://<your-render-backend-url>/health`
2. Test prediction REST endpoint via cURL:
   ```bash
   curl -X POST https://<your-render-backend-url>/api/predict \
        -H "Content-Type: application/json" \
        -d '{"Administrative":2,"Administrative_Duration":35.0,"Informational":1,"Informational_Duration":10.0,"ProductRelated":25,"ProductRelated_Duration":450.0,"BounceRates":0.01,"ExitRates":0.03,"PageValues":15.5,"SpecialDay":0.0,"Month":"Nov","OperatingSystems":2,"Browser":2,"Region":1,"TrafficType":2,"VisitorType":"Returning_Visitor","Weekend":false}'
   ```
3. Open your frontend website URL in your browser and test:
   - Executive Dashboard KPI metrics
   - Dataset subset filtering
   - Session Intent Prediction form submit
   - Model comparison tables
