import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Pure presentational EmptyState primitive — ZERO business logic or internal state.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div className={cn('p-8 sm:p-10 text-center space-y-3', className)}>
      {icon && <div className="flex justify-center opacity-45">{icon}</div>}
      <h3 className="font-serif font-bold text-lg sm:text-xl">{title}</h3>
      {description && (
        <p className="font-mono text-xs opacity-65 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {actions && <div className="flex flex-wrap justify-center gap-2 pt-1">{actions}</div>}
    </div>
  );
};
