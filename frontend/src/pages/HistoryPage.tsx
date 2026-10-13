import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, PredictionRecord } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { formatNumber, formatPercent } from '@/lib/formatters';
import {
  Database,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShieldCheck,
  Key,
  Lock,
  Unlock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [tierFilter, setTierFilter] = useState('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [adminKey, setAdminKey] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<PredictionRecord | null>(null);

  // Fetch prediction stats
  const {
    data: statsData,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['prediction-stats'],
    queryFn: api.getPredictionStats,
  });

  // Fetch storage health
  const { data: healthData, refetch: refetchHealth } = useQuery({
    queryKey: ['prediction-storage-health'],
    queryFn: api.getPredictionStorageHealth,
  });

  // Fetch paginated history records
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
    isFetching,
  } = useQuery({
    queryKey: ['prediction-history', page, tierFilter, classFilter, adminKey],
    queryFn: () =>
      api.getPredictionHistory({
        page,
        limit: 15,
        tier: tierFilter === 'all' ? undefined : tierFilter,
        classVal: classFilter === 'all' ? undefined : Number(classFilter),
        apiKey: adminKey || undefined,
      }),
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchHealth();
    refetchHistory();
  };

  const stats = statsData?.data;
  const health = healthData?.data;
  const records = historyData?.data || [];
  const pagination = historyData?.pagination || { total: 0, page: 1, limit: 15, total_pages: 1 };
  const isAdmin = historyData?.is_admin || false;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Prediction History & Audit Log
            <Badge variant="outline" className="text-[10px] font-bold border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400">
              PostgreSQL Persistence
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time audit log of inference requests, predicted shopper intentions, and SHAP feature attributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {health?.connected ? (
            <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              DB: {health.engine.toUpperCase()} ({health.total_records} records)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              DB: {health?.engine || 'Standby'}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isFetching}
            className="h-8 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Database Setup Banner if unconfigured */}
      {health && !health.connected && health.status === 'unconfigured' && (
        <Card className="p-4 bg-gradient-to-r from-amber-50/80 to-amber-100/40 dark:from-amber-950/30 dark:to-slate-900 border-amber-200 dark:border-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h2 className="font-bold text-amber-900 dark:text-amber-200">
                PostgreSQL Database In Standby Mode
              </h2>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                Render PostgreSQL is ready for connection. Once you create a PostgreSQL instance on Render and add the <code>DATABASE_URL</code> environment variable to your web service, all predictions will be automatically stored in the <code>prediction_history</code> table.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Saved Predictions</span>
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          {isStatsLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {formatNumber(stats?.total_predictions || 0)}
            </div>
          )}
          <div className="text-[11px] text-slate-400 mt-1">Live scored sessions</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Predicted Buyers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          {isStatsLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatNumber(stats?.purchase_intent_count || 0)}
            </div>
          )}
          <div className="text-[11px] text-slate-400 mt-1">
            Conversion Rate: {formatPercent(stats?.conversion_rate_pct || 0)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Predicted Non-Buyers</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          {isStatsLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <div className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
              {formatNumber(stats?.non_purchase_intent_count || 0)}
            </div>
          )}
          <div className="text-[11px] text-slate-400 mt-1">Exit / bounce risks</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg Purchase Probability</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          {isStatsLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <div className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
              {stats?.avg_purchase_probability ? `${stats.avg_purchase_probability}%` : '0.00%'}
            </div>
          )}
          <div className="text-[11px] text-slate-400 mt-1">Mean model confidence</div>
        </Card>
      </div>

      {/* Filter and Security Controls */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Risk Tier Filter */}
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Intent Tiers</option>
              <option value="High Intent">High Intent (≥ 70%)</option>
              <option value="Moderate Intent">Moderate Intent (35-69%)</option>
              <option value="Low Intent / Bounce Risk">Low Intent (&lt; 35%)</option>
            </select>

            {/* Prediction Class Filter */}
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Predictions</option>
              <option value="1">Purchase Intention (Class 1)</option>
              <option value="0">No Purchase (Class 0)</option>
            </select>
          </div>

          {/* Admin Unlock Mode */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Key className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="password"
                placeholder="Admin API Key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs w-44 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {isAdmin ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Full Features Unlocked
              </Badge>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Privacy Mask Active
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Main Records Table Card */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Stored Prediction Records ({pagination.total} total)
          </div>
          <div className="text-[11px] text-slate-400">
            Page {pagination.page} of {pagination.total_pages}
          </div>
        </div>

        {isHistoryLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isHistoryError ? (
          <div className="p-6">
            <ErrorState
              title="Failed to Load Prediction History"
              message={(historyError as Error)?.message || 'Unable to communicate with the history endpoint.'}
              onRetry={handleRefreshAll}
            />
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Database className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Prediction Records Found
            </div>
            <p className="text-xs max-w-sm mx-auto text-slate-500 leading-relaxed">
              Run a live prediction on the Purchase Intent Prediction page or submit a batch CSV to populate records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200/60 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Prediction ID</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Probability</th>
                  <th className="py-3 px-4">Risk Tier</th>
                  <th className="py-3 px-4">Recommended Strategy</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {r.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          r.prediction_class === 1
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                        }`}
                      >
                        {r.prediction_label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {r.probability_percentage != null ? `${r.probability_percentage}%` : 'N/A'}
                        </span>
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              r.prediction_class === 1 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, r.probability_percentage ?? 0))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          r.risk_tier.includes('High')
                            ? 'bg-emerald-100/60 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : r.risk_tier.includes('Moderate')
                            ? 'bg-amber-100/60 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {r.risk_tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate text-[11px]">
                      {r.recommended_action || 'Standard nurture protocol'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecord(r)}
                        className="h-7 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Showing {records.length} of {pagination.total} records
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </Button>
            <span className="text-xs font-semibold px-2">
              {pagination.page} / {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2.5 text-xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 space-y-4 border-2 border-slate-300 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Prediction Audit Record
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  ID: {selectedRecord.id}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRecord(null)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Outcome Label</span>
                <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedRecord.prediction_label}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Confidence</span>
                <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedRecord.probability_percentage}%
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-300">Strategy Directive</span>
              <p className="text-blue-800 dark:text-blue-200 mt-0.5 text-[11px] leading-relaxed">
                {selectedRecord.recommended_action || 'N/A'}
              </p>
            </div>

            {/* Top Drivers */}
            {selectedRecord.positive_drivers && selectedRecord.positive_drivers.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Positive SHAP Drivers (+ Intent)
                </span>
                <div className="space-y-1 text-xs">
                  {selectedRecord.positive_drivers.map((d, i) => (
                    <div key={i} className="flex justify-between p-1.5 rounded bg-emerald-50/50 dark:bg-emerald-950/20 text-[11px]">
                      <span>{d.Feature}</span>
                      <span className="font-mono font-bold text-emerald-600">+{d.SHAP_Impact.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Features (Admin Only) */}
            {selectedRecord.session_features ? (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Raw Input Features (Admin Unlocked)
                </span>
                <pre className="p-2.5 rounded-lg bg-slate-950 text-slate-200 text-[10px] font-mono max-h-36 overflow-y-auto">
                  {JSON.stringify(selectedRecord.session_features, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 text-center">
                🔒 Raw customer session features are masked for privacy. Enter Admin Key in the filter bar to view full telemetry.
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setSelectedRecord(null)}>
                Close Record
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
