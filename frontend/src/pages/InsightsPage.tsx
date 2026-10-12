import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ConversionInsightItem, ActionableRecommendationItem } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import {
  Lightbulb,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  Download,
  ShieldAlert,
  Target,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const InsightsPage: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const { data: insightsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['business-insights'],
    queryFn: api.getInsights,
  });

  if (isError) {
    return <ErrorState onRetry={() => refetch()} message="Unable to load strategic business insights." />;
  }

  const convInsights: ConversionInsightItem[] = insightsData?.data?.conversion_insights || [];
  const recs: ActionableRecommendationItem[] = insightsData?.data?.actionable_recommendations || [];
  const modelSummary = insightsData?.data?.model_summary;

  const copyExecutiveBrief = () => {
    const brief = `# Executive Strategy Brief: E-Commerce Customer Intelligence & Intent Prediction
Generated: ${new Date().toLocaleDateString()}
Champion Model: ${modelSummary?.top_model || 'CatBoost'} (F1: ${modelSummary?.top_f1 || '0.6715'}, ROC-AUC: ${modelSummary?.top_roc_auc || '0.9352'})

## 1. Evidence-Based Quantitative Insights
${convInsights.map((c) => `- **${c.category}** (${c.metric}): ${c.finding}\n  *Action:* ${c.action}`).join('\n\n')}

## 2. Actionable Strategic Recommendations
${recs.map((r) => `### ${r.Pillar}: ${r.Recommendation} [Impact: ${r.Impact}]
- **Evidence:** ${r.Evidence}
- **Strategy:** ${r.Strategy}`).join('\n\n')}
`;

    navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Action Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Business Insights & Strategy
            <Badge variant="default" className="text-[10px] font-bold">
              Executive Briefing
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Data-backed commercial recommendations translating machine learning findings into concrete Conversion Rate Optimization (CRO) and retention initiatives.
          </p>
        </div>

        <Button
          onClick={copyExecutiveBrief}
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Copy Executive Brief (Markdown)
            </>
          )}
        </Button>
      </div>

      {/* Strategic Pillars Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-blue-600" />
          Strategic Optimization Pillars
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recs.map((rec, idx) => (
              <Card key={idx} className="p-5 hover:shadow-md transition-shadow space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {rec.Pillar}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {rec.Recommendation}
                    </h3>
                  </div>
                  <Badge
                    variant={rec.Impact === 'High' ? 'danger' : 'warning'}
                    className="text-[10px] font-bold uppercase"
                  >
                    {rec.Impact} Impact
                  </Badge>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs">
                  <span className="font-semibold text-slate-500">Evidence Signal: </span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {rec.Evidence}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <b>Action Strategy:</b> {rec.Strategy}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quantitative Findings Cards */}
      <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          Evidence-Based Behavioral Findings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {convInsights.map((item, idx) => (
            <Card key={idx} className="p-4 border-l-4 border-l-emerald-600 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {item.category}
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {item.metric}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.finding}
              </p>

              <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-lg">
                <b>Recommended CRO Action:</b> {item.action}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
