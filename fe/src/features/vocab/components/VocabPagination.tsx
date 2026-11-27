import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui';

interface VocabPaginationProps {
  safePage: number;
  totalPages: number;
  startIdx: number;
  pageSize: number;
  totalItems: number;
  pageNumbers: Array<number | '...'>;
  onGoToPage: (page: number) => void;
}

export const VocabPagination: React.FC<VocabPaginationProps> = ({
  safePage,
  totalPages,
  startIdx,
  pageSize,
  totalItems,
  pageNumbers,
  onGoToPage,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="px-3.5 sm:px-4 py-3 bg-[#F8F6F1] border-t border-[#141414]/15 flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono text-xs">
      <span className="opacity-70 text-[11px]">
        Hiển thị <strong>{startIdx + 1}</strong>–
        <strong>{Math.min(startIdx + pageSize, totalItems)}</strong> trên{' '}
        <strong>{totalItems.toLocaleString('vi-VN')}</strong> từ
      </span>

      <div className="flex items-center gap-1 flex-wrap justify-center">
        <Button
          size="icon"
          disabled={safePage <= 1}
          onClick={() => onGoToPage(safePage - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pageNumbers.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-1.5 opacity-55">
              …
            </span>
          ) : (
            <Button
              key={p}
              size="xs"
              variant={p === safePage ? 'primary' : 'default'}
              onClick={() => onGoToPage(p)}
              className="min-w-[32px] h-8 px-2"
            >
              {p}
            </Button>
          ),
        )}

        <Button
          size="icon"
          disabled={safePage >= totalPages}
          onClick={() => onGoToPage(safePage + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
