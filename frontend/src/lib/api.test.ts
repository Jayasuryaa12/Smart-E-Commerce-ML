import { describe, it, expect } from 'vitest';
import { HealthSchema, MetaSchema, DatasetSummarySchema } from './api';

describe('API Zod Schemas', () => {
  it('validates health payload correctly', () => {
    const validHealth = {
      status: 'healthy',
      timestamp: '2026-10-12T06:20:00Z',
      dataset_loaded: true,
      model_loaded: true,
      active_model_name: 'CatBoost',
    };
    const result = HealthSchema.safeParse(validHealth);
    expect(result.success).toBe(true);
  });

  it('rejects invalid health payload', () => {
    const invalidHealth = {
      status: 'healthy',
      dataset_loaded: 'not-a-boolean',
    };
    const result = HealthSchema.safeParse(invalidHealth);
    expect(result.success).toBe(false);
  });

  it('validates meta schema structure', () => {
    const validMeta = {
      status: 'success',
      data: {
        model_version: '1.0.0-PhaseII',
        training_timestamp: '2026-10-01T16:51:54Z',
        best_model_name: 'CatBoost',
        dataset_total_sessions: 12330,
        train_sessions: 9764,
        test_sessions: 2441,
        numerical_features: ['PageValues'],
        categorical_features: ['Month'],
        evaluation_metrics: { 'ROC-AUC': 0.9352 },
      },
    };
    const result = MetaSchema.safeParse(validMeta);
    expect(result.success).toBe(true);
  });

  it('validates health payload with models_readiness', () => {
    const validHealthWithReadiness = {
      status: 'healthy',
      timestamp: '2026-10-13T05:00:00Z',
      dataset_loaded: true,
      model_loaded: true,
      active_model_name: 'CatBoost',
      models_readiness: {
        purchase_model: true,
        preprocessor: true,
        model_comparison_results: true,
        segmentation_model: true,
      },
    };
    const result = HealthSchema.safeParse(validHealthWithReadiness);
    expect(result.success).toBe(true);
  });
});

describe('API URL Construction', () => {
  it('buildApiUrl leaves absolute URLs unchanged', async () => {
    const { buildApiUrl } = await import('./api');
    expect(buildApiUrl('https://example.com/api/test')).toBe('https://example.com/api/test');
    expect(buildApiUrl('http://localhost:5000/api/health')).toBe('http://localhost:5000/api/health');
  });

  it('buildApiUrl normalizes leading slashes correctly', async () => {
    const { buildApiUrl } = await import('./api');
    const urlWithSlash = buildApiUrl('/api/health');
    const urlWithoutSlash = buildApiUrl('api/health');
    expect(urlWithSlash).toBe(urlWithoutSlash);
    expect(urlWithSlash).toContain('/api/health');
    expect(urlWithSlash).not.toContain('/api/api');
  });

  it('exposes prediction history, stats, and health functions on api object', async () => {
    const { api } = await import('./api');
    expect(typeof api.getPredictionHistory).toBe('function');
    expect(typeof api.getPredictionStats).toBe('function');
    expect(typeof api.getPredictionStorageHealth).toBe('function');
  });
});


