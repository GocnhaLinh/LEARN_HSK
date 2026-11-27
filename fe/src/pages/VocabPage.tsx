import React, { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { VocabBulkBar } from '@/features/vocab/components/VocabBulkBar';
import { VocabFilterToolbar } from '@/features/vocab/components/VocabFilterToolbar';
import { VocabHeaderBar } from '@/features/vocab/components/VocabHeaderBar';
import { VocabListCard } from '@/features/vocab/components/VocabListCard';
import { VocabStatsBar } from '@/features/vocab/components/VocabStatsBar';
import { VocabWordModal } from '@/features/vocab/components/VocabWordModal';
import {
  useAddVocab,
  useBackupJson,
  useBatchDeleteVocab,
  useBatchVocabStatus,
  useChangeVocabStatus,
  useDeleteVocab,
  useUpdateVocab,
  useVocab,
} from '@/features/vocab/hooks/useVocab';
import { useVocabFilter } from '@/features/vocab/hooks/useVocabFilter';
import { useVocabUiStore } from '@/features/vocab/stores/vocab-ui.store';
import type { VocabFormInput } from '@/features/vocab/types';
import { exportVocabCsv } from '@/features/vocab/utils/vocab-utils';
import { speakChinese } from '@/lib/speech-utils';
import { useToastStore } from '@/stores/toast.store';
import type { VocabStatus } from '@/types';

export const VocabPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, lessons } = useApp();
  const { data: vocab = [] } = useVocab();
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const { mutateAsync: addVocab } = useAddVocab();
  const { mutateAsync: updateVocab } = useUpdateVocab();
  const { mutate: changeStatus } = useChangeVocabStatus();
  const { mutate: batchStatus } = useBatchVocabStatus();
  const { mutate: deleteVocab } = useDeleteVocab();
  const { mutate: batchDelete } = useBatchDeleteVocab();
  const { exportBackupJson, importBackupJson } = useBackupJson();

  const filter = useVocabFilter(vocab, lessons);
  const filteredIds = useMemo(() => filter.filteredList.map((w) => w.id), [filter.filteredList]);
  const defaultModalLevel =
    filter.levelFilter !== 'all' ? Number(filter.levelFilter) || profile.focusLevel : profile.focusLevel;

  const goToPage = useCallback(
    (nextPage: number) => {
      useVocabUiStore.getState().setPage(Math.max(1, Math.min(filter.totalPages, nextPage)));
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    [filter.totalPages],
  );
  const handleSelectStatus = useCallback(
    (status: string) => filter.updateParam('status', status),
    [filter.updateParam],
  );
  const handleSpeak = useCallback((text: string, rate = 0.92) => {
    speakChinese(text, rate, (m) => useToastStore.getState().showToast(m, 'pink'));
  }, []);
  const handlePracticeChar = useCallback(
    (ch: string) => navigate(`/writing/hanzi/${encodeURIComponent(ch)}`),
    [navigate],
  );
  const handleOpenLessonFlashcard = useCallback(
    (lessonId: string) => navigate(`/flashcard/lesson/${encodeURIComponent(lessonId)}`),
    [navigate],
  );
  const handleChangeStatus = useCallback(
    (id: string, status: VocabStatus) => changeStatus({ id, status }),
    [changeStatus],
  );
  const handleOpenCourses = useCallback(
    () => navigate(`/courses/${defaultModalLevel}`),
    [navigate, defaultModalLevel],
  );
  const handleSaveModal = useCallback(
    async (data: VocabFormInput, editingId?: string) => {
      try {
        if (editingId) await updateVocab({ id: editingId, patch: data });
        else await addVocab(data);
      } catch {
        // Optimistic update already applied for offline mode
      }
    },
    [addVocab, updateVocab],
  );
  const handleExportCsv = useCallback(() => {
    if (!filter.filteredList.length) {
      useToastStore.getState().showToast('Không có từ vựng nào để xuất CSV.', 'pink');
      return;
    }
    exportVocabCsv(filter.filteredList, filter.levelFilter);
    useToastStore.getState().showToast(`Đã xuất ${filter.filteredList.length} từ ra file CSV!`, 'yellow');
  }, [filter.filteredList, filter.levelFilter]);

  return (
    <section className="space-y-4 sm:space-y-5">
      <VocabHeaderBar
        totalVocabCount={vocab.length}
        onExportCsv={handleExportCsv}
        onExportJson={exportBackupJson}
        onImportJson={importBackupJson}
      />

      <VocabStatsBar
        stats={filter.statusStats}
        statusFilter={filter.statusFilter}
        onSelectStatus={handleSelectStatus}
      />

      <VocabFilterToolbar
        searchInput={filter.searchInput}
        onSearchChange={filter.setSearchInput}
        levelFilter={filter.levelFilter}
        lessonFilter={filter.lessonFilter}
        sortBy={filter.sortBy}
        availableLessons={filter.availableLessons}
        filteredCount={filter.filteredList.length}
        safePage={filter.safePage}
        totalPages={filter.totalPages}
        hasActiveFilter={filter.hasActiveFilter}
        onUpdateParam={filter.updateParam}
        onClearAllFilters={filter.clearAllFilters}
        onOpenImportCourse={handleOpenCourses}
      />

      <VocabBulkBar
        filteredIds={filteredIds}
        onBulkStatus={(ids, status) => batchStatus({ ids, status })}
        onBulkDelete={batchDelete}
      />

      <VocabListCard
        listTopRef={listTopRef}
        totalVocabCount={vocab.length}
        filteredCount={filter.filteredList.length}
        pageItems={filter.pageItems}
        lessonTitleMap={filter.lessonTitleMap}
        safePage={filter.safePage}
        totalPages={filter.totalPages}
        startIdx={filter.startIdx}
        pageSize={filter.pageSize}
        pageNumbers={filter.pageNumbers}
        hasActiveFilter={filter.hasActiveFilter}
        onGoToPage={goToPage}
        onClearAllFilters={filter.clearAllFilters}
        onOpenCourses={handleOpenCourses}
        onSpeak={handleSpeak}
        onPracticeChar={handlePracticeChar}
        onOpenLessonFlashcard={handleOpenLessonFlashcard}
        onChangeStatus={handleChangeStatus}
        onDelete={deleteVocab}
      />

      <VocabWordModal defaultLevel={defaultModalLevel} onSave={handleSaveModal} />
    </section>
  );
};
