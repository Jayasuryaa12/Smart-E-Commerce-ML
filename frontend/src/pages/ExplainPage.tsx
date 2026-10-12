import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, GlobalImportanceItem, BeeswarmItem } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartCard } from '@/components/ui/chart-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { formatNumber, formatMetric } from '@/lib/formatters';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Info,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

export const ExplainPage: React.FC = () => {
  const [selectedDependenceFeature, setSelectedDependenceFeature] = useState('PageValues');

  const { data: explainData, isLoading, isError, refetch } = useQuery({
    queryKey: ['explain-global'],
    queryFn: api.getExplainGlobal,
  });

  if (isError) {
    return <ErrorState onRetry={() => refetch()} message="Unable to load SHAP explainability artifacts." />;
  }

  const importance: GlobalImportanceItem[] = explainData?.data?.importance || [];
  const beeswarmPoints: BeeswarmItem[] = explainData?.data?.beeswarm || [];
  const dependenceData = explainData?.data?.dependence || {};
  const sampleCount = explainData?.data?.sample_count || 300;

  const top10Importance = importance.slice(0, 10);

  // Prepare Dependence points for selected feature
  const currentDepPoints = dependenceData[selectedDependenceFeature] || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          Model Explainability & SHAP
          <Badge variant="default" className="text-[10px] font-bold">
            TreeExplainer (Game Theory)
          </Badge>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Unpack how the CatBoost tree ensemble computes intent probabilities using Shapley additive explanations (SHAP). Global feature ranking, beeswarm spreads, and non-linear partial dependence.
        </p>
      </div>

      {/* Top 5 Drivers Plain-English Synthesis Card */}
      <Card className="p-5 border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Plain-English Synthesis: Top 5 Drivers of Purchase Intent
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="font-bold text-blue-600">1. PageValues & Intensity</span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Strongest commercial driver. Sessions that cross non-zero PageValues transition rapidly from casual browsing to &gt;50% conversion probability.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="font-bold text-blue-600">2. Seasonality (Nov vs May)</span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                November holiday shopping generates substantial positive SHAP uplift, whereas May sessions skew heavily toward informational browsing with lower close rates.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="font-bold text-blue-600">3. Exit Rates & Friction</span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Elevated ExitRates (&gt;0.05) penalize intent steeply. When exit probability exceeds bounce rate, it signals checkout or navigation friction.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Charts: Global Importance & Feature Dependence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Global Importance Bar Chart (6 Cols) */}
        <div className="lg:col-span-6">
          <ChartCard
            title="Global Feature Importance (Mean |SHAP|)"
            subtitle="Top 10 transformed features by average absolute impact across sessions"
            infoTooltip="Represents the average marginal contribution of each feature to the model's log-odds output."
          >
            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top10Importance}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 70, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="Feature"
                      tick={{ fontSize: 10, fill: '#64748B' }}
                    />
                    <RechartsTooltip
                      formatter={(val: any) => [val.toFixed(4), 'Mean |SHAP| Impact']}
                      contentStyle={{
                        borderRadius: '10px',
                        fontSize: '11px',
                        backgroundColor: '#0F172A',
                        color: '#F8FAFC',
                        border: 'none',
                      }}
                    />
                    <Bar
                      dataKey="Mean_|SHAP|_Importance"
                      name="Mean |SHAP|"
                      fill="#2563EB"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Partial Dependence Scatter Plot (6 Cols) */}
        <div className="lg:col-span-6">
          <ChartCard
            title="SHAP Dependence Plot"
            subtitle={`Feature Value vs SHAP Impact for ${selectedDependenceFeature}`}
            infoTooltip="Shows how changes in a specific feature value alter model prediction impact."
            headerAction={
              <select
                value={selectedDependenceFeature}
                onChange={(e) => setSelectedDependenceFeature(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 text-slate-700 dark:text-slate-300"
              >
                {Object.keys(dependenceData).map((feat) => (
                  <option key={feat} value={feat}>
                    {feat}
                  </option>
                ))}
              </select>
            }
          >
            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      type="number"
                      dataKey="value"
                      name={selectedDependenceFeature}
                      tick={{ fontSize: 11 }}
                      label={{ value: selectedDependenceFeature, position: 'insideBottom', offset: -10, fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="shap"
                      name="SHAP Impact"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'SHAP Value (+/- Intent)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <RechartsTooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(val: any, name: any) => [val, name]}
                      contentStyle={{
                        borderRadius: '10px',
                        fontSize: '11px',
                        backgroundColor: '#0F172A',
                        color: '#F8FAFC',
                        border: 'none',
                      }}
                    />
                    <Scatter
                      data={currentDepPoints}
                      fill="#0D9488"
                      opacity={0.7}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Beeswarm Distribution View */}
      <ChartCard
        title={`SHAP Beeswarm Distribution (N = ${sampleCount} Sessions)`}
        subtitle="Distribution of individual session SHAP values across top candidate features"
        infoTooltip="Positive SHAP values push predictions towards purchase; negative values suppress conversion likelihood."
        howToRead="Points to the right of zero indicate positive contribution to purchase intention for that session."
      >
        <div className="space-y-3 pt-2">
          {top10Importance.map((imp) => {
            const featName = imp.Feature;
            const pts = beeswarmPoints.filter((p) => p.feature === featName);
            const posCount = pts.filter((p) => p.shap_impact > 0).length;
            const negCount = pts.filter((p) => p.shap_impact < 0).length;

            return (
              <div
                key={featName}
                className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/60 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {featName}
                  </span>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-emerald-600 font-bold">+{posCount} pos</span>
                    <span className="text-rose-600 font-bold">-{negCount} neg</span>
                    <span className="text-slate-400">Mean: {imp['Mean_|SHAP|_Importance'].toFixed(3)}</span>
                  </div>
                </div>

                {/* Horizontal strip mini-scatter */}
                <div className="h-6 w-full relative bg-slate-200/50 dark:bg-slate-700/40 rounded-md overflow-hidden flex items-center">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400 dark:bg-slate-500 z-10" />
                  {pts.map((pt, i) => {
                    // Map SHAP impact to percent (-1.5 to +1.5 range)
                    const leftPct = Math.min(98, Math.max(2, 50 + (pt.shap_impact / 2.0) * 50));
                    return (
                      <div
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full opacity-60 hover:opacity-100 hover:scale-150 transition-transform"
                        style={{
                          left: `${leftPct}%`,
                          backgroundColor: pt.shap_impact >= 0 ? '#10B981' : '#EF4444',
                        }}
                        title={`${featName}: Value=${pt.feature_value}, SHAP=${pt.shap_impact}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
};
