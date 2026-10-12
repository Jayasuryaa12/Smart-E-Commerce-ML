import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card';
import { InfoTooltip } from './tooltip';
import { Button } from './button';
import { Table as TableIcon, BarChart3, Download } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  infoTooltip?: string;
  howToRead?: string;
  onExportCsv?: () => void;
  tableDataFallback?: React.ReactNode;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  infoTooltip,
  howToRead,
  onExportCsv,
  tableDataFallback,
  children,
  headerAction,
  className,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <CardTitle>{title}</CardTitle>
            {(infoTooltip || howToRead) && (
              <InfoTooltip
                content={
                  <div className="space-y-1">
                    {infoTooltip && <p className="font-medium">{infoTooltip}</p>}
                    {howToRead && (
                      <p className="text-[11px] text-slate-300 border-t border-slate-700/80 pt-1 mt-1">
                        <span className="font-semibold text-blue-400">How to read: </span>
                        {howToRead}
                      </p>
                    )}
                  </div>
                }
              />
            )}
          </div>
          {subtitle && <CardDescription className="mt-1">{subtitle}</CardDescription>}
        </div>

        <div className="flex items-center gap-2">
          {headerAction}

          {tableDataFallback && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
              className="h-8 px-2 text-xs text-slate-600 dark:text-slate-300"
              title={viewMode === 'chart' ? 'View as accessible table' : 'View chart'}
              aria-label={viewMode === 'chart' ? 'Switch to table view' : 'Switch to chart view'}
            >
              {viewMode === 'chart' ? (
                <>
                  <TableIcon className="w-3.5 h-3.5 mr-1" />
                  Table
                </>
              ) : (
                <>
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  Chart
                </>
              )}
            </Button>
          )}

          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              className="h-8 px-2 text-xs text-slate-600 dark:text-slate-300"
              title="Export data as CSV"
              aria-label="Export data as CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {viewMode === 'table' && tableDataFallback ? tableDataFallback : children}
      </CardContent>
    </Card>
  );
};
