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
            'bg-[#D5D5D8] animate-pulse rounded-none border border-[#D5D5D8]',
            className || 'h-6 w-full'
          )}
        />
      ))}
    </>
  );
};
