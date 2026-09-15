import React from 'react';
import { getStatusTheme } from '../../utils/formatters';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  showDot = true,
}) => {
  const theme = getStatusTheme(status);
  const formattedText = status.replace(/_/g, ' ').toUpperCase();

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium tracking-wide uppercase border',
          theme.bg,
          theme.text,
          theme.border,
          className
        )
      )}
    >
      {showDot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full inline-block flex-shrink-0', theme.dot)}
        />
      )}
      <span>{formattedText}</span>
    </span>
  );
};
