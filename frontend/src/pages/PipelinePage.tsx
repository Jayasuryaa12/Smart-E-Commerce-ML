import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GitBranch,
  CheckCircle2,
  Database,
  Sliders,
  Filter,
  Cpu,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface PipelineStep {
  id: number;
  title: string;
  subtitle: string;
  details: string;
  metrics: Record<string, string>;
}

const STEPS: PipelineStep[] = [
  {
    id: 1,
    title: '1. Ingestion & Schema Validation',
    subtitle: 'Data type casting & missing check',
    details: 'Validates 18 columns, verifies numerical ranges (rates ∈ [0, 0.2]), flags missing values and duplicates.',
    metrics: { 'Initial Records': '12,330', 'Valid Rows': '100.0%', 'Null Values': '0' },
  },
  {
    id: 2,
    title: '2. Domain Feature Engineering',
    subtitle: '6 synthetic session ratios',
    details: 'Constructs commercial intent ratios: Total Page Views, Duration per Page, Product View Ratio, Bounce-Exit Ratio, and Page Value Intensity.',
    metrics: { 'Engineered Features': '6', 'Total Raw Features': '18', 'Transformed Dimensionality': '24' },
  },
  {
    id: 3,
    title: '3. Stratified Train/Test Split',
    subtitle: '80/20 split preserving class ratio',
    details: 'Stratified sampling to ensure the ~15.5% conversion rate is identically preserved in both partitions.',
    metrics: { 'Train Sessions': '9,764 (80%)', 'Test Sessions': '2,441 (20%)', 'Conversion Ratio': '15.5% Stratified' },
  },
  {
    id: 4,
    title: '4. ColumnTransformer Preprocessing',
    subtitle: 'StandardScaler & OneHotEncoder',
    details: 'Scales 16 numerical features to zero-mean unit-variance; encodes 7 categorical features into one-hot binary columns.',
    metrics: { 'Scaled Numerical': '16 features', 'One-Hot Categorical': '7 columns (64 binary)', 'Leakage Prevention': 'Fitted on Train Only' },
  },
  {
    id: 5,
    title: '5. Model Training & 5-Fold CV',
    subtitle: 'CatBoost champion classifier',
    details: 'Gradient boosting on decision trees with categorical feature handling, cost-sensitive class balancing, and 5-fold cross validation.',
    metrics: { 'Folds': '5 Stratified', 'CV Mean F1': '0.6581 ± 0.0125', 'Test F1': '0.6715' },
  },
];

const ENGINEERED_FEATURES = [
  {
    name: 'Total_Page_Views',
    formula: 'Administrative + Informational + ProductRelated',
    description: 'Total browsing volume during the active session across all site sections.',
  },
  {
    name: 'Total_Duration',
    formula: 'Administrative_Duration + Informational_Duration + ProductRelated_Duration',
    description: 'Total active time spent on site in seconds.',
  },
  {
    name: 'Avg_Duration_Per_Page',
    formula: 'Total_Duration / (Total_Page_Views + 1)',
    description: 'Measures depth of reading vs rapid skimming behavior.',
  },
  {
    name: 'Product_View_Ratio',
    formula: 'ProductRelated / (Total_Page_Views + 1)',
    description: 'Fraction of session dedicated exclusively to catalogue product browsing.',
  },
  {
    name: 'Bounce_Exit_Ratio',
    formula: 'BounceRates / (ExitRates + 0.001)',
    description: 'Ratio quantifying whether visitor left immediately or navigated before exit.',
  },
  {
    name: 'PageValue_Intensity',
    formula: 'PageValues / (Total_Page_Views + 1)',
    description: 'Normalized commercial value accrued per page viewed.',
  },
];

export const PipelinePage: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<number>(2);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          ML Preprocessing & Pipeline Architecture
          <Badge variant="default" className="text-[10px] font-bold">
            Scikit-Learn & Imbalanced Pipeline
          </Badge>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Step-by-step reproducible data transformation pipeline ensuring zero data leakage between training and test sets.
        </p>
      </div>

      {/* Horizontal Interactive Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {STEPS.map((s) => {
          const isSelected = selectedStep === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedStep(s.id)}
              className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                  Step 0{s.id}
                </span>
                <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                {s.title.split('. ')[1]}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                {s.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Step Expanded Detail Drawer */}
      {(() => {
        const step = STEPS.find((s) => s.id === selectedStep) || STEPS[0];
        return (
          <Card className="p-6 border-l-4 border-l-blue-600">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    Pipeline Stage Deep Dive
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {step.title}
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                {step.details}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {Object.entries(step.metrics).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">{k}</span>
                    <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Engineered Features Specification Table */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Engineered Behavioral Features & Mathematical Formulations
          </h2>
          <p className="text-xs text-slate-500">
            Derived in <code>src/feature_engineering.py</code> to capture session intent dynamics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ENGINEERED_FEATURES.map((feat) => (
            <div
              key={feat.name}
              className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {feat.name}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Engineered
                </Badge>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-900 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto">
                <code>{feat.formula}</code>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
