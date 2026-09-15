import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface MetricBlockProps {
  label: string;
  value: string | number;
  subValue?: string;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  action?: React.ReactNode;
}

export const MetricBlock: React.FC<MetricBlockProps> = ({
  label,
  value,
  subValue,
  subtext,
  trend,
  className,
  action,
}) => {
  const displaySub = subtext || subValue;
  return (
    <div
      className={twMerge(
        clsx(
          'p-5 md:p-6 bg-white border border-[#CFCFD2] flex flex-col justify-between transition-colors hover:border-[#0A0A0A]',
          className
        )
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest-editorial text-[#666666]">
          {label}
        </span>
        {action && <div>{action}</div>}
      </div>

      <div>
        <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#0A0A0A]">
          {value}
        </div>

        {(displaySub || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={clsx(
                  'font-mono text-[11px] font-medium px-1.5 py-0.5 border',
                  trend.isPositive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                )}
              >
                {trend.value}
              </span>
            )}
            {displaySub && <span className="text-[#888888] font-mono text-[11px]">{displaySub}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
