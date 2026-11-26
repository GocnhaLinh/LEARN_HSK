import React from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'default' | 'flat' | 'hover' | 'banner';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: 't-card',
  flat: 't-card-flat',
  hover: 't-card t-card-hover',
  banner: 't-banner',
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3.5 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

/**
 * Pure presentational Card surface — ZERO business logic or internal state.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
