import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ModelMetric } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartCard } from '@/components/ui/chart-card';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { formatMetric, formatPercent, formatNumber } from '@/lib/formatters';
import {
  Award,
  Sliders,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  ShieldAlert,
  HelpCircle,
  Activity,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

const MODEL_PALETTE: Record<string, string> = {
  CatBoost: '#2563EB',
  'Gradient Boosting': '#0D9488',
  'Random Forest': '#D97706',
  LightGBM: '#7C3AED',
  'Stacking Ensemble': '#DB2777',
  XGBoost: '#0284C7',
  'Logistic Regression (Baseline)': '#64748B',
  'MLP / Neural Network': '#EA580C',
};

export const ModelsPage: React.FC = () => {
  const [selectedThresholdModel, setSelectedThresholdModel] = useState('CatBoost');
  const [threshold, setThreshold] = useState(0.5);
  const [activeCurveModels, setActiveCurveModels] = useState<string[]>([
    'CatBoost',
    'Gradient Boosting',
    'Logistic Regression (Baseline)',
  ]);

  const { data: modelsData, isLoading: isModelsLoading, isError: isModelsError, refetch: retryModels } = useQuery({
    queryKey: ['models-comparison'],
    queryFn: api.getModels,
  });

  const { data: curvesData, isLoading: isCurvesLoading } = useQuery({
    queryKey: ['models-curves'],
    queryFn: api.getCurves,
  });

  const { data: thresholdData } = useQuery({
    queryKey: ['model-threshold', selectedThresholdModel, threshold],
    queryFn: () => api.getThreshold(selectedThresholdModel, threshold),
  });

  if (isModelsError) {
    return <ErrorState onRetry={() => retryModels()} message="Unable to load model comparison leaderboard." />;
  }

  const modelsList: ModelMetric[] = modelsData?.metrics || [];
  const bestModel = modelsData?.best_model || 'CatBoost';
  const curves = curvesData?.data || {};

  const toggleModelCurve = (name: string) => {
    setActiveCurveModels((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  // Format curves data for Recharts overlay
  const rocChartData: any[] = [];
  for (let i = 0; i <= 100; i += 2) {
    const pt: any = { fpr: i / 100 };
    Object.keys(curves).forEach((m) => {
      if (activeCurveModels.includes(m)) {
        const pts = curves[m]?.roc_curve || [];
        const closest = pts.reduce((prev, curr) =>
          Math.abs(curr.fpr - pt.fpr) < Math.abs(prev.fpr - pt.fpr) ? curr : prev,
          pts[0] || { tpr: pt.fpr }
        );
        pt[m] = closest ? closest.tpr : pt.fpr;
      }
    });
    rocChartData.push(pt);
  }

  const columns: ColumnDef<ModelMetric>[] = [
    {
      key: 'Model',
      header: 'Model Name',
      cell: (row) => (
        <div className="flex items-center gap-2 font-semibold">
          <span>{row.Model}</span>
          {row.Model === bestModel && (
            <Badge variant="success" className="text-[9px] font-extrabold uppercase py-0 px-1.5">
              Champion
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'F1-Score',
      header: 'Test F1-Score',
      align: 'right',
      cell: (row) => (
        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
          {formatMetric(row['F1-Score'], 4)}
        </span>
      ),
    },
    {
      key: 'ROC-AUC',
      header: 'ROC-AUC',
      align: 'right',
      cell: (row) => <span className="font-mono">{formatMetric(row['ROC-AUC'], 4)}</span>,
    },
    {
      key: 'PR-AUC',
      header: 'PR-AUC',
      align: 'right',
      cell: (row) => <span className="font-mono">{formatMetric(row['PR-AUC'], 4)}</span>,
    },
    {
      key: 'Precision',
      header: 'Precision',
      align: 'right',
      cell: (row) => <span className="font-mono">{formatMetric(row.Precision, 4)}</span>,
    },
    {
      key: 'Recall',
      header: 'Recall',
      align: 'right',
      cell: (row) => <span className="font-mono">{formatMetric(row.Recall, 4)}</span>,
    },
    {
      key: 'Accuracy',
      header: 'Accuracy',
      align: 'right',
      cell: (row) => <span className="font-mono">{formatMetric(row.Accuracy, 4)}</span>,
    },
    {
      key: 'CV F1 (Mean)',
      header: '5-Fold CV F1',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-slate-500">
          {formatMetric(row['CV F1 (Mean)'], 3)} ± {formatMetric(row['CV F1 (Std)'], 3)}
        </span>
      ),
    },
    {
      key: 'Train F1',
      header: 'Train F1 (Overfit Check)',
      align: 'right',
      cell: (row) => {
        const gap = (row['Train F1'] - row['F1-Score']).toFixed(3);
        return (
          <span className="font-mono text-[11px] text-slate-500">
            {formatMetric(row['Train F1'], 3)} (Δ {gap})
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          Model Leaderboard & Evaluation
          <Badge variant="default" className="text-[10px] font-bold">
            8 Candidate Architectures
          </Badge>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Comprehensive benchmark of tree ensembles, stacking, neural network, and linear baseline trained on stratified 80/20 split with 5-fold cross validation.
        </p>
      </div>

      {/* Champion Selection Rationale Callout Card */}
      <Card className="p-5 border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Selected Champion: CatBoost Classifier
              </span>
              <Badge variant="success">Production Ready</Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              CatBoost delivered the highest test F1-score (<b>0.6715</b>) with superior positive recall (<b>85.34%</b>) and competitive PR-AUC (<b>0.7482</b>). Crucially, CatBoost exhibited lowest variance across 5 folds (std ±0.0125) and minimal train-vs-test generalization gap (Train F1 0.707 vs Test 0.671), avoiding the severe overfit seen in Random Forest.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Baseline Uplift</span>
              <div className="tabular-nums font-mono font-extrabold text-emerald-600 text-lg">
                +9.1% F1
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Full Leaderboard Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Candidate Models Leaderboard
            </h2>
            <p className="text-xs text-slate-500">
              Sorted by Primary Metric: Test F1-Score on imbalanced sessions
            </p>
          </div>
        </div>

        {isModelsLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <DataTable
            data={modelsList}
            columns={columns}
            pageSize={10}
            filename="model_comparison_leaderboard.csv"
          />
        )}
      </Card>

      {/* Interactive ROC Curve & Live Threshold Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ROC Curves Multi-Model Overlay (7 Cols) */}
        <div className="lg:col-span-7">
          <ChartCard
            title="ROC Curve Multi-Model Overlay"
            subtitle="True Positive Rate vs False Positive Rate across decision thresholds"
            infoTooltip="Visualizes model discrimination ability. Diagonal line represents random chance."
            headerAction={
              <div className="flex flex-wrap gap-1 max-w-xs">
                {Object.keys(curves).map((m) => {
                  const isActive = activeCurveModels.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleModelCurve(m)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {m.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            }
          >
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rocChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} label={{ value: 'FPR (1 - Specificity)', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} label={{ value: 'TPR (Recall)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '10px',
                      fontSize: '11px',
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      border: 'none',
                    }}
                  />
                  {activeCurveModels.map((m) => (
                    <Line
                      key={m}
                      type="monotone"
                      dataKey={m}
                      stroke={MODEL_PALETTE[m] || '#2563EB'}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Live Threshold Simulator (5 Cols) */}
        <div className="lg:col-span-5">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Live Decision Threshold Simulator
                </h3>
                <p className="text-xs text-slate-500">
                  Slide decision cut-off to inspect live precision/recall trade-off
                </p>
              </div>
            </div>

            {/* Threshold Slider */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Probability Cut-off (t)
                  </span>
                  <span className="tabular-nums font-mono font-bold text-blue-600 text-sm">
                    {threshold.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[threshold]}
                  min={0.05}
                  max={0.95}
                  step={0.02}
                  onValueChange={([val]) => setThreshold(val)}
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Aggressive (High Recall)</span>
                  <span>Conservative (High Precision)</span>
                </div>
              </div>

              {/* Dynamic Metrics at Threshold */}
              {thresholdData?.metrics && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50">
                    <span className="text-[10px] uppercase font-bold text-blue-600">Precision</span>
                    <div className="tabular-nums font-mono text-lg font-extrabold text-blue-700 dark:text-blue-300">
                      {formatMetric(thresholdData.metrics.precision, 3)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/50">
                    <span className="text-[10px] uppercase font-bold text-emerald-600">Recall</span>
                    <div className="tabular-nums font-mono text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                      {formatMetric(thresholdData.metrics.recall, 3)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/50">
                    <span className="text-[10px] uppercase font-bold text-indigo-600">F1-Score</span>
                    <div className="tabular-nums font-mono text-lg font-extrabold text-indigo-700 dark:text-indigo-300">
                      {formatMetric(thresholdData.metrics.f1_score, 3)}
                    </div>
                  </div>
                </div>
              )}

              {/* Live Confusion Matrix Grid */}
              {thresholdData?.confusion_matrix && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Test Set Confusion Matrix (N = 2,441)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400">True Negative (TN)</div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatNumber(thresholdData.confusion_matrix.tn)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-center">
                      <div className="text-[10px] text-rose-500">False Positive (FP)</div>
                      <div className="font-bold text-sm text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatNumber(thresholdData.confusion_matrix.fp)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-center">
                      <div className="text-[10px] text-rose-500">False Negative (FN)</div>
                      <div className="font-bold text-sm text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatNumber(thresholdData.confusion_matrix.fn)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-center">
                      <div className="text-[10px] text-emerald-500">True Positive (TP)</div>
                      <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatNumber(thresholdData.confusion_matrix.tp)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
