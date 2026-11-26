import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Pure presentational Textarea primitive — ZERO business logic or internal state.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-sm outline-none focus:bg-white transition-colors resize-y',
          className,
        )}
        {...rest}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
