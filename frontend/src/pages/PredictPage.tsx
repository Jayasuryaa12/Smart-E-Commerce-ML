import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, PredictRequest, PredictResponse, BatchPredictResponse } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Gauge } from '@/components/ui/gauge';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/error-state';
import { formatNumber, formatPercent } from '@/lib/formatters';
import {
  Sparkles,
  RotateCcw,
  UploadCloud,
  FileCheck2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Info,
  ArrowRight,
  ShieldAlert,
  ShoppingBag,
} from 'lucide-react';

const PRESETS: Record<string, { label: string; desc: string; data: PredictRequest }> = {
  high_intent: {
    label: 'High-Intent Buyer',
    desc: 'High page values, multiple product views, returning visitor',
    data: {
      Administrative: 4,
      Administrative_Duration: 120.0,
      Informational: 2,
      Informational_Duration: 60.0,
      ProductRelated: 35,
      ProductRelated_Duration: 1850.0,
      BounceRates: 0.005,
      ExitRates: 0.015,
      PageValues: 38.5,
      SpecialDay: 0.0,
      Month: 'Nov',
      OperatingSystems: 2,
      Browser: 2,
      Region: 1,
      TrafficType: 2,
      VisitorType: 'Returning_Visitor',
      Weekend: true,
    },
  },
  researcher: {
    label: 'Deep Researcher',
    desc: 'Extensive product exploration and informational queries',
    data: {
      Administrative: 6,
      Administrative_Duration: 210.0,
      Informational: 4,
      Informational_Duration: 180.0,
      ProductRelated: 75,
      ProductRelated_Duration: 3400.0,
      BounceRates: 0.008,
      ExitRates: 0.02,
      PageValues: 12.0,
      SpecialDay: 0.0,
      Month: 'Oct',
      OperatingSystems: 2,
      Browser: 2,
      Region: 3,
      TrafficType: 3,
      VisitorType: 'Returning_Visitor',
      Weekend: false,
    },
  },
  window_shopper: {
    label: 'Window Shopper',
    desc: 'Casual new visitor browsing few products with zero page value',
    data: {
      Administrative: 0,
      Administrative_Duration: 0.0,
      Informational: 0,
      Informational_Duration: 0.0,
      ProductRelated: 8,
      ProductRelated_Duration: 220.0,
      BounceRates: 0.04,
      ExitRates: 0.08,
      PageValues: 0.0,
      SpecialDay: 0.0,
      Month: 'May',
      OperatingSystems: 1,
      Browser: 1,
      Region: 1,
      TrafficType: 1,
      VisitorType: 'New_Visitor',
      Weekend: true,
    },
  },
  bouncer: {
    label: 'Immediate Bouncer',
    desc: 'Single page view, 20% max bounce and exit rates',
    data: {
      Administrative: 0,
      Administrative_Duration: 0.0,
      Informational: 0,
      Informational_Duration: 0.0,
      ProductRelated: 1,
      ProductRelated_Duration: 0.0,
      BounceRates: 0.2,
      ExitRates: 0.2,
      PageValues: 0.0,
      SpecialDay: 0.0,
      Month: 'Feb',
      OperatingSystems: 3,
      Browser: 2,
      Region: 2,
      TrafficType: 3,
      VisitorType: 'Returning_Visitor',
      Weekend: false,
    },
  },
};

const DEFAULT_FORM: PredictRequest = PRESETS.high_intent.data;

export const PredictPage: React.FC = () => {
  const [form, setForm] = useState<PredictRequest>(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState<'live' | 'batch'>('live');

  // Single prediction mutation
  const predictMutation = useMutation({
    mutationFn: (data: PredictRequest) => api.predict(data),
  });

  // Batch prediction mutation
  const batchMutation = useMutation({
    mutationFn: (rows: PredictRequest[]) => api.predictBatch(rows),
  });

  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const handlePredict = () => {
    predictMutation.mutate(form);
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    predictMutation.reset();
  };

  const loadPreset = (key: string) => {
    const preset = PRESETS[key];
    if (preset) {
      setForm(preset.data);
      predictMutation.mutate(preset.data);
    }
  };

  // Trigger initial prediction on mount if no result yet
  React.useEffect(() => {
    if (!predictMutation.data && !predictMutation.isPending) {
      predictMutation.mutate(form);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchFile(file);
    setBatchError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setBatchError('CSV file must have a header row and at least 1 record.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const rows: PredictRequest[] = [];

        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = vals[idx];
          });

          rows.push({
            Administrative: Number(rowObj.Administrative) || 0,
            Administrative_Duration: Number(rowObj.Administrative_Duration) || 0,
            Informational: Number(rowObj.Informational) || 0,
            Informational_Duration: Number(rowObj.Informational_Duration) || 0,
            ProductRelated: Number(rowObj.ProductRelated) || 0,
            ProductRelated_Duration: Number(rowObj.ProductRelated_Duration) || 0,
            BounceRates: Number(rowObj.BounceRates) || 0,
            ExitRates: Number(rowObj.ExitRates) || 0,
            PageValues: Number(rowObj.PageValues) || 0,
            SpecialDay: Number(rowObj.SpecialDay) || 0,
            Month: rowObj.Month || 'Nov',
            OperatingSystems: Number(rowObj.OperatingSystems) || 1,
            Browser: Number(rowObj.Browser) || 1,
            Region: Number(rowObj.Region) || 1,
            TrafficType: Number(rowObj.TrafficType) || 1,
            VisitorType: rowObj.VisitorType || 'Returning_Visitor',
            Weekend: rowObj.Weekend === 'true' || rowObj.Weekend === '1' || rowObj.Weekend === true,
          });
        }

        batchMutation.mutate(rows);
      } catch (err: any) {
        setBatchError(`Failed to parse CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const result: PredictResponse | undefined = predictMutation.data;

  const batchColumns: ColumnDef<any>[] = [
    { key: 'row_index', header: 'Row #', align: 'center' },
    {
      key: 'prediction_label',
      header: 'Prediction Label',
      cell: (row) => (
        <span
          className={`font-semibold px-2 py-0.5 rounded text-xs ${
            row.prediction_class === 1
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
          }`}
        >
          {row.prediction_label}
        </span>
      ),
    },
    {
      key: 'probability_percentage',
      header: 'Probability',
      align: 'right',
      cell: (row) => `${row.probability_percentage}%`,
    },
    {
      key: 'risk_tier',
      header: 'Risk Tier',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {row.risk_tier}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Purchase Intent Prediction
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-bold uppercase tracking-wider">
              Real-Time Inference
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Predict whether an active session will convert before user exit using the champion CatBoost model. Evaluate individual session signals or run high-throughput batch scoring.
          </p>
        </div>

        {/* Tab Switcher */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="live">Live Predictor</TabsTrigger>
            <TabsTrigger value="batch">Batch Scoring</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form & Presets */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1-Click Real Dataset Presets */}
            <Card className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-900/60 border-blue-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Quick Load Dataset Presets
                </span>
                <span className="text-[11px] text-slate-500">Real Shoppers Benchmarks</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => loadPreset(key)}
                    className="p-2.5 text-left rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xs group cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {p.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Input Form Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Session Behavioral Signals
                  </h2>
                  <p className="text-xs text-slate-500">
                    Adjust browsing features to observe real-time probability impact
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs text-slate-500">
                  <RotateCcw className="w-3 h-3 mr-1.5" />
                  Reset Defaults
                </Button>
              </div>

              <div className="space-y-6">
                {/* Group 1: Quality Signals */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>1. High-Intent Quality Signals</span>
                  </div>

                  {/* Page Values Slider */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Page Values (Google Analytics Intent Score)
                      </span>
                      <span className="tabular-nums font-bold text-blue-600 dark:text-blue-400">
                        {form.PageValues.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[form.PageValues]}
                      min={0}
                      max={120}
                      step={0.5}
                      onValueChange={([val]) => setForm({ ...form, PageValues: val })}
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0.0 (No prior commercial value)</span>
                      <span>120.0+ (Strong purchase history)</span>
                    </div>
                  </div>

                  {/* Bounce & Exit Rates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Bounce Rate</span>
                        <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300">
                          {formatPercent(form.BounceRates * 100, 1)}
                        </span>
                      </div>
                      <Slider
                        value={[form.BounceRates * 100]}
                        min={0}
                        max={20}
                        step={0.1}
                        onValueChange={([val]) => setForm({ ...form, BounceRates: val / 100 })}
                      />
                    </div>

                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Exit Rate</span>
                        <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300">
                          {formatPercent(form.ExitRates * 100, 1)}
                        </span>
                      </div>
                      <Slider
                        value={[form.ExitRates * 100]}
                        min={0}
                        max={20}
                        step={0.1}
                        onValueChange={([val]) => setForm({ ...form, ExitRates: val / 100 })}
                      />
                    </div>
                  </div>
                </div>

                {/* Group 2: Browsing Volume & Duration */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    2. Browsing Depth & Duration
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Product Pages
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={form.ProductRelated}
                        onChange={(e) => setForm({ ...form, ProductRelated: Number(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Product Duration (s)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={form.ProductRelated_Duration}
                        onChange={(e) => setForm({ ...form, ProductRelated_Duration: Number(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Admin Pages
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={form.Administrative}
                        onChange={(e) => setForm({ ...form, Administrative: Number(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Admin Duration (s)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={form.Administrative_Duration}
                        onChange={(e) => setForm({ ...form, Administrative_Duration: Number(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Info Pages
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={form.Informational}
                        onChange={(e) => setForm({ ...form, Informational: Number(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Info Duration (s)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={form.Informational_Duration}
                        onChange={(e) => setForm({ ...form, Informational_Duration: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                {/* Group 3: Context & Visitor Metadata */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    3. Context & Visitor Metadata
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Month</label>
                      <select
                        value={form.Month}
                        onChange={(e) => setForm({ ...form, Month: e.target.value })}
                        className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        {['Feb', 'Mar', 'May', 'June', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Visitor Type</label>
                      <select
                        value={form.VisitorType}
                        onChange={(e) => setForm({ ...form, VisitorType: e.target.value })}
                        className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <option value="Returning_Visitor">Returning Visitor</option>
                        <option value="New_Visitor">New Visitor</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Weekend</label>
                      <select
                        value={String(form.Weekend)}
                        onChange={(e) => setForm({ ...form, Weekend: e.target.value === 'true' })}
                        className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <option value="false">Weekday (Mon–Fri)</option>
                        <option value="true">Weekend (Sat–Sun)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Special Day</label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.2"
                        value={form.SpecialDay}
                        onChange={(e) => setForm({ ...form, SpecialDay: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action Button */}
                <Button
                  onClick={handlePredict}
                  disabled={predictMutation.isPending}
                  className="w-full h-11 text-sm font-bold shadow-md shadow-blue-500/20"
                >
                  {predictMutation.isPending ? 'Calculating Inference...' : 'Run Purchase Prediction →'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Prediction Results Card */}
          <div className="lg:col-span-5 space-y-5">
            {result ? (
              <Card className="p-6 overflow-hidden border-2 border-slate-200/90 dark:border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Prediction Readout
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      result.prediction_class === 1
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                    }`}
                  >
                    {result.prediction_label}
                  </span>
                </div>

                {/* Animated Probability Gauge */}
                <div className="py-4">
                  <Gauge value={result.probability_percentage} />
                </div>

                {/* Dynamic Recommended Action Card */}
                <div className="mt-4 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Recommended Strategy</span>
                  </div>
                  <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                    {result.recommended_action}
                  </p>
                </div>

                {/* SHAP Feature Impact Waterfall */}
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Top Predictive Drivers (|SHAP| Impact)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">TreeExplainer</span>
                  </div>

                  {/* Positive Drivers (Pushed towards purchase) */}
                  {result.positive_drivers.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Positive Drivers (+ Intent)
                      </span>
                      {result.positive_drivers.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 text-xs"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {d.Feature} <span className="text-[10px] text-slate-400">({d.Value})</span>
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{d.SHAP_Impact.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Negative Drivers (Pushed away from purchase) */}
                  {result.negative_drivers.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Negative Drivers (- Intent)
                      </span>
                      {result.negative_drivers.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 text-xs"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {d.Feature} <span className="text-[10px] text-slate-400">({d.Value})</span>
                          </span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            {d.SHAP_Impact.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ) : predictMutation.isError ? (
              <ErrorState
                title="Prediction Failed"
                message={
                  (predictMutation.error as Error)?.message ||
                  'Failed to get prediction from backend ML model.'
                }
                onRetry={handlePredict}
                isRetrying={predictMutation.isPending}
              />
            ) : (
              <Card className="p-8 text-center text-slate-400">
                Click &quot;Run Purchase Prediction&quot; to view inferences and SHAP attribution.
              </Card>
            )}

            {/* Honest Model Transparency Note */}
            <Card className="p-4 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Model Transparency & PageValues Caveat
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    <code>PageValues</code> is derived from Google Analytics transactions and historical flow. It represents the strongest single intent signal in the UCI dataset. Consequently, predictions are most reliable late in a browsing session after intent indicators have accumulated.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Batch Scoring View */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center">
              <UploadCloud className="w-10 h-10 text-blue-500 mb-2" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Upload Sessions CSV for High-Speed Batch Prediction
              </h2>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-4 leading-relaxed">
                Upload any CSV containing the 17 UCI session features. The model pipeline will vectorize feature engineering and score all rows simultaneously.
              </p>

              <label className="cursor-pointer">
                <Button variant="default" size="sm" asChild>
                  <span>
                    Select CSV File
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </span>
                </Button>
              </label>

              {batchFile && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <FileCheck2 className="w-4 h-4 text-emerald-500" />
                  <span>Selected: {batchFile.name}</span>
                </div>
              )}

              {batchError && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{batchError}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Batch Results Overview */}
          {batchMutation.isPending && (
            <Card className="p-12 text-center text-slate-500 text-sm">
              Processing batch session features and scoring with CatBoost...
            </Card>
          )}

          {batchMutation.data && (
            <div className="space-y-6">
              {/* Batch KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Total Evaluated
                  </span>
                  <div className="tabular-nums text-2xl font-extrabold mt-1">
                    {formatNumber(batchMutation.data.total_records)}
                  </div>
                </Card>

                <Card className="p-4">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Predicted Conversions
                  </span>
                  <div className="tabular-nums text-2xl font-extrabold text-emerald-600 mt-1">
                    {formatNumber(batchMutation.data.summary.predicted_purchases)}
                  </div>
                </Card>

                <Card className="p-4">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Predicted Conversion Rate
                  </span>
                  <div className="tabular-nums text-2xl font-extrabold text-blue-600 mt-1">
                    {batchMutation.data.summary.conversion_rate}%
                  </div>
                </Card>

                <Card className="p-4">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Avg Purchase Probability
                  </span>
                  <div className="tabular-nums text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    {batchMutation.data.summary.avg_probability}%
                  </div>
                </Card>
              </div>

              {/* Paginated Batch Results Table */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Row-by-Row Inference Results
                  </h2>
                </div>
                <DataTable
                  data={batchMutation.data.results}
                  columns={batchColumns}
                  pageSize={15}
                  filename="batch_predictions.csv"
                />
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
