import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Layers,
  Pencil,
  PenTool,
  Trash2,
  Volume2,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { VOCAB_STATUS_LABELS } from '@/data/defaults';
import { useVocabUiStore } from '@/features/vocab/stores/vocab-ui.store';
import { useConfirmStore } from '@/stores/confirm.store';
import type { VocabStatus, VocabWord } from '@/types';

const STATUS_SELECT_BG: Record<VocabStatus, string> = {
  mastered: 'bg-[#CBEAD8]',
  learning: 'bg-[#EFE078]',
  review: 'bg-[#F4C2D7]',
  new: 'bg-[#F8F6F1]',
};

const STATUS_ORDER: ReadonlyArray<VocabStatus> = ['mastered', 'learning', 'review', 'new'];

interface VocabRowProps {
  word: VocabWord;
  lessonTitle?: string;
  onSpeak: (text: string, rate?: number) => void;
  onPracticeChar: (char: string) => void;
  onOpenLessonFlashcard: (lessonId: string) => void;
  onChangeStatus: (id: string, status: VocabStatus) => void;
  onDelete: (id: string) => void;
}

export const VocabRow: React.FC<VocabRowProps> = React.memo(
  ({
    word,
    lessonTitle,
    onSpeak,
    onPracticeChar,
    onOpenLessonFlashcard,
    onChangeStatus,
    onDelete,
  }) => {
    const selected = useVocabUiStore((s) => s.selectedIds.has(word.id));
    const expanded = useVocabUiStore((s) => s.expandedId === word.id);

    const uniqueHanziChars = useMemo(
      () => Array.from(new Set(Array.from(word.hanzi).filter((ch) => /[\u4e00-\u9fff]/.test(ch)))),
      [word.hanzi],
    );
    const firstChar = uniqueHanziChars[0] || Array.from(word.hanzi)[0] || '';
    const hasRichExample =
      (word.exampleZh && word.exampleZh.trim() !== word.hanzi.trim()) ||
      (word.exampleVi && word.exampleVi.trim() !== word.meaning.trim());

    const toggleExpand = () => useVocabUiStore.getState().toggleExpand(word.id);

    return (
      <div
        className={`transition-colors ${
          selected ? 'bg-[#EFE078]/25' : 'hover:bg-black/[0.02]'
        }`}
      >
        <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-start md:items-center">
          {/* Col 1-4: Checkbox + Hanzi + Pinyin + Badges */}
          <div className="md:col-span-4 flex items-center md:items-start gap-2.5 min-w-0">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => useVocabUiStore.getState().toggleSelect(word.id)}
              aria-label={`Chọn từ ${word.hanzi}`}
              className="md:mt-1.5 w-4 h-4 accent-[#111111] cursor-pointer shrink-0"
            />
            <button
              type="button"
              onClick={toggleExpand}
              className="text-left min-w-0 flex-1 group flex items-center justify-between gap-2 md:block"
              title="Bấm để xem ví dụ & chi tiết"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                <span className="inline-block px-2 py-0.5 rounded-lg bg-[#EFE078]/50 border-[1.5px] border-[#141414] shadow-[2px_2px_0px_#141414] font-serifcn text-[24px] sm:text-[26px] font-extrabold leading-tight text-[#111111] group-hover:bg-[#EFE078] transition-colors">
                  {word.hanzi}
                </span>
                <span className="font-mono text-xs sm:text-[13px] font-bold text-[#A62626] break-all">
                  {word.pinyin}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end md:justify-start gap-1.5 md:mt-1.5 shrink-0">
                <span className="px-1.5 py-0.5 bg-[#111111] text-[#EFE078] rounded-[4px] font-mono text-[10px] font-bold whitespace-nowrap">
                  HSK {word.level}
                </span>
                {word.hanviet && word.hanviet !== 'TỪ GIÁO TRÌNH' && (
                  <span className="px-1.5 py-0.5 bg-[#F8F6F1] border border-[#141414]/40 rounded-[4px] font-mono text-[10px] font-bold text-[#141414] whitespace-nowrap">
                    {word.hanviet}
                  </span>
                )}
                {word.pos && (
                  <span className="font-mono text-[10px] opacity-60 whitespace-nowrap">
                    {word.pos}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Col 5-8: Vietnamese meaning + English + lesson tag */}
          <div className="md:col-span-4 min-w-0 pl-6 md:pl-0 cursor-pointer" onClick={toggleExpand}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 md:block">
              <div className="text-sm font-semibold leading-snug text-[#141414]">
                {word.meaning}
              </div>
              {word.english && (
                <div className="font-mono text-[11px] opacity-65 md:mt-0.5 truncate">
                  EN: {word.english}
                </div>
              )}
            </div>
            {lessonTitle && (
              <div className="inline-flex items-center gap-1 font-mono text-[10px] opacity-60 mt-0.5 md:mt-1 max-w-full">
                <BookOpen className="w-3 h-3 shrink-0" />
                <span className="truncate">{lessonTitle}</span>
              </div>
            )}
          </div>

          {/* Col 9-12: Actions */}
          <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-1.5 pl-6 md:pl-0 pt-2 md:pt-0 border-t border-dashed border-[#141414]/15 md:border-0">
            <div className="flex items-center gap-1.5 flex-1 md:flex-initial min-w-0">
              <button
                type="button"
                onClick={() => onSpeak(word.hanzi, 0.92)}
                className="t-btn-black w-8 h-8 flex items-center justify-center shrink-0"
                title="Nghe phát âm"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              {firstChar && (
                <button
                  type="button"
                  onClick={() => onPracticeChar(firstChar)}
                  className="t-btn w-8 h-8 bg-white text-[#111111] flex items-center justify-center shrink-0 hover:bg-[#EFE078]"
                  title={`Luyện viết chữ "${firstChar}"`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                </button>
              )}
              <select
                value={word.status}
                onChange={(e) => onChangeStatus(word.id, e.target.value as VocabStatus)}
                aria-label={`Trạng thái từ ${word.hanzi}`}
                className={`h-8 flex-1 md:flex-initial min-w-0 px-2 border-[1.5px] border-[#141414] rounded-md font-mono text-[11px] font-bold text-[#111111] outline-none cursor-pointer ${
                  STATUS_SELECT_BG[word.status] || 'bg-[#F8F6F1]'
                }`}
              >
                {STATUS_ORDER.map((st) => (
                  <option key={st} value={st}>
                    {VOCAB_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => useVocabUiStore.getState().openEditModal(word)}
                className="t-btn w-8 h-8 bg-white text-[#111111] flex items-center justify-center shrink-0 hover:bg-[#DCD2F5]"
                title="Chỉnh sửa từ"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  useConfirmStore.getState().openConfirm({
                    title: 'Xác nhận xóa từ vựng?',
                    message: (
                      <p>
                        Bạn có chắc muốn xóa từ{' '}
                        <strong className="font-serifcn text-base">{word.hanzi}</strong> (
                        {word.meaning}) khỏi kho từ không?
                      </p>
                    ),
                    confirmLabel: 'Xóa từ này',
                    onConfirm: () => onDelete(word.id),
                  })
                }
                className="w-8 h-8 rounded-md flex items-center justify-center text-red-700 hover:bg-red-50 transition shrink-0"
                title="Xóa từ vựng"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={toggleExpand}
                className="w-7 h-8 rounded-md flex items-center justify-center opacity-65 hover:opacity-100 hover:bg-black/5 transition shrink-0"
                title={expanded ? 'Thu gọn' : 'Xem ví dụ & chi tiết'}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded rich bilingual detail */}
        {expanded && (
          <div className="px-4 pb-4 pt-1 pl-10 sm:pl-11 space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#F8F6F1] border border-[#141414]/25 space-y-2.5">
              {hasRichExample ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase opacity-60">
                      Ví dụ ngữ cảnh
                    </span>
                    {word.exampleZh && (
                      <button
                        type="button"
                        onClick={() => onSpeak(word.exampleZh, 0.88)}
                        className="t-btn-black px-2 py-0.5 font-mono text-[10px] font-bold inline-flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Nghe câu</span>
                      </button>
                    )}
                  </div>
                  {word.exampleZh && (
                    <p className="font-serifcn text-sm sm:text-base font-medium leading-relaxed text-[#141414]">
                      {word.exampleZh}
                    </p>
                  )}
                  {word.exampleVi && (
                    <p className="text-xs opacity-80 italic leading-relaxed">{word.exampleVi}</p>
                  )}
                </div>
              ) : (
                <p className="font-mono text-[11px] opacity-60">
                  Chưa có câu ví dụ riêng — bạn có thể bấm nút <strong>Sửa</strong> để bổ sung ví
                  dụ.
                </p>
              )}

              {word.note && (
                <div className="pt-2 border-t border-dashed border-[#141414]/20">
                  <span className="font-mono text-[10px] font-bold uppercase opacity-60 block mb-0.5">
                    Ghi chú / Mẹo nhớ
                  </span>
                  <p className="text-xs opacity-85 leading-relaxed">{word.note}</p>
                </div>
              )}

              <div className="pt-2 border-t border-dashed border-[#141414]/20 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase opacity-60">
                    Đồ nét từng chữ:
                  </span>
                  {uniqueHanziChars.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => onPracticeChar(ch)}
                      className="px-2 py-0.5 bg-white border border-[#141414] rounded font-serifcn text-sm font-bold hover:bg-[#EFE078] transition"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                {word.lessonId && (
                  <button
                    type="button"
                    onClick={() => onOpenLessonFlashcard(word.lessonId)}
                    className="t-btn px-2.5 py-1 bg-[#EFE078] text-[#111111] font-mono text-[10px] font-bold inline-flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Ôn Flashcard bài này</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

VocabRow.displayName = 'VocabRow';
