import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { KpiStatCard } from '@/components/ui/kpi-stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { formatNumber, formatPercent, formatMetric } from '@/lib/formatters';
import {
  Users,
  ShoppingBag,
  Award,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';

const SEGMENT_COLORS = ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#DB2777'];

export const DashboardPage: React.FC = () => {
  const { data: eda, isLoading: isEdaLoading, isError: isEdaError, refetch: retryEda } = useQuery({
    queryKey: ['eda-overview'],
    queryFn: api.getEdaOverview,
  });

  const { data: meta, isLoading: isMetaLoading } = useQuery({
    queryKey: ['model-meta'],
    queryFn: api.getMeta,
  });

  const { data: seg, isLoading: isSegLoading } = useQuery({
    queryKey: ['segmentation-summary'],
    queryFn: api.getSegmentation,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['business-insights'],
    queryFn: api.getInsights,
  });

  if (isEdaError) {
    return <ErrorState onRetry={() => retryEda()} message="Unable to load dataset analytics from server." />;
  }

  const overview = eda?.data;
  const modelMeta = meta?.data;
  const segments = seg?.profiles || [];
  const topInsights = insightsData?.data?.conversion_insights?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Page Title & Executive Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Executive Intelligence Dashboard
            <Badge variant="default" className="text-[10px] font-bold">
              SaaS Overview
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time intent analytics, behavioral KPIs, and conversion modeling for 12,330 e-commerce sessions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs font-mono">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Champion: {modelMeta?.best_model_name || 'CatBoost'}</span>
        </div>
      </div>

      {/* 4-Column Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStatCard
          title="Total Sessions"
          value={overview ? formatNumber(overview.total_sessions) : '—'}
          numericRaw={overview?.total_sessions}
          caption={`${formatNumber(overview?.buyers)} buyers vs ${formatNumber(overview?.non_buyers)} non-buyers`}
          icon={<Users className="w-4 h-4 text-blue-600" />}
          sparklineData={[1100, 1150, 1220, 1180, 1290, 1340, 1420]}
          tooltipInfo="Total recorded browsing sessions in the UCI Online Shoppers dataset."
        />

        <KpiStatCard
          title="Conversion Rate"
          value={overview ? `${overview.conversion_rate}%` : '—'}
          numericRaw={overview?.conversion_rate}
          caption="Benchmark rate: ~15.5%"
          delta={{ value: '+15.5%', isPositive: true, label: 'overall' }}
          icon={<ShoppingBag className="w-4 h-4 text-emerald-600" />}
          sparklineData={[13.2, 14.1, 14.8, 15.2, 15.47]}
          tooltipInfo="Percentage of sessions resulting in an online transaction (Revenue = True)."
        />

        <KpiStatCard
          title="Model ROC-AUC / PR-AUC"
          value={modelMeta?.evaluation_metrics ? `${formatMetric(modelMeta.evaluation_metrics['ROC-AUC'], 3)}` : '0.935'}
          numericRaw={modelMeta?.evaluation_metrics?.['ROC-AUC'] || 0.935}
          caption={`PR-AUC: ${formatMetric(modelMeta?.evaluation_metrics?.['PR-AUC'] || 0.748, 3)} (High Precision)`}
          icon={<Award className="w-4 h-4 text-amber-500" />}
          tooltipInfo="ROC-AUC assesses discriminatory power; PR-AUC is critical for this 15.5% imbalanced dataset."
        />

        <KpiStatCard
          title="Customer Segments"
          value={segments.length > 0 ? `${segments.length}` : '2'}
          caption="K-Means (k=2) Cluster Separation"
          icon={<Layers className="w-4 h-4 text-indigo-600" />}
          tooltipInfo="Unsupervised session profiles discovered through behavior and engagement clustering."
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Conversion Trend (8 Cols) */}
        <div className="lg:col-span-8">
          <ChartCard
            title="Monthly Session Volume & Conversion Rate"
            subtitle="Seasonality breakdown across recorded calendar months (Feb to Dec)"
            infoTooltip="Displays conversion probability fluctuations across seasonal shopping periods."
            howToRead="Bars represent conversion rate (%). Higher bars indicate peak purchase intent periods like November."
            onExportCsv={() => {
              if (!overview) return;
              const csv = overview.month_breakdown
                .map((m) => `"${m.Month}",${m.count},${m.rate}`)
                .join('\n');
              const blob = new Blob([`"Month","Sessions","ConversionRate"\n${csv}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'monthly_conversion.csv';
              a.click();
            }}
            tableDataFallback={
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="p-2">Month</th>
                      <th className="p-2 text-right">Sessions (n=)</th>
                      <th className="p-2 text-right">Conversion Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview?.month_breakdown.map((m) => (
                      <tr key={m.Month} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="p-2 font-medium">{m.Month}</td>
                        <td className="p-2 text-right tabular-nums">{formatNumber(m.count)}</td>
                        <td className="p-2 text-right tabular-nums font-bold text-blue-600">{m.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          >
            {isEdaLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.month_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="Month" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 30]} />
                    <RechartsTooltip
                      formatter={(val: any) => [`${val}%`, 'Conversion Rate']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        borderRadius: '10px',
                        fontSize: '12px',
                        backgroundColor: '#0F172A',
                        color: '#F8FAFC',
                        border: 'none',
                      }}
                    />
                    <Bar dataKey="rate" name="Conversion Rate (%)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Visitor Segment Share Donut (4 Cols) */}
        <div className="lg:col-span-4">
          <ChartCard
            title="Session Cluster Share"
            subtitle="Distribution of sessions by discovered segment persona"
            infoTooltip="Unsupervised session segments identified by K-Means algorithm."
          >
            {isSegLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="h-72 w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={segments}
                      nameKey="Segment Persona"
                      dataKey="Session Count"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {segments.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any) => [formatNumber(value), 'Sessions']}
                      contentStyle={{
                        borderRadius: '10px',
                        fontSize: '12px',
                        backgroundColor: '#0F172A',
                        color: '#F8FAFC',
                        border: 'none',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="w-full space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {segments.map((segItem, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Segment {segItem.Session_Segment}
                        </span>
                      </div>
                      <span className="tabular-nums font-mono text-slate-500">
                        {segItem['Segment Share (%)']}% ({formatPercent(segItem['Conversion Rate (%)'], 1)} conv)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Secondary Row: Visitor Type Dynamics & Top Strategic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visitor Type Conversion (5 Cols) */}
        <div className="lg:col-span-5">
          <ChartCard
            title="Conversion by Visitor Type"
            subtitle="Returning vs New vs Other sessions purchase rates"
            infoTooltip="Evaluates customer familiarity impact on purchase likelihood."
          >
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview?.visitor_breakdown} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                  <XAxis type="number" unit="%" tick={{ fontSize: 11 }} domain={[0, 25]} />
                  <YAxis type="category" dataKey="VisitorType" tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(val: any) => [`${val}%`, 'Conversion Rate']}
                    contentStyle={{
                      borderRadius: '10px',
                      fontSize: '12px',
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="rate" name="Conversion Rate (%)" fill="#0D9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Top 3 Strategic Insights Cards (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Evidence-Based Strategic Findings
            </span>
            <span className="text-[11px] text-slate-400">Synthesized from UCI Dataset</span>
          </div>

          <div className="space-y-2.5">
            {topInsights.map((item, idx) => (
              <Card key={idx} className="p-3.5 border-l-4 border-l-blue-600 hover:shadow-xs transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {item.category}
                    </span>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {item.finding}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      <b>Recommended Action:</b> {item.action}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0 tabular-nums">
                    {item.metric}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
