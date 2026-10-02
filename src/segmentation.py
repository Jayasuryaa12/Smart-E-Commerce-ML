import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, DBSCAN
from sklearn.mixture import GaussianMixture
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from sklearn.preprocessing import StandardScaler
import joblib

def evaluate_kmeans_range(X_scaled, k_range=range(2, 7)):
    """Evaluate K-Means across range of cluster numbers k."""
    results = []
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels, sample_size=3000, random_state=42)
        db = davies_bouldin_score(X_scaled, labels)
        ch = calinski_harabasz_score(X_scaled, labels)
        results.append({
            'Algorithm': 'K-Means',
            'Clusters': k,
            'Silhouette Score': round(sil, 4),
            'Davies-Bouldin Index': round(db, 4),
            'Calinski-Harabasz Score': round(ch, 2),
            'Model': km,
            'Labels': labels
        })
    return pd.DataFrame(results)

def evaluate_gmm_range(X_scaled, k_range=range(2, 7)):
    """Evaluate Gaussian Mixture Model across range of components."""
    results = []
    for k in k_range:
        gmm = GaussianMixture(n_components=k, random_state=42)
        labels = gmm.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels, sample_size=3000, random_state=42)
        db = davies_bouldin_score(X_scaled, labels)
        ch = calinski_harabasz_score(X_scaled, labels)
        results.append({
            'Algorithm': 'Gaussian Mixture Model',
            'Clusters': k,
            'Silhouette Score': round(sil, 4),
            'Davies-Bouldin Index': round(db, 4),
            'Calinski-Harabasz Score': round(ch, 2),
            'Model': gmm,
            'Labels': labels
        })
    return pd.DataFrame(results)

def evaluate_dbscan(X_scaled, eps_values=[0.5, 1.0, 1.5, 2.0], min_samples_values=[5, 10, 15]):
    """Evaluate DBSCAN across hyperparameter grid."""
    results = []
    for eps in eps_values:
        for ms in min_samples_values:
            dbscan = DBSCAN(eps=eps, min_samples=ms)
            labels = dbscan.fit_predict(X_scaled)
            n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
            if n_clusters > 1 and len(set(labels)) < len(X_scaled):
                sil = silhouette_score(X_scaled, labels, sample_size=3000, random_state=42)
                db = davies_bouldin_score(X_scaled, labels)
                ch = calinski_harabasz_score(X_scaled, labels)
            else:
                sil, db, ch = np.nan, np.nan, np.nan
            results.append({
                'Algorithm': f'DBSCAN (eps={eps}, min_samples={ms})',
                'Clusters': n_clusters,
                'Silhouette Score': round(sil, 4) if not np.isnan(sil) else np.nan,
                'Davies-Bouldin Index': round(db, 4) if not np.isnan(db) else np.nan,
                'Calinski-Harabasz Score': round(ch, 2) if not np.isnan(ch) else np.nan,
                'Model': dbscan,
                'Labels': labels
            })
    return pd.DataFrame(results)

def profile_clusters(df_original, cluster_labels):
    """
    Generate feature profiles and conversion rates for each discovered session cluster.
    """
    df_profile = df_original.copy()
    df_profile['Session_Segment'] = cluster_labels
    
    # Filter out noise if DBSCAN (-1)
    df_valid = df_profile[df_profile['Session_Segment'] != -1]
    
    summary_cols = [
        'PageValues', 'ProductRelated', 'ProductRelated_Duration',
        'BounceRates', 'ExitRates', 'Total_Page_Views', 'Total_Duration',
        'High_Intent_Indicator', 'Revenue'
    ]
    
    available_cols = [c for c in summary_cols if c in df_valid.columns]
    
    profiles = df_valid.groupby('Session_Segment')[available_cols].agg(['mean', 'median', 'count']).round(3)
    
    # Conversion rate per segment
    conv_rate = df_valid.groupby('Session_Segment')['Revenue'].mean() * 100
    session_counts = df_valid.groupby('Session_Segment').size()
    
    profile_summary = pd.DataFrame({
        'Session Count': session_counts,
        'Segment Share (%)': (session_counts / len(df_valid) * 100).round(2),
        'Conversion Rate (%)': conv_rate.round(2),
        'Avg Page Values': df_valid.groupby('Session_Segment')['PageValues'].mean().round(2),
        'Avg Product Views': df_valid.groupby('Session_Segment')['ProductRelated'].mean().round(1),
        'Avg Total Duration (s)': df_valid.groupby('Session_Segment')['Total_Duration'].mean().round(1),
        'Avg Bounce Rate (%)': (df_valid.groupby('Session_Segment')['BounceRates'].mean() * 100).round(2),
        'Avg Exit Rate (%)': (df_valid.groupby('Session_Segment')['ExitRates'].mean() * 100).round(2)
    })
    
    # Automatically assign session segment descriptive labels based on actual features
    labels_map = {}
    for seg in profile_summary.index:
        row = profile_summary.loc[seg]
        if row['Conversion Rate (%)'] > 40 or row['Avg Page Values'] > 20:
            name = "High-Intent Buyer Sessions"
        elif row['Avg Bounce Rate (%)'] > 10 or row['Avg Exit Rate (%)'] > 15:
            name = "Low-Engagement Bounce-Prone Sessions"
        elif row['Avg Product Views'] > 30 or row['Avg Total Duration (s)'] > 1000:
            name = "Deep Research & Product Browsing Sessions"
        else:
            name = "Casual Visitor Browsing Sessions"
        labels_map[seg] = name
        
    profile_summary['Segment Persona'] = [labels_map[i] for i in profile_summary.index]
    
    return profile_summary, df_profile
