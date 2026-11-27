import { Trash2 } from 'lucide-react';
import React from 'react';
import { Card } from '@/components/ui';
import { VOCAB_STATUS_LABELS } from '@/data/defaults';
import { useVocabUiStore } from '@/features/vocab/stores/vocab-ui.store';
import type { VocabStatus } from '@/types';

const BULK_STATUS_BUTTONS: ReadonlyArray<{
  status: VocabStatus;
  label: string;
  bgClass: string;
}> = [
  { status: 'mastered', label: `✓ ${VOCAB_STATUS_LABELS.mastered}`, bgClass: 'bg-[#CBEAD8]' },
  { status: 'learning', label: VOCAB_STATUS_LABELS.learning, bgClass: 'bg-[#EFE078]' },
  { status: 'review', label: VOCAB_STATUS_LABELS.review, bgClass: 'bg-[#F4C2D7]' },
];

interface VocabBulkBarProps {
  filteredIds: string[];
  onBulkStatus: (ids: string[], status: VocabStatus) => void;
  onBulkDelete: (ids: string[]) => void;
}

export const VocabBulkBar: React.FC<VocabBulkBarProps> = ({
  filteredIds,
  onBulkStatus,
  onBulkDelete,
}) => {
  const selectedIds = useVocabUiStore((s) => s.selectedIds);
  const confirmBulkDelete = useVocabUiStore((s) => s.confirmBulkDelete);
  const selectAllIds = useVocabUiStore((s) => s.selectAllIds);
  const clearSelection = useVocabUiStore((s) => s.clearSelection);
  const setConfirmBulkDelete = useVocabUiStore((s) => s.setConfirmBulkDelete);

  if (!selectedIds.size) return null;

  const ids = Array.from(selectedIds);

  return (
    <Card
      padding="none"
      className="p-3 bg-[#111111] text-white flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 bg-[#EFE078] text-[#111111] rounded font-bold">
          Đã chọn {selectedIds.size} từ
        </span>
        {selectedIds.size < filteredIds.length && (
          <button
            type="button"
            onClick={() => selectAllIds(filteredIds)}
            className="underline text-[#EFE078] hover:opacity-80"
          >
            Chọn tất cả {filteredIds.length} kết quả lọc
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {BULK_STATUS_BUTTONS.map(({ status, label, bgClass }) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              onBulkStatus(ids, status);
              clearSelection();
            }}
            className={`px-2.5 py-1 ${bgClass} text-[#111111] rounded font-bold hover:brightness-95`}
          >
            {label}
          </button>
        ))}

        {confirmBulkDelete ? (
          <button
            type="button"
            onClick={() => {
              onBulkDelete(ids);
              clearSelection();
            }}
            className="px-2.5 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700"
          >
            Xác nhận xóa {selectedIds.size} từ?
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmBulkDelete(true)}
            className="px-2.5 py-1 bg-red-500/20 text-red-200 border border-red-400/50 rounded font-bold inline-flex items-center gap-1 hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa</span>
          </button>
        )}

        <button
          type="button"
          onClick={clearSelection}
          className="px-2 py-1 bg-white/15 rounded hover:bg-white/25"
        >
          Bỏ chọn
        </button>
      </div>
    </Card>
  );
};
