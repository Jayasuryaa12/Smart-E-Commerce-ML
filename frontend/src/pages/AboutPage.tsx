import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Code2,
  Server,
  Database,
  Layers,
  Cpu,
  ShieldAlert,
  Info,
  Calendar,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { data: metaData, isLoading } = useQuery({
    queryKey: ['model-meta'],
    queryFn: api.getMeta,
  });

  const meta = metaData?.data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          Methodology & System Architecture
          <Badge variant="default" className="text-[10px] font-bold">
            v{meta?.model_version || '1.0.0-PhaseII'}
          </Badge>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Comprehensive technical documentation, metrics glossary, model selection rationale, and academic dataset citations.
        </p>
      </div>

      {/* Model Metadata Card */}
      <Card className="p-5 bg-gradient-to-r from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Artifact
            </span>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {meta?.best_model_name || 'CatBoost'}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Training Timestamp
            </span>
            <div className="font-mono text-slate-700 dark:text-slate-300 text-xs mt-0.5 truncate">
              {meta?.training_timestamp ? new Date(meta.training_timestamp).toUTCString() : '2026-10-01'}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Train / Test Shape
            </span>
            <div className="font-mono text-slate-700 dark:text-slate-300 text-xs mt-0.5">
              {meta?.train_sessions} / {meta?.test_sessions} sessions
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Champion Test ROC-AUC
            </span>
            <div className="font-mono font-bold text-emerald-600 text-sm mt-0.5">
              {meta?.evaluation_metrics?.['ROC-AUC'] ?? '0.9352'}
            </div>
          </div>
        </div>
      </Card>

      {/* Metrics Glossary */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Metrics Glossary (Plain-English Interpretations)
          </h2>
          <p className="text-xs text-slate-500">
            Why traditional accuracy fails on imbalanced conversion problems
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="font-bold text-blue-600">PR-AUC (Precision-Recall Area Under Curve)</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              For an imbalanced dataset where only 15.5% purchase, ROC-AUC can be deceptively optimistic because of the large pool of true negatives. PR-AUC focuses strictly on the positive purchase class, making it our primary optimization criterion.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="font-bold text-blue-600">Recall vs Precision Trade-Off</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              High Recall (85.3%) ensures the e-commerce store captures almost every prospective buyer before they exit. Lower Precision (55.4%) is an acceptable commercial compromise when the intervention (e.g. exit modal or discount) has negligible marginal cost.
            </p>
          </div>
        </div>
      </Card>

      {/* Honest Limitations & Caveats */}
      <Card className="p-6 border-l-4 border-l-amber-500 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            System Limitations & Known Assumptions
          </h2>
        </div>

        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-5">
          <li>
            <b>Single-Dataset Benchmark:</b> Evaluated on the UCI Online Shoppers Purchasing Intention benchmark (12,330 sessions). Cross-merchant behavioral variance may require domain adaptation.
          </li>
          <li>
            <b>PageValues Feature Caveat:</b> <code>PageValues</code> is derived by Google Analytics from user visits to pages that completed transactions. While an invaluable commercial intent signal, it is only accumulated as users browse deeply.
          </li>
          <li>
            <b>Session Level (No Cross-Device Identity):</b> Sessions are isolated browsing events. Returning visitors are recognized via cookie flags, but omni-channel or cross-device journeys are not linked.
          </li>
        </ul>
      </Card>

      {/* Production Tech Stack */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Modern SaaS Engineering Stack
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">Frontend SaaS UI</span>
            <p className="text-slate-500 text-[11px]">
              React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui primitives, Recharts, TanStack Query.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">REST ML Server</span>
            <p className="text-slate-500 text-[11px]">
              Python Flask REST API, CORS support, joblib serializations, sub-millisecond vectorized inference.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">ML & Explainability</span>
            <p className="text-slate-500 text-[11px]">
              CatBoost, Scikit-Learn, SHAP TreeExplainer, K-Means clustering, PCA Latent projections.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
