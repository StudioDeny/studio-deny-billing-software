import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={clsx(
            'bg-[#F1F1F3] animate-pulse rounded-none border border-[#E7E7E9]',
            className || 'h-6 w-full'
          )}
        />
      ))}
    </>
  );
};
