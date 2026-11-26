import React from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'yellow'
  | 'pink'
  | 'mint'
  | 'lavender'
  | 'danger'
  | 'ghost';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: 't-btn bg-white text-[#111111] hover:bg-[#EFE078]',
  primary: 't-btn-black',
  yellow: 't-btn bg-[#EFE078] text-[#111111] hover:brightness-95',
  pink: 't-btn bg-[#F4C2D7] text-[#111111] hover:brightness-95',
  mint: 't-btn bg-[#CBEAD8] text-[#111111] hover:brightness-95',
  lavender: 't-btn bg-[#DCD2F5] text-[#111111] hover:brightness-95',
  danger: 't-btn bg-red-600 text-white border-red-700 hover:bg-red-700',
  ghost: 'bg-transparent border-transparent shadow-none hover:bg-black/5 rounded-lg transition',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] gap-1',
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-xs gap-1.5',
  lg: 'px-5 py-2.5 text-sm gap-2',
  icon: 'w-8 h-8 p-0',
};

/**
 * Pure presentational Button primitive — ZERO business logic or internal state.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'md',
      pill = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      type = 'button',
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center font-mono font-bold select-none disabled:opacity-45 disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          pill && '!rounded-full',
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
