import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  percent: number;
  color?: string;
  size?: 'sm' | 'md';
  shimmer?: boolean;
  trackClassName?: string;
  barClassName?: string;
}

const SIZE_CLASSES = {
  sm: 'h-2',
  md: 'h-3',
};

/**
 * Pure presentational ProgressBar primitive — ZERO business logic or internal state.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  color,
  size = 'sm',
  shimmer = true,
  trackClassName,
  barClassName,
}) => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));

  return (
    <div
      className={cn(
        'w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden',
        SIZE_CLASSES[size],
        trackClassName,
      )}
    >
      <div
        className={cn(
          'h-full transition-all duration-500',
          shimmer && 'shimmer-bar',
          !color && 'bg-[#CBEAD8]',
          barClassName,
        )}
        style={{
          width: `${clamped}%`,
          ...(color ? { backgroundColor: color } : {}),
        }}
      />
    </div>
  );
};
