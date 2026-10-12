import React, { useEffect, useState } from 'react';
import { Card } from './card';
import { InfoTooltip } from './tooltip';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import clsx from 'clsx';

interface KpiStatCardProps {
  title: string;
  value: string | number;
  numericRaw?: number;
  suffix?: string;
  delta?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  caption?: string;
  icon?: React.ReactNode;
  sparklineData?: number[];
  tooltipInfo?: string;
}

export const KpiStatCard: React.FC<KpiStatCardProps> = ({
  title,
  value,
  numericRaw,
  suffix = '',
  delta,
  caption,
  icon,
  sparklineData,
  tooltipInfo,
}) => {
  // Count-up animation on first load if numericRaw is provided
  const [displayValue, setDisplayValue] = useState<string | number>(
    numericRaw !== undefined ? 0 : value
  );

  useEffect(() => {
    if (numericRaw === undefined) {
      setDisplayValue(value);
      return;
    }

    let start = 0;
    const duration = 800; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + (numericRaw - start) * ease;

      if (Number.isInteger(numericRaw)) {
        setDisplayValue(Math.round(current).toLocaleString());
      } else {
        setDisplayValue(current.toFixed(2));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value, numericRaw]);

  const chartData = sparklineData?.map((v, i) => ({ i, v }));

  return (
    <Card className="p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          {tooltipInfo && <InfoTooltip content={tooltipInfo} />}
        </div>
        {icon && (
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="tabular-nums text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          {displayValue}
          {suffix && <span className="text-lg font-semibold ml-0.5">{suffix}</span>}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="w-20 h-9 opacity-80 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        {caption && (
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {caption}
          </span>
        )}

        {delta && (
          <span
            className={clsx(
              'inline-flex items-center font-semibold text-[11px] px-1.5 py-0.5 rounded ml-auto',
              delta.isPositive
                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400'
            )}
          >
            {delta.isPositive ? '↑' : '↓'} {delta.value}
            {delta.label && <span className="ml-1 opacity-75 font-normal">{delta.label}</span>}
          </span>
        )}
      </div>
    </Card>
  );
};
