import React from 'react';
import { motion } from 'framer-motion';

interface GaugeProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  size = 180,
  strokeWidth = 14,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // semi-circle: 180 deg
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // Determine color based on calibrated risk tiers
  let color = '#EF4444'; // Red (<35%)
  let statusText = 'Low Purchase Intent';
  let tierBadge = 'Bounce Risk';

  if (clampedValue >= 70) {
    color = '#10B981'; // Emerald (>=70%)
    statusText = 'High Purchase Intent';
    tierBadge = 'High Intent';
  } else if (clampedValue >= 35) {
    color = '#F59E0B'; // Amber (35-70%)
    statusText = 'Moderate Purchase Intent';
    tierBadge = 'Moderate';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size / 2 + 30 }}>
        <svg
          width={size}
          height={size / 2 + strokeWidth}
          viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
          className="overflow-visible"
        >
          {/* Background track arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-slate-800"
            strokeLinecap="round"
          />

          {/* Calibrated Threshold Markers */}
          <line
            x1={size / 2 + radius * Math.cos(Math.PI * (1 - 0.35))}
            y1={size / 2 - radius * Math.sin(Math.PI * (1 - 0.35))}
            x2={size / 2 + (radius + 6) * Math.cos(Math.PI * (1 - 0.35))}
            y2={size / 2 - (radius + 6) * Math.sin(Math.PI * (1 - 0.35))}
            stroke="#94A3B8"
            strokeWidth="2"
          />
          <line
            x1={size / 2 + radius * Math.cos(Math.PI * (1 - 0.7))}
            y1={size / 2 - radius * Math.sin(Math.PI * (1 - 0.7))}
            x2={size / 2 + (radius + 6) * Math.cos(Math.PI * (1 - 0.7))}
            y2={size / 2 - (radius + 6) * Math.sin(Math.PI * (1 - 0.7))}
            stroke="#94A3B8"
            strokeWidth="2"
          />

          {/* Animated filled value arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="tabular-nums text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {clampedValue.toFixed(1)}%
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
            Probability
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {statusText}
        </span>
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
          {tierBadge}
        </span>
      </div>
    </div>
  );
};
