import { Loader2, Search, Sparkles } from 'lucide-react';
import React from 'react';
import { Badge, Button, Input, Select } from '@/components/ui';
import { useCoursesUiStore } from '@/features/courses/stores/courses-ui.store';
import type { CourseImporterDraft } from '@/features/courses/types';
import type { CourseMeta, ExtractedVocabRow } from '@/types';

const MAX_PREVIEW_ROWS = 80;

interface ImportPreviewPanelProps {
  level: number;
  meta: CourseMeta;
  previewCardRef: React.RefObject<HTMLDivElement>;
  loadingText: string | null;
  isSaving: boolean;
  draft: CourseImporterDraft;
  selectedCount: number;
  selectedExerciseCount: number;
  bilingualExampleCount: number;
  lessonCountPreview: number;
  filteredPreview: Array<{ row: ExtractedVocabRow; idx: number }>;
  onConfirmInsert: () => void;
}

export const ImportPreviewPanel: React.FC<ImportPreviewPanelProps> = ({
  level,
  meta,
  previewCardRef,
  loadingText,
  isSaving,
  draft,
  selectedCount,
  selectedExerciseCount,
  bilingualExampleCount,
  lessonCountPreview,
  filteredPreview,
  onConfirmInsert,
}) => {
  const { extractedPreview, extractedExercises, autoGenerateExercises, lessonBaseName, splitSize, extractSearch } =
    draft;
  const hasItems = extractedPreview.length > 0 || extractedExercises.length > 0;
  if (!loadingText && !hasItems) return null;

  const store = useCoursesUiStore.getState();
  const visiblePreview = filteredPreview.slice(0, MAX_PREVIEW_ROWS);
  const visibleExercises = extractedExercises.slice(0, MAX_PREVIEW_ROWS);

  return (
    <div ref={previewCardRef} className="t-card p-5 sm:p-6 space-y-4">
      {loadingText && (
        <div className="p-4 rounded-lg bg-[#EFE078]/60 border border-[#141414] font-mono text-xs font-bold flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </div>
      )}

      {hasItems && (
        <div className="space-y-4">
          {extractedPreview.length === 0 && extractedExercises.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="pink" size="sm">
                FILE BÀI TẬP RIÊNG • {selectedExerciseCount} câu tự nhập (0 từ vựng)
              </Badge>
              <span className="font-mono text-[11px] opacity-75">
                Sẽ lưu trực tiếp vào <code>HSK{level}.exercises</code> (có thể chỉnh sửa câu hỏi
                &amp; đáp án trước khi lưu)
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className={extractedPreview.length > 0 ? 'md:col-span-5' : 'md:col-span-8'}>
              <label className="font-mono text-[11px] font-bold uppercase block mb-1">
                {extractedPreview.length > 0
                  ? 'Tên bộ bài học nhập từ file:'
                  : 'Tên bộ bài tập nhập từ file:'}
              </label>
              <Input
                value={lessonBaseName}
                onChange={(e) => store.patchImporterDraft(level, { lessonBaseName: e.target.value })}
                className="bg-white font-bold"
                placeholder={
                  extractedPreview.length > 0
                    ? 'VD: NEW HSK5 3.0'
                    : 'VD: Bài tập dịch câu HSK 5 — Đề 1'
                }
              />
            </div>

            {extractedPreview.length > 0 && (
              <div className="md:col-span-3">
                <label className="font-mono text-[11px] font-bold uppercase block mb-1">
                  Tự động chia bài học:
                </label>
                <Select
                  value={splitSize}
                  onChange={(e) =>
                    store.patchImporterDraft(level, { splitSize: Number(e.target.value) })
                  }
                  className="w-full bg-[#EFE078]"
                >
                  <option value={25}>25 từ / bài (Gọn nhẹ)</option>
                  <option value={50}>50 từ / bài (Khuyên dùng)</option>
                  <option value={0}>Gộp chung 1 bài</option>
                </Select>
              </div>
            )}

            <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-1.5">
              <Button size="sm" onClick={() => store.toggleAllExtracted(level, true)}>
                Chọn hết
              </Button>
              <Button size="sm" onClick={() => store.toggleAllExtracted(level, false)}>
                Bỏ chọn
              </Button>
              <Button variant="pink" size="sm" onClick={() => store.clearImporterDraft(level)}>
                Hủy
              </Button>
            </div>
          </div>

          {extractedPreview.length > 0 && (
            <>
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#CBEAD8]/60 border border-[#141414] cursor-pointer select-none">
                <span className="font-mono text-xs font-bold text-[#111111]">
                  Chuyển các câu ví dụ thành bài tập tự nhập tiếng Trung (chỉ hiện tiếng Việt, ẩn
                  chữ Hán khi làm bài)
                  {bilingualExampleCount > 0
                    ? ` — phát hiện ${bilingualExampleCount} câu ví dụ song ngữ`
                    : ''}
                  {selectedExerciseCount > 0
                    ? ` (+ ${selectedExerciseCount} câu bài tập trích riêng)`
                    : ''}
                </span>
                <input
                  type="checkbox"
                  checked={autoGenerateExercises}
                  onChange={(e) =>
                    store.patchImporterDraft(level, { autoGenerateExercises: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#111111] shrink-0"
                />
              </label>

              <Input
                value={extractSearch}
                onChange={(e) => store.patchImporterDraft(level, { extractSearch: e.target.value })}
                placeholder="Tìm nhanh trong danh sách từ vừa trích xuất..."
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="bg-white py-1.5 border-[#141414]/40 font-mono text-xs focus:border-[#141414]"
              />

              <div className="max-h-72 overflow-y-auto border-[1.5px] border-[#141414] rounded-lg bg-white divide-y divide-stone-200">
                {visiblePreview.map(({ row, idx }) => (
                  <div
                    key={`${row.hanzi}_${idx}`}
                    className="p-2.5 grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) =>
                          store.updatePreviewField(level, idx, 'selected', e.target.checked)
                        }
                        className="w-4 h-4 accent-[#111111]"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2 font-serifcn text-lg font-bold text-[#141414]">
                      {row.hanzi}
                    </div>
                    <div className="col-span-4 sm:col-span-3">
                      <input
                        type="text"
                        value={row.pinyin}
                        onChange={(e) =>
                          store.updatePreviewField(level, idx, 'pinyin', e.target.value)
                        }
                        placeholder="Pinyin..."
                        className="w-full px-2 py-1 bg-[#F8F6F1] border border-[#141414]/30 rounded font-mono text-xs outline-none focus:border-[#141414]"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-6 space-y-1">
                      <input
                        type="text"
                        value={row.meaning}
                        onChange={(e) =>
                          store.updatePreviewField(level, idx, 'meaning', e.target.value)
                        }
                        placeholder="Nghĩa tiếng Việt..."
                        className="w-full px-2 py-1 bg-[#F8F6F1] border border-[#141414]/30 rounded text-xs outline-none focus:border-[#141414]"
                      />
                      {row.exampleZh && (
                        <div className="font-serifcn text-[11px] opacity-75 truncate">
                          VD: {row.exampleZh}
                          {row.exampleVi ? ` — ${row.exampleVi}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredPreview.length > MAX_PREVIEW_ROWS && (
                  <div className="p-3 text-center font-mono text-[11px] bg-[#EFE078]/40 font-bold">
                    Đang hiển thị {MAX_PREVIEW_ROWS} / {filteredPreview.length} từ để mượt trình
                    duyệt — toàn bộ {selectedCount} từ được chọn sẽ được chèn đầy đủ vào MongoDB!
                  </div>
                )}
              </div>
            </>
          )}

          {extractedExercises.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase opacity-75">
                  Danh sách bài tập trích từ file ({selectedExerciseCount}/
                  {extractedExercises.length} câu)
                </span>
                <span className="font-mono text-[10px] opacity-60">
                  Cột trái: Đề bài hiển thị • Cột phải: Đáp án đối chiếu (để trống nếu không có)
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto border-[1.5px] border-[#141414] rounded-lg bg-white divide-y divide-stone-200">
                {visibleExercises.map((ex, idx) => (
                  <div
                    key={`ex_prev_${idx}`}
                    className="p-2.5 grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        checked={ex.selected !== false}
                        onChange={(e) =>
                          store.updateExerciseField(level, idx, 'selected', e.target.checked)
                        }
                        className="w-4 h-4 accent-[#111111]"
                      />
                    </div>
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={ex.question}
                        onChange={(e) =>
                          store.updateExerciseField(level, idx, 'question', e.target.value)
                        }
                        placeholder="Nội dung đề bài..."
                        className="w-full px-2 py-1.5 bg-[#F8F6F1] border border-[#141414]/30 rounded text-xs outline-none focus:border-[#141414]"
                      />
                    </div>
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={ex.correctAnswer}
                        onChange={(e) =>
                          store.updateExerciseField(level, idx, 'correctAnswer', e.target.value)
                        }
                        placeholder="Đáp án đối chiếu (tiếng Trung / kết quả)..."
                        className="w-full px-2 py-1.5 bg-[#CBEAD8]/30 border border-[#141414]/30 rounded font-serifcn text-xs outline-none focus:border-[#141414]"
                      />
                    </div>
                  </div>
                ))}
                {extractedExercises.length > MAX_PREVIEW_ROWS && (
                  <div className="p-3 text-center font-mono text-[11px] bg-[#EFE078]/40 font-bold">
                    Đang hiển thị {MAX_PREVIEW_ROWS} / {extractedExercises.length} câu — toàn bộ{' '}
                    {selectedExerciseCount} câu được chọn sẽ được lưu đầy đủ vào MongoDB!
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="font-mono text-xs font-bold">
              {selectedCount > 0
                ? `Đang chọn ${selectedCount} từ → ${lessonCountPreview} bài học${
                    autoGenerateExercises
                      ? ` + ${bilingualExampleCount || 'tự sinh'} bài tập tự nhập`
                      : ''
                  }${selectedExerciseCount > 0 ? ` + ${selectedExerciseCount} câu từ file` : ''}`
                : `Đang chọn ${selectedExerciseCount} câu bài tập tự nhập (không kèm từ vựng)`}
            </span>
            <Button
              variant="primary"
              disabled={isSaving}
              className="px-5 py-2.5 gap-2"
              leftIcon={
                isSaving ? (
                  <Loader2 className="w-4 h-4 text-[#EFE078] animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#EFE078]" />
                )
              }
              onClick={onConfirmInsert}
            >
              {isSaving ? 'Đang lưu...' : `Lưu vào MongoDB ${meta.code} (+30 XP)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
