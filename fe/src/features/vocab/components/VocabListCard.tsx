import React, { useMemo } from 'react';
import { Button, EmptyState } from '@/components/ui';
import { VocabPagination } from '@/features/vocab/components/VocabPagination';
import { VocabRow } from '@/features/vocab/components/VocabRow';
import { useVocabUiStore } from '@/features/vocab/stores/vocab-ui.store';
import type { VocabStatus, VocabWord } from '@/types';

interface VocabListCardProps {
  listTopRef: React.RefObject<HTMLDivElement>;
  totalVocabCount: number;
  filteredCount: number;
  pageItems: VocabWord[];
  lessonTitleMap: Map<string, string>;
  safePage: number;
  totalPages: number;
  startIdx: number;
  pageSize: number;
  pageNumbers: Array<number | '...'>;
  hasActiveFilter: boolean;
  onGoToPage: (page: number) => void;
  onClearAllFilters: () => void;
  onOpenCourses: () => void;
  onSpeak: (text: string, rate?: number) => void;
  onPracticeChar: (char: string) => void;
  onOpenLessonFlashcard: (lessonId: string) => void;
  onChangeStatus: (id: string, status: VocabStatus) => void;
  onDelete: (id: string) => void;
}

export const VocabListCard: React.FC<VocabListCardProps> = ({
  listTopRef,
  totalVocabCount,
  filteredCount,
  pageItems,
  lessonTitleMap,
  safePage,
  totalPages,
  startIdx,
  pageSize,
  pageNumbers,
  hasActiveFilter,
  onGoToPage,
  onClearAllFilters,
  onOpenCourses,
  onSpeak,
  onPracticeChar,
  onOpenLessonFlashcard,
  onChangeStatus,
  onDelete,
}) => {
  const pageWordIds = useMemo(() => pageItems.map((w) => w.id), [pageItems]);
  const allOnPageSelected = useVocabUiStore(
    (s) => pageWordIds.length > 0 && pageWordIds.every((id) => s.selectedIds.has(id)),
  );

  return (
    <div ref={listTopRef} className="t-card overflow-hidden">
      {pageItems.length > 0 && (
        <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8F6F1] border-b border-[#141414]/15 flex items-center justify-between gap-2 font-mono text-[11px]">
          <label className="inline-flex items-center gap-2 cursor-pointer font-bold select-none">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={() =>
                useVocabUiStore.getState().toggleSelectPage(pageWordIds, allOnPageSelected)
              }
              className="w-4 h-4 accent-[#111111] cursor-pointer"
            />
            <span>
              Chọn trang này ({startIdx + 1}–{Math.min(startIdx + pageSize, filteredCount)} /{' '}
              {filteredCount})
            </span>
          </label>
          <span className="opacity-60 hidden sm:inline">
            Bấm vào từ để xem câu ví dụ song ngữ &amp; mẹo nhớ
          </span>
        </div>
      )}

      <div className="divide-y divide-current/15">
        {!pageItems.length ? (
          <EmptyState
            title={
              totalVocabCount === 0
                ? 'Kho từ đang trống'
                : 'Không tìm thấy từ vựng phù hợp với bộ lọc'
            }
            description={
              totalVocabCount === 0
                ? 'Hãy thêm từ thủ công hoặc mở Khóa học HSK để tải file giáo trình .PDF / .DOCX tự động trích xuất từ vựng.'
                : 'Thử đổi từ khóa tìm kiếm hoặc bấm "Xóa bộ lọc" để xem lại toàn bộ từ vựng.'
            }
            actions={
              hasActiveFilter ? (
                <Button variant="primary" onClick={onClearAllFilters}>
                  Xóa toàn bộ bộ lọc
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    onClick={() => useVocabUiStore.getState().openAddModal()}
                  >
                    + Thêm từ đầu tiên
                  </Button>
                  <Button variant="yellow" onClick={onOpenCourses}>
                    Tải file PDF / DOCX →
                  </Button>
                </>
              )
            }
          />
        ) : (
          pageItems.map((w) => (
            <VocabRow
              key={w.id}
              word={w}
              lessonTitle={lessonTitleMap.get(w.lessonId)}
              onSpeak={onSpeak}
              onPracticeChar={onPracticeChar}
              onOpenLessonFlashcard={onOpenLessonFlashcard}
              onChangeStatus={onChangeStatus}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <VocabPagination
        safePage={safePage}
        totalPages={totalPages}
        startIdx={startIdx}
        pageSize={pageSize}
        totalItems={filteredCount}
        pageNumbers={pageNumbers}
        onGoToPage={onGoToPage}
      />
    </div>
  );
};
