import { useCallback, useMemo, useRef, useState } from 'react';
import { useBulkImportLessons } from '@/features/courses/hooks/useCourses';
import {
  EMPTY_IMPORTER_DRAFT,
  useCoursesUiStore,
} from '@/features/courses/stores/courses-ui.store';
import { parseCourseFile } from '@/features/courses/utils/doc-parser';
import { normalizeSearch } from '@/lib/search-utils';
import { useToastStore } from '@/stores/toast.store';

export function useCourseImporter(level: number) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const [loadingText, setLoadingText] = useState<string | null>(null);

  const draft = useCoursesUiStore((s) => s.importerDraftByLevel[level] ?? EMPTY_IMPORTER_DRAFT);
  const { mutateAsync: bulkImport, isPending: isSaving } = useBulkImportLessons();

  const handleFile = useCallback(
    async (file: File) => {
      setLoadingText(`Đang đọc file "${file.name}"...`);
      try {
        const { words, exercises } = await parseCourseFile(file, (msg) => setLoadingText(msg));
        setLoadingText(null);
        if (!words.length && !exercises.length) {
          useToastStore
            .getState()
            .showToast('Không tìm thấy từ vựng tiếng Trung hoặc bài tập nào trong file này.', 'pink');
          return;
        }
        const baseName = file.name.replace(/\.(docx|pdf|txt)$/i, '');
        useCoursesUiStore.getState().openImporterPreview(level, words, exercises, baseName);

        const toastMsg =
          words.length > 0 && exercises.length > 0
            ? `Đã trích xuất thành công ${words.length} từ & ${exercises.length} câu bài tập từ file!`
            : words.length > 0
              ? `Đã trích xuất thành công ${words.length} từ từ file!`
              : `Đã trích xuất thành công ${exercises.length} câu bài tập từ file!`;
        useToastStore.getState().showToast(toastMsg, 'yellow');
      } catch (err: unknown) {
        setLoadingText(null);
        const msg = err instanceof Error ? err.message : 'Không thể phân tích tài liệu.';
        useToastStore.getState().showToast(`Lỗi đọc file: ${msg}`, 'pink');
      }
    },
    [level],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFile(file);
        window.setTimeout(() => {
          previewCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      }
      e.target.value = '';
    },
    [handleFile],
  );

  const selectedCount = useMemo(
    () => draft.extractedPreview.filter((i) => i.selected).length,
    [draft.extractedPreview],
  );
  const selectedExerciseCount = useMemo(
    () => draft.extractedExercises.filter((e) => e.selected !== false).length,
    [draft.extractedExercises],
  );
  const bilingualExampleCount = useMemo(
    () =>
      draft.extractedPreview.filter((r) => r.selected && r.exampleVi?.trim() && r.exampleZh?.trim())
        .length,
    [draft.extractedPreview],
  );
  const lessonCountPreview =
    draft.splitSize > 0 && selectedCount > 0
      ? Math.ceil(selectedCount / draft.splitSize)
      : selectedCount > 0 || selectedExerciseCount > 0
        ? 1
        : 0;

  const filteredPreview = useMemo(() => {
    const q = normalizeSearch(draft.extractSearch.trim());
    return draft.extractedPreview
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => {
        if (!q) return true;
        return (
          row.hanzi.includes(q) ||
          normalizeSearch(row.pinyin).includes(q) ||
          normalizeSearch(row.meaning).includes(q)
        );
      });
  }, [draft.extractedPreview, draft.extractSearch]);

  const confirmInsert = useCallback(async () => {
    if (isSaving) return;
    const picked = draft.extractedPreview.filter((r) => r.selected);
    const pickedEx = draft.extractedExercises.filter((e) => e.selected !== false);
    if (!picked.length && !pickedEx.length) {
      useToastStore
        .getState()
        .showToast('Hãy chọn ít nhất 1 từ vựng hoặc 1 câu bài tập để lưu vào khóa học!', 'pink');
      return;
    }
    const baseTitle =
      draft.lessonBaseName.trim() ||
      (picked.length
        ? `Giáo trình HSK ${level} (${new Date().toLocaleDateString('vi-VN')})`
        : `Bộ bài tập HSK ${level} (${new Date().toLocaleDateString('vi-VN')})`);
    try {
      await bulkImport({
        level,
        baseTitle,
        splitSize: draft.splitSize,
        picked,
        autoGenerateExercises: draft.autoGenerateExercises,
        extractedExercises: pickedEx,
      });
      useCoursesUiStore.getState().clearImporterDraft(level);
    } catch {
      // Error toast already shown in useBulkImportLessons.onError
    }
  }, [bulkImport, draft, isSaving, level]);

  const openFilePickerOrScroll = useCallback(() => {
    if (draft.extractedPreview.length > 0 || draft.extractedExercises.length > 0) {
      previewCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      fileInputRef.current?.click();
    }
  }, [draft.extractedExercises.length, draft.extractedPreview.length]);

  const hasPreview = draft.extractedPreview.length > 0 || draft.extractedExercises.length > 0;

  return {
    fileInputRef,
    previewCardRef,
    loadingText,
    isSaving,
    draft,
    hasPreview,
    selectedCount,
    selectedExerciseCount,
    bilingualExampleCount,
    lessonCountPreview,
    filteredPreview,
    handleFileInputChange,
    confirmInsert,
    openFilePickerOrScroll,
    triggerFilePicker: useCallback(() => fileInputRef.current?.click(), []),
  };
}
