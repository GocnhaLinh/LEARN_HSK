import { X } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';

export type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerBadge?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: ModalMaxWidth;
  className?: string;
  children: React.ReactNode;
}

const MAX_WIDTH_CLASSES: Record<ModalMaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

/**
 * Pure presentational Modal container — ZERO internal state or side effects.
 * Wire keyboard dismissal (e.g. `useEscapeKey(open, onClose)`) in the parent feature/hook.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  headerBadge,
  footer,
  maxWidth = 'xl',
  className,
  children,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          't-card w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto',
          MAX_WIDTH_CLASSES[maxWidth],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle || headerBadge) && (
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-current/15">
            <div className="min-w-0">
              {headerBadge && <div className="mb-1">{headerBadge}</div>}
              {subtitle && (
                <p className="font-mono text-[10px] uppercase opacity-60">{subtitle}</p>
              )}
              {title && <h3 className="font-serif font-bold text-xl">{title}</h3>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/5 transition shrink-0"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div>{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 pt-3 border-t border-dashed border-current/15">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
