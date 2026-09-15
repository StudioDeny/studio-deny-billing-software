import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="p-12 md:p-16 border border-[#CFCFD2] bg-[#FFFFFF] flex flex-col items-center justify-center text-center max-w-xl mx-auto my-6">
      {icon && <div className="text-[#888888] mb-4">{icon}</div>}
      <h4 className="font-display text-base md:text-lg font-bold uppercase tracking-tight text-[#0A0A0A] mb-2">
        {title}
      </h4>
      <p className="text-xs md:text-sm text-[#666666] mb-6 max-w-md font-sans">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          [ {actionLabel} ]
        </Button>
      )}
    </div>
  );
};
