import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatNumber, formatPercent } from '@/lib/formatters';
import {
  Sparkles,
  ArrowRight,
  Target,
  BarChart2,
  Users,
  Brain,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Cpu,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { data: eda } = useQuery({
    queryKey: ['eda-overview'],
    queryFn: api.getEdaOverview,
  });

  const { data: meta } = useQuery({
    queryKey: ['model-meta'],
    queryFn: api.getMeta,
  });

  const overview = eda?.data;
  const championName = meta?.data?.best_model_name || 'CatBoost';
  const championRoc = meta?.data?.evaluation_metrics?.['ROC-AUC'] ?? '0.9352';

  return (
    <div className="space-y-16 py-6 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Behavioral E-Commerce Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 max-w-4xl mx-auto leading-tight">
          Know who will buy —{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            before they leave.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Transform raw clickstream signals into real-time intent predictions. Discover high-value session clusters, audit friction points with SHAP, and target exit-intent offers with precision.
        </p>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild size="lg" className="h-12 px-7 text-sm font-bold shadow-lg shadow-blue-500/20">
            <Link to="/predict">
              Try Live Prediction <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-7 text-sm font-semibold">
            <Link to="/dashboard">Explore Executive Dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Live KPIs Ticker Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="text-center p-3 border-r border-slate-100 dark:border-slate-800 last:border-none">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Analyzed Sessions
          </span>
          <div className="tabular-nums font-mono text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">
            {overview ? formatNumber(overview.total_sessions) : '—'}
          </div>
          <span className="text-[11px] text-slate-400">UCI Benchmark</span>
        </div>

        <div className="text-center p-3 border-r border-slate-100 dark:border-slate-800 last:border-none">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Baseline Conversion
          </span>
          <div className="tabular-nums font-mono text-3xl font-extrabold text-emerald-600 mt-1">
            {overview ? `${overview.conversion_rate}%` : '—'}
          </div>
          <span className="text-[11px] text-slate-400">
            {overview ? `${formatNumber(overview.buyers)} Buyers` : '—'}
          </span>
        </div>

        <div className="text-center p-3 border-r border-slate-100 dark:border-slate-800 last:border-none">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Champion ROC-AUC
          </span>
          <div className="tabular-nums font-mono text-3xl font-extrabold text-blue-600 mt-1">
            {championRoc}
          </div>
          <span className="text-[11px] text-slate-400">{championName} Architecture</span>
        </div>

        <div className="text-center p-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Inference Latency
          </span>
          <div className="tabular-nums font-mono text-3xl font-extrabold text-indigo-600 mt-1">
            &lt; 5ms
          </div>
          <span className="text-[11px] text-slate-400">REST API Sub-Second</span>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            A Complete Intelligence Suite for E-Commerce
          </h2>
          <p className="text-xs text-slate-500">
            From raw behavioral logs to executive strategy and automated inference
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="p-6 hover:shadow-md transition-shadow space-y-3">
            <div className="p-3 w-fit rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Live Intent Scoring
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Real-time purchase probability gauge calibrated to detect high-intent shoppers, tentative researchers, and bounce-prone sessions in milliseconds.
            </p>
            <Link to="/predict" className="inline-flex items-center text-xs font-bold text-blue-600 hover:gap-1.5 transition-all">
              Try Interactive Predictor →
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow space-y-3">
            <div className="p-3 w-fit rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Visitor Segmentation
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Unsupervised clustering separating casual browsers from deep researchers. Visualized in 2D PCA latent feature projections.
            </p>
            <Link to="/segments" className="inline-flex items-center text-xs font-bold text-teal-600 hover:gap-1.5 transition-all">
              View Segment Personas →
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow space-y-3">
            <div className="p-3 w-fit rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              SHAP Explainability
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Audit the exact feature contributions behind every decision. Transparent waterfalls eliminate black-box hesitation.
            </p>
            <Link to="/explain" className="inline-flex items-center text-xs font-bold text-indigo-600 hover:gap-1.5 transition-all">
              Inspect Feature Waterfall →
            </Link>
          </Card>
        </div>
      </div>

      {/* 4-Step How It Works Flow */}
      <div className="p-8 rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">
          How the Intelligence Pipeline Works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <span className="font-mono text-blue-600 font-extrabold text-sm">01</span>
            <div className="font-bold text-slate-800 dark:text-slate-200">Capture Signals</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Ingest clickstream events: page category counts, session durations, and bounce rates.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <span className="font-mono text-blue-600 font-extrabold text-sm">02</span>
            <div className="font-bold text-slate-800 dark:text-slate-200">Feature Engineering</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Derive reading velocity, product view ratio, and commercial PageValue intensity.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <span className="font-mono text-blue-600 font-extrabold text-sm">03</span>
            <div className="font-bold text-slate-800 dark:text-slate-200">Tree Inference</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              CatBoost model outputs probability with 85.3% recall on prospective buyers.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <span className="font-mono text-blue-600 font-extrabold text-sm">04</span>
            <div className="font-bold text-slate-800 dark:text-slate-200">Automated Action</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Trigger 1-click express checkout, personalized discounts, or exit-intent popups.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-8 pb-4 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          Smart E-Commerce Customer Intelligence & Intent Prediction System • Phase II Release
        </div>
        <div className="flex items-center gap-4">
          <Link to="/about" className="hover:text-slate-900 dark:hover:text-slate-200">
            Methodology
          </Link>
          <Link to="/models" className="hover:text-slate-900 dark:hover:text-slate-200">
            Leaderboard
          </Link>
          <Link to="/predict" className="hover:text-slate-900 dark:hover:text-slate-200">
            Predict
          </Link>
        </div>
      </footer>
    </div>
  );
};
