import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  selectSize?: 'xs' | 'sm' | 'md';
}

const SIZE_CLASSES = {
  xs: 'px-2 py-1 text-[11px]',
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-xs',
};

/**
 * Pure presentational Select primitive — ZERO business logic or internal state.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ selectSize = 'md', className, children, ...rest }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'bg-[#F8F6F1] text-[#111111] border-[1.5px] border-[#141414] rounded font-mono font-bold outline-none cursor-pointer',
          SIZE_CLASSES[selectSize],
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = 'Select';
