import { z } from 'zod';

export function getApiBaseUrl(): string {
  let envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  // In local development server without explicit VITE_API_URL, use relative path so Vite proxy routes to localhost:5000
  if (import.meta.env.MODE === 'development' && !envUrl) {
    return '';
  }

  // Safeguard: Automatically rewrite any stale or deprecated backend URL to the active smart-e-commerce-ml-1 instance
  if (!envUrl || envUrl === 'https://smart-e-commerce-ml.onrender.com' || envUrl.includes('smart-e-commerce-ml.onrender.com')) {
    envUrl = 'https://smart-e-commerce-ml-1.onrender.com';
  }

  let clean = envUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api')) {
    clean = clean.slice(0, -4);
  }
  return clean;
}

export function buildApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (path.includes('smart-e-commerce-ml.onrender.com')) {
      return path.replace('smart-e-commerce-ml.onrender.com', 'smart-e-commerce-ml-1.onrender.com');
    }
    return path;
  }
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function fetchJson<T>(url: string, options?: RequestInit, schema?: z.ZodSchema<T>): Promise<T> {
  const fullUrl = buildApiUrl(url);

  // 45-second timeout with friendly cold-start messaging for Render sleep
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      signal: options?.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(
        'Request timed out (45s). The backend on Render may be waking up from sleep. Please retry in a few moments.'
      );
    }
    throw new Error(err.message || 'Network error communicating with the backend API.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson?.message) errorMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const json = await res.json();
  if (schema) {
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      console.warn(`Zod schema validation warning for ${url}:`, parsed.error);
    }
  }
  return json as T;
}

// ----------------- SCHEMAS & TYPES -----------------

export const HealthSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  dataset_loaded: z.boolean(),
  model_loaded: z.boolean(),
  active_model_name: z.string(),
  allowed_cors_origin: z.string().optional(),
  models_readiness: z.record(z.string(), z.boolean()).optional(),
});
export type HealthData = z.infer<typeof HealthSchema>;

export const MetaSchema = z.object({
  status: z.string(),
  data: z.object({
    model_version: z.string(),
    training_timestamp: z.string(),
    best_model_name: z.string(),
    dataset_total_sessions: z.number(),
    train_sessions: z.number(),
    test_sessions: z.number(),
    numerical_features: z.array(z.string()),
    categorical_features: z.array(z.string()),
    evaluation_metrics: z.record(z.string(), z.any()),
  }),
});
export type MetaResponse = z.infer<typeof MetaSchema>;

export const DatasetSummarySchema = z.object({
  status: z.string(),
  data: z.object({
    total_records: z.number(),
    total_columns: z.number(),
    missing_values: z.number(),
    duplicate_rows: z.number(),
    purchase_positive: z.number(),
    purchase_negative: z.number(),
    conversion_rate_pct: z.number(),
    numeric_columns: z.array(z.string()),
    categorical_columns: z.array(z.string()),
  }),
});
export type DatasetSummaryResponse = z.infer<typeof DatasetSummarySchema>;

export interface QualityColumn {
  column: string;
  missing_count: number;
  missing_percentage: number;
  unique_values: number;
  dtype: string;
  sample_values: any[];
}

export interface EdaOverviewData {
  total_sessions: number;
  buyers: number;
  non_buyers: number;
  conversion_rate: number;
  month_breakdown: Array<{ Month: string; count: number; rate: number }>;
  visitor_breakdown: Array<{ VisitorType: string; count: number; rate: number }>;
  weekend_breakdown: Array<{ Weekend: boolean; count: number; rate: number }>;
  traffic_breakdown: Array<{ TrafficType: number; count: number; rate: number }>;
  numerical_summary: Array<{
    feature: string;
    mean: number;
    std: number;
    min: number;
    median: number;
    max: number;
    skew: number;
    outliers_count: number;
  }>;
}

export interface DistributionBin {
  bin_start: number;
  bin_end: number;
  bin_label: string;
  total_count: number;
  buyers_count: number;
  non_buyers_count: number;
  buyer_conversion_rate: number;
}

export interface EdaDistributionResponse {
  status: string;
  feature: string;
  bins_count: number;
  summary: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
  };
  data: DistributionBin[];
}

export interface CorrelationData {
  columns: string[];
  matrix: number[][];
}

export interface ModelMetric {
  Model: string;
  Accuracy: number;
  Precision: number;
  Recall: number;
  'F1-Score': number;
  'ROC-AUC': number;
  'PR-AUC': number;
  'CV F1 (Mean)': number;
  'CV F1 (Std)': number;
  'CV ROC-AUC': number;
  'CV PR-AUC': number;
  'Train F1': number;
  'Train ROC-AUC': number;
}

export interface CurvePoint {
  fpr?: number;
  tpr?: number;
  recall?: number;
  precision?: number;
}

export interface ModelCurves {
  roc_curve: Array<{ fpr: number; tpr: number }>;
  pr_curve: Array<{ recall: number; precision: number }>;
  confusion_matrix: {
    matrix: number[][];
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
}

export interface ThresholdResponse {
  status: string;
  model: string;
  threshold: number;
  metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    accuracy: number;
  };
  confusion_matrix: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
    total: number;
    matrix: number[][];
  };
}

export interface ClusterProfile {
  Session_Segment: number;
  'Session Count': number;
  'Segment Share (%)': number;
  'Conversion Rate (%)': number;
  'Avg Page Values': number;
  'Avg Product Views': number;
  'Avg Total Duration (s)': number;
  'Avg Bounce Rate (%)': number;
  'Avg Exit Rate (%)': number;
  'Segment Persona': string;
}

export interface PcaPoint {
  pc1: number;
  pc2: number;
  cluster: number;
  cluster_label: string;
  revenue: boolean;
  page_values: number;
  product_duration: number;
  total_page_views: number;
}

export interface SegmentationAlgorithmsRow {
  algorithm: string;
  clusters: number | null;
  silhouette: number | null;
  davies_bouldin: number | null;
  calinski_harabasz: number | null;
}

export interface GlobalImportanceItem {
  Feature: string;
  'Mean_|SHAP|_Importance': number;
}

export interface BeeswarmItem {
  feature: string;
  feature_value: number;
  shap_impact: number;
  sample_idx: number;
}

export interface ExplainGlobalData {
  importance: GlobalImportanceItem[];
  beeswarm: BeeswarmItem[];
  dependence: Record<string, Array<{ value: number; shap: number }>>;
  sample_count: number;
}

export interface ConversionInsightItem {
  category: string;
  metric: string;
  finding: string;
  action: string;
}

export interface ActionableRecommendationItem {
  Pillar: string;
  Recommendation: string;
  Evidence: string;
  Impact: string;
  Strategy: string;
}

export interface InsightsData {
  conversion_insights: ConversionInsightItem[];
  actionable_recommendations: ActionableRecommendationItem[];
  model_summary: {
    top_model: string;
    top_f1: number;
    top_roc_auc: number;
    top_pr_auc: number;
    top_precision: number;
    top_recall: number;
    baseline_f1: number;
    f1_uplift: number;
  };
}

export interface DriverImpact {
  Feature: string;
  Value: number;
  SHAP_Impact: number;
}

export interface PredictRequest {
  Administrative: number;
  Administrative_Duration: number;
  Informational: number;
  Informational_Duration: number;
  ProductRelated: number;
  ProductRelated_Duration: number;
  BounceRates: number;
  ExitRates: number;
  PageValues: number;
  SpecialDay: number;
  Month: string;
  OperatingSystems: number;
  Browser: number;
  Region: number;
  TrafficType: number;
  VisitorType: string;
  Weekend: boolean;
}

export interface PredictResponse {
  status: string;
  prediction_class: number;
  prediction_label: string;
  purchase_probability: number;
  probability_percentage: number;
  risk_tier: string;
  recommended_action: string;
  positive_drivers: DriverImpact[];
  negative_drivers: DriverImpact[];
}

export interface BatchPredictResponse {
  status: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  summary: {
    predicted_purchases: number;
    predicted_non_purchases: number;
    conversion_rate: number;
    avg_probability: number;
    high_tier_count: number;
    moderate_tier_count: number;
    low_tier_count: number;
  };
  distribution: Array<{ range: string; count: number }>;
  results: Array<{
    row_index: number;
    valid: boolean;
    purchase_probability: number;
    probability_percentage: number;
    prediction_class: number;
    prediction_label: string;
    risk_tier: string;
  }>;
}

export interface PredictionRecord {
  id: string;
  created_at: string;
  prediction_class: number;
  prediction_label: string;
  purchase_probability: number;
  probability_percentage: number;
  risk_tier: string;
  recommended_action?: string;
  positive_drivers?: DriverImpact[];
  negative_drivers?: DriverImpact[];
  session_features?: Record<string, any>;
}

export interface PredictionHistoryResponse {
  status: string;
  data: PredictionRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  is_admin: boolean;
  database_configured: boolean;
}

export interface PredictionStatsResponse {
  status: string;
  data: {
    total_predictions: number;
    purchase_intent_count: number;
    non_purchase_intent_count: number;
    conversion_rate_pct: number;
    avg_purchase_probability: number;
    tier_distribution: Record<string, number>;
    database_configured: boolean;
  };
}

export interface PredictionStorageHealthResponse {
  status: string;
  data: {
    status: string;
    connected: boolean;
    engine: string;
    total_records: number;
    message: string;
  };
}

// ----------------- API CLIENT CALLS -----------------

export const api = {
  getHealth: () => fetchJson<HealthData>('/api/health'),
  getMeta: () => fetchJson<MetaResponse>('/api/meta'),
  getDatasetSummary: () => fetchJson<DatasetSummaryResponse>('/api/dataset/summary'),
  getDatasetQuality: () => fetchJson<{ status: string; data: QualityColumn[] }>('/api/dataset/quality'),
  getEdaOverview: () => fetchJson<{ status: string; data: EdaOverviewData }>('/api/eda/overview'),
  getEdaDistribution: (feature: string, bins = 20) =>
    fetchJson<EdaDistributionResponse>(`/api/eda/distribution?feature=${encodeURIComponent(feature)}&bins=${bins}`),
  getEdaCorrelation: () => fetchJson<{ status: string; data: CorrelationData }>('/api/eda/correlation'),
  getModels: () => fetchJson<{ status: string; best_model: string; metrics: ModelMetric[] }>('/api/models'),
  getCurves: () => fetchJson<{ status: string; data: Record<string, ModelCurves> }>('/api/models/curves'),
  getThreshold: (model: string, t: number) =>
    fetchJson<ThresholdResponse>(`/api/models/threshold?model=${encodeURIComponent(model)}&t=${t}`),
  getSegmentation: () => fetchJson<{ status: string; k: number; profiles: ClusterProfile[] }>('/api/segmentation'),
  getSegmentationPoints: () =>
    fetchJson<{
      status: string;
      data: { variance_ratio: number[]; total_points: number; sample_points: PcaPoint[] };
    }>('/api/segmentation/points'),
  getSegmentationAlgorithms: () => fetchJson<{ status: string; data: SegmentationAlgorithmsRow[] }>('/api/segmentation/algorithms'),
  getExplainGlobal: () => fetchJson<{ status: string; data: ExplainGlobalData }>('/api/explain/global'),
  getInsights: () => fetchJson<{ status: string; data: InsightsData }>('/api/insights'),
  predict: (data: PredictRequest) =>
    fetchJson<PredictResponse>('/api/predict', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  predictBatch: (rows: PredictRequest[]) =>
    fetchJson<BatchPredictResponse>('/api/predict/batch', {
      method: 'POST',
      body: JSON.stringify(rows),
    }),
  getPredictionHistory: (params?: { page?: number; limit?: number; tier?: string; classVal?: number; apiKey?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.tier && params.tier !== 'all') q.set('tier', params.tier);
    if (params?.classVal !== undefined && params.classVal !== null) q.set('class', String(params.classVal));
    if (params?.apiKey) q.set('api_key', params.apiKey);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const headers: Record<string, string> = {};
    if (params?.apiKey) headers['X-Admin-Key'] = params.apiKey;
    return fetchJson<PredictionHistoryResponse>(`/api/predictions/history${qs}`, { headers });
  },
  getPredictionStats: () => fetchJson<PredictionStatsResponse>('/api/predictions/stats'),
  getPredictionStorageHealth: () => fetchJson<PredictionStorageHealthResponse>('/api/predictions/health'),
};
