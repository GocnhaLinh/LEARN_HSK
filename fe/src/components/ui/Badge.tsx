import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'dark' | 'yellow' | 'pink' | 'mint' | 'lavender' | 'subtle' | 'custom';
export type BadgeSize = 'xs' | 'sm';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  dark: 'bg-[#111111] text-[#EFE078] border border-[#111111] rounded-[4px] whitespace-nowrap shrink-0',
  yellow: 'bg-[#EFE078] text-[#111111] t-badge',
  pink: 'bg-[#F4C2D7] text-[#111111] t-badge',
  mint: 'bg-[#CBEAD8] text-[#111111] t-badge',
  lavender: 'bg-[#DCD2F5] text-[#111111] t-badge',
  subtle: 'bg-[#F8F6F1] text-[#141414] border border-[#141414]/35 rounded-[4px] whitespace-nowrap shrink-0',
  custom: 'text-[#111111] t-badge',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-2.5 py-1 text-[11px]',
};

/**
 * Pure presentational Badge primitive — ZERO business logic or internal state.
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'yellow',
  size = 'sm',
  className,
  children,
  ...rest
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono font-bold',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
};
