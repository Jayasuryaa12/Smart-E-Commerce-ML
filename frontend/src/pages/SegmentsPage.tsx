import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ClusterProfile, SegmentationAlgorithmsRow } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartCard } from '@/components/ui/chart-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { formatNumber, formatPercent, formatSeconds } from '@/lib/formatters';
import {
  Users,
  Compass,
  Layers,
  Sparkles,
  ShoppingBag,
  Clock,
  Eye,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';

const SEG_PALETTE = ['#2563EB', '#0D9488', '#D97706', '#7C3AED'];

export const SegmentsPage: React.FC = () => {
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<number | 'all'>('all');

  const { data: segSummary, isLoading: isSegLoading, isError: isSegError, refetch: retrySeg } = useQuery({
    queryKey: ['segmentation-summary'],
    queryFn: api.getSegmentation,
  });

  const { data: pcaData, isLoading: isPcaLoading } = useQuery({
    queryKey: ['segmentation-points'],
    queryFn: api.getSegmentationPoints,
  });

  const { data: algoData, isLoading: isAlgoLoading } = useQuery({
    queryKey: ['segmentation-algorithms'],
    queryFn: api.getSegmentationAlgorithms,
  });

  if (isSegError) {
    return <ErrorState onRetry={() => retrySeg()} message="Unable to load customer segmentation profiles." />;
  }

  const profiles: ClusterProfile[] = segSummary?.profiles || [];
  const pcaPoints = pcaData?.data?.sample_points || [];
  const varianceRatio = pcaData?.data?.variance_ratio || [0.3774, 0.1478];
  const algoRows: SegmentationAlgorithmsRow[] = algoData?.data || [];

  // Filter PCA points by selected cluster
  const filteredPoints = selectedClusterFilter === 'all'
    ? pcaPoints
    : pcaPoints.filter((p) => p.cluster === selectedClusterFilter);

  // Split into points per cluster for distinct scatter series
  const cluster0Points = filteredPoints.filter((p) => p.cluster === 0);
  const cluster1Points = filteredPoints.filter((p) => p.cluster === 1);

  const algoColumns: ColumnDef<SegmentationAlgorithmsRow>[] = [
    { key: 'algorithm', header: 'Clustering Algorithm' },
    {
      key: 'clusters',
      header: 'Clusters (k)',
      align: 'center',
      cell: (row) => row.clusters ?? 'Noise / Outliers',
    },
    {
      key: 'silhouette',
      header: 'Silhouette Score (↑)',
      align: 'right',
      cell: (row) => (
        <span
          className={`font-mono ${
            row.silhouette && row.silhouette > 0.4 ? 'font-bold text-emerald-600' : ''
          }`}
        >
          {row.silhouette !== null ? row.silhouette.toFixed(4) : '—'}
        </span>
      ),
    },
    {
      key: 'davies_bouldin',
      header: 'Davies-Bouldin (↓)',
      align: 'right',
      cell: (row) => (
        <span
          className={`font-mono ${
            row.davies_bouldin && row.davies_bouldin < 1.0 ? 'font-bold text-emerald-600' : ''
          }`}
        >
          {row.davies_bouldin !== null ? row.davies_bouldin.toFixed(4) : '—'}
        </span>
      ),
    },
    {
      key: 'calinski_harabasz',
      header: 'Calinski-Harabasz (↑)',
      align: 'right',
      cell: (row) => (
        <span
          className={`font-mono ${
            row.calinski_harabasz && row.calinski_harabasz > 3000 ? 'font-bold text-blue-600' : ''
          }`}
        >
          {row.calinski_harabasz !== null ? formatNumber(row.calinski_harabasz) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          Visitor & Session Segmentation
          <Badge variant="default" className="text-[10px] font-bold">
            Unsupervised ML
          </Badge>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Behavior-driven customer clustering comparing K-Means, Gaussian Mixture Models, and DBSCAN to partition 12,330 sessions into actionable marketing personas.
        </p>
      </div>

      {/* Segment Persona Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {profiles.map((p, idx) => {
          const isHighConv = p['Conversion Rate (%)'] > 20;
          return (
            <Card
              key={p.Session_Segment}
              className={`p-5 border-2 transition-all hover:shadow-md ${
                isHighConv
                  ? 'border-blue-500/80 bg-gradient-to-br from-blue-50/30 to-white dark:from-blue-950/20 dark:to-slate-900'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SEG_PALETTE[idx % SEG_PALETTE.length] }}
                    />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Segment {p.Session_Segment}: {p['Segment Persona']}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 mt-0.5 inline-block">
                    {formatNumber(p['Session Count'])} sessions ({p['Segment Share (%)']}% total volume)
                  </span>
                </div>

                <Badge variant={isHighConv ? 'success' : 'secondary'} className="text-xs font-bold tabular-nums">
                  {p['Conversion Rate (%)']}% Conv Rate
                </Badge>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Avg Views
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 mt-1 tabular-nums">
                    {p['Avg Product Views']}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Total Duration
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 mt-1 tabular-nums">
                    {formatSeconds(p['Avg Total Duration (s)'])}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Page Value
                  </span>
                  <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
                    {p['Avg Page Values'].toFixed(2)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Bounce Rate
                  </span>
                  <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 mt-1 tabular-nums">
                    {p['Avg Bounce Rate (%)']}%
                  </div>
                </div>
              </div>

              {/* Recommended Strategic Action */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                <span className="font-bold text-blue-600 dark:text-blue-400">Target Strategy: </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {idx === 1
                    ? 'Deploy live inventory countdowns, free express shipping threshold alerts, and VIP loyalty perks to convert high-duration researchers.'
                    : 'Streamline category navigation, reduce intrusive popups, and offer broad seasonal discovery tiles for casual top-of-funnel visitors.'}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 2D PCA Scatter Projection (Interactive Visualization) */}
      <ChartCard
        title="2D PCA Latent Feature Projection"
        subtitle={`Principal Component Analysis (PC1: ${(varianceRatio[0] * 100).toFixed(1)}% variance, PC2: ${(varianceRatio[1] * 100).toFixed(1)}% variance)`}
        infoTooltip="Dimensionality reduction projecting 24 browsing features into 2D cluster coordinates."
        howToRead="Each point is a sampled session. Colors represent K-Means assigned clusters."
        headerAction={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter:</span>
            <select
              value={selectedClusterFilter}
              onChange={(e) =>
                setSelectedClusterFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Clusters ({pcaPoints.length})</option>
              <option value="0">Segment 0 (Casual)</option>
              <option value="1">Segment 1 (Deep Research)</option>
            </select>
          </div>
        }
      >
        {isPcaLoading ? (
          <Skeleton className="h-80 w-full rounded-xl" />
        ) : (
          <div className="h-96 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  type="number"
                  dataKey="pc1"
                  name="PC1"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'PC1 (Engagement & Page Duration)', position: 'insideBottom', offset: -10, fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="pc2"
                  name="PC2"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'PC2 (Bounce & Exit Friction)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <RechartsTooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="p-3 rounded-xl bg-slate-900 text-white text-xs space-y-1 shadow-lg border border-slate-800">
                        <div className="font-bold flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: SEG_PALETTE[d.cluster % SEG_PALETTE.length] }}
                          />
                          Segment {d.cluster} ({d.cluster_label})
                        </div>
                        <div className="text-slate-300">
                          Purchase: <b>{d.revenue ? 'Yes (Converted)' : 'No (Exited)'}</b>
                        </div>
                        <div className="text-slate-300">
                          Page Value: <b>{d.page_values}</b>
                        </div>
                        <div className="text-slate-300">
                          Total Views: <b>{d.total_page_views}</b>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  name="Segment 0 (Casual)"
                  data={cluster0Points}
                  fill="#2563EB"
                  opacity={0.65}
                />
                <Scatter
                  name="Segment 1 (Deep Research)"
                  data={cluster1Points}
                  fill="#0D9488"
                  opacity={0.8}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* Algorithm Evaluation Comparison Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Clustering Algorithms Benchmark
            </h2>
            <p className="text-xs text-slate-500">
              Comparison across K-Means (k=2–6), GMM (k=2–6), and DBSCAN hyperparameter sweeps
            </p>
          </div>
        </div>

        {isAlgoLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : (
          <DataTable
            data={algoRows}
            columns={algoColumns}
            pageSize={10}
            filename="segmentation_algorithms_comparison.csv"
          />
        )}
      </Card>
    </div>
  );
};
