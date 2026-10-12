import { describe, it, expect } from 'vitest';
import { formatNumber, formatPercent, formatMetric, formatSeconds, getRiskTierBadge } from './formatters';

describe('formatters', () => {
  it('formats numbers with commas and compact notation', () => {
    expect(formatNumber(12330)).toBe('12,330');
    expect(formatNumber(12330, { compact: true })).toBe('12.3K');
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });

  it('formats percentages correctly', () => {
    expect(formatPercent(15.474, 1)).toBe('15.5%');
    expect(formatPercent(0.0)).toBe('0.0%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formats metrics to 4 decimal places', () => {
    expect(formatMetric(0.93521)).toBe('0.9352');
    expect(formatMetric(null)).toBe('—');
  });

  it('formats seconds into human readable duration', () => {
    expect(formatSeconds(45.2)).toBe('45.2s');
    expect(formatSeconds(125)).toBe('2m 5s');
    expect(formatSeconds(null)).toBe('—');
  });

  it('returns appropriate risk tier badge', () => {
    const high = getRiskTierBadge('High Intent');
    expect(high.variant).toBe('success');
    expect(high.label).toBe('High Intent');

    const med = getRiskTierBadge('Moderate');
    expect(med.variant).toBe('warning');

    const low = getRiskTierBadge('Bounce Risk');
    expect(low.variant).toBe('danger');
  });
});
