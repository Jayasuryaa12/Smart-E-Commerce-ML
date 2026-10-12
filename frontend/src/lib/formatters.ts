/**
 * High-precision formatting utilities for numerical metrics and metrics display.
 */

export function formatNumber(value: number | null | undefined, options?: { compact?: boolean; decimals?: number }): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  
  const { compact = false, decimals = 0 } = options || {};
  
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatMetric(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return value.toFixed(decimals);
}

export function formatSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function getRiskTierBadge(tier: string) {
  switch (tier?.toLowerCase()) {
    case 'high intent':
    case 'high':
      return { label: 'High Intent', variant: 'success' as const, color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' };
    case 'moderate intent':
    case 'moderate':
    case 'medium':
      return { label: 'Moderate Intent', variant: 'warning' as const, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800' };
    default:
      return { label: 'Bounce Risk', variant: 'danger' as const, color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-800' };
  }
}
