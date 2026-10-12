import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, QualityColumn, DistributionBin } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartCard } from '@/components/ui/chart-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { formatNumber, formatPercent, formatMetric } from '@/lib/formatters';
import {
  FileText,
  BarChart3,
  Table,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Layers,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const ExplorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'preview' | 'numeric' | 'categorical' | 'correlation' | 'quality'>('numeric');
  const [selectedFeature, setSelectedFeature] = useState('PageValues');
  const [binsCount, setBinsCount] = useState(20);

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dataset-summary'],
    queryFn: api.getDatasetSummary,
  });

  const { data: qualityData, isLoading: isQualityLoading } = useQuery({
    queryKey: ['dataset-quality'],
    queryFn: api.getDatasetQuality,
  });

  const { data: edaOverview } = useQuery({
    queryKey: ['eda-overview'],
    queryFn: api.getEdaOverview,
  });

  const { data: distData, isLoading: isDistLoading } = useQuery({
    queryKey: ['eda-distribution', selectedFeature, binsCount],
    queryFn: () => api.getEdaDistribution(selectedFeature, binsCount),
  });

  const { data: corrData } = useQuery({
    queryKey: ['eda-correlation'],
    queryFn: api.getEdaCorrelation,
  });

  const qualityCols: QualityColumn[] = qualityData?.data || [];
  const distBins: DistributionBin[] = distData?.data || [];
  const overview = edaOverview?.data;
  const corr = corrData?.data;

  const qualityTableCols: ColumnDef<QualityColumn>[] = [
    { key: 'column', header: 'Feature Name', cell: (r) => <span className="font-semibold">{r.column}</span> },
    { key: 'dtype', header: 'Data Type', cell: (r) => <span className="font-mono text-slate-500">{r.dtype}</span> },
    { key: 'unique_values', header: 'Unique Values', align: 'right', cell: (r) => formatNumber(r.unique_values) },
    {
      key: 'missing_count',
      header: 'Missing Count',
      align: 'right',
      cell: (r) => (
        <span className={r.missing_count === 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
          {r.missing_count} ({r.missing_percentage}%)
        </span>
      ),
    },
    {
      key: 'sample_values',
      header: 'Sample Values',
      cell: (r) => (
        <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs block">
          {r.sample_values?.slice(0, 3).join(', ')}
        </span>
      ),
    },
  ];

  const numericalSummaryCols: ColumnDef<any>[] = [
    { key: 'feature', header: 'Numerical Feature', cell: (r) => <span className="font-semibold">{r.feature}</span> },
    { key: 'mean', header: 'Mean', align: 'right', cell: (r) => r.mean.toFixed(2) },
    { key: 'std', header: 'Std Dev', align: 'right', cell: (r) => r.std.toFixed(2) },
    { key: 'median', header: 'Median', align: 'right', cell: (r) => r.median.toFixed(2) },
    { key: 'min', header: 'Min', align: 'right', cell: (r) => r.min.toFixed(2) },
    { key: 'max', header: 'Max', align: 'right', cell: (r) => r.max.toFixed(2) },
    { key: 'skew', header: 'Skewness', align: 'right', cell: (r) => r.skew.toFixed(2) },
    {
      key: 'outliers_count',
      header: 'Outliers (1.5 IQR)',
      align: 'right',
      cell: (r) => formatNumber(r.outliers_count),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Data Explorer & EDA
            <Badge variant="default" className="text-[10px] font-bold">
              12,330 Sessions
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-dimensional exploratory data analysis of behavioral signals, feature distributions, cross-correlations, and data hygiene.
          </p>
        </div>

        {/* EDA Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="numeric">Numerical</TabsTrigger>
            <TabsTrigger value="categorical">Categorical</TabsTrigger>
            <TabsTrigger value="correlation">Correlation Heatmap</TabsTrigger>
            <TabsTrigger value="quality">Data Quality</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab 1: Numerical Feature Distributions */}
      {activeTab === 'numeric' && (
        <div className="space-y-6">
          <ChartCard
            title={`Distribution Analysis: ${selectedFeature}`}
            subtitle="Histogram overlaying buyer (Revenue = True) vs non-buyer sessions"
            infoTooltip="Visualizes behavioral feature separation between converting and non-converting shoppers."
            howToRead="Blue bars represent converting buyers; amber bars represent non-buyers across feature ranges."
            headerAction={
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Feature:</span>
                <select
                  value={selectedFeature}
                  onChange={(e) => setSelectedFeature(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 text-slate-700 dark:text-slate-300"
                >
                  {[
                    'PageValues',
                    'ProductRelated',
                    'ProductRelated_Duration',
                    'Administrative',
                    'Administrative_Duration',
                    'BounceRates',
                    'ExitRates',
                  ].map((feat) => (
                    <option key={feat} value={feat}>
                      {feat}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {isDistLoading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distBins} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="bin_label"
                      tick={{ fontSize: 10 }}
                      interval={Math.ceil(distBins.length / 10)}
                      angle={-30}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '10px',
                        fontSize: '11px',
                        backgroundColor: '#0F172A',
                        color: '#F8FAFC',
                        border: 'none',
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="buyers_count" name="Buyers (Revenue = True)" fill="#2563EB" stackId="a" />
                    <Bar dataKey="non_buyers_count" name="Non-Buyers" fill="#CBD5E1" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          {/* Numerical Features 5-Number Summary Table */}
          <Card className="p-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Numerical Feature Descriptive Statistics
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Mean, standard deviation, skewness, and Tukey 1.5 IQR outlier counts
            </p>
            <DataTable
              data={overview?.numerical_summary || []}
              columns={numericalSummaryCols}
              pageSize={10}
              filename="numerical_summary_statistics.csv"
            />
          </Card>
        </div>
      )}

      {/* Tab 2: Categorical Features Conversion Rates */}
      {activeTab === 'categorical' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Conversion Rate by Month"
            subtitle="Seasonality impact across 10 recorded months"
          >
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview?.month_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="Month" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(v: any) => [`${v}%`, 'Conversion Rate']} />
                  <Bar dataKey="rate" name="Conversion Rate" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Conversion Rate by Weekend Status"
            subtitle="Weekday vs Weekend traffic performance"
          >
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview?.weekend_breakdown?.map((w) => ({
                    ...w,
                    name: w.Weekend ? 'Weekend (Sat–Sun)' : 'Weekday (Mon–Fri)',
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(v: any) => [`${v}%`, 'Conversion Rate']} />
                  <Bar dataKey="rate" name="Conversion Rate" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      {/* Tab 3: Correlation Matrix Heatmap */}
      {activeTab === 'correlation' && (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Pearson Correlation Matrix (Numerical Features)
            </h2>
            <p className="text-xs text-slate-500">
              Pairwise correlation coefficient values (-1.0 to +1.0)
            </p>
          </div>

          {corr ? (
            <div className="overflow-x-auto">
              <table className="text-[11px] border-collapse font-mono">
                <thead>
                  <tr>
                    <th className="p-2 border border-slate-200 dark:border-slate-800 text-left bg-slate-50 dark:bg-slate-900">
                      Feature
                    </th>
                    {corr.columns.map((c) => (
                      <th
                        key={c}
                        className="p-2 border border-slate-200 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-900 truncate max-w-[80px]"
                        title={c}
                      >
                        {c.slice(0, 8)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corr.columns.map((rowName, rIdx) => (
                    <tr key={rowName}>
                      <td className="p-2 border border-slate-200 dark:border-slate-800 font-semibold bg-slate-50 dark:bg-slate-900 whitespace-nowrap">
                        {rowName}
                      </td>
                      {corr.matrix[rIdx].map((val, cIdx) => {
                        // Intensity styling
                        let bgColor = 'bg-transparent';
                        if (val > 0.7) bgColor = 'bg-blue-600 text-white font-bold';
                        else if (val > 0.4) bgColor = 'bg-blue-200 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200';
                        else if (val < -0.4) bgColor = 'bg-rose-200 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200';

                        return (
                          <td
                            key={cIdx}
                            className={`p-2 border border-slate-200 dark:border-slate-800 text-center tabular-nums ${bgColor}`}
                            title={`${rowName} vs ${corr.columns[cIdx]}: ${val}`}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </Card>
      )}

      {/* Tab 4: Data Quality Audit */}
      {activeTab === 'quality' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Data Hygiene & Schema Quality Report
              </h2>
              <p className="text-xs text-slate-500">
                Missing value count, percentage, and unique cardinailty per feature
              </p>
            </div>
          </div>

          <DataTable
            data={qualityCols}
            columns={qualityTableCols}
            pageSize={15}
            filename="data_quality_audit.csv"
          />
        </Card>
      )}
    </div>
  );
};
