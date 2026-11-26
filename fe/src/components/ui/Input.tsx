import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  wrapperClassName?: string;
}

/**
 * Pure presentational Input primitive — ZERO business logic or internal state.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightSlot, wrapperClassName, className, ...rest }, ref) => {
    const baseInputClass = cn(
      'w-full min-w-0 px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-sm outline-none focus:bg-white transition-colors',
      Boolean(leftIcon) && 'pl-9',
      Boolean(rightSlot) && 'pr-9',
      className,
    );

    if (!leftIcon && !rightSlot) {
      return <input ref={ref} className={baseInputClass} {...rest} />;
    }

    return (
      <div className={cn('relative w-full min-w-0', wrapperClassName)}>
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50 flex items-center">
            {leftIcon}
          </span>
        )}
        <input ref={ref} className={baseInputClass} {...rest} />
        {rightSlot && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
            {rightSlot}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
