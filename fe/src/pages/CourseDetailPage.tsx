import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileUp,
  Layers,
  Loader2,
  PenTool,
  Search,
  Sparkles,
  Trophy,
  Volume2,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { COURSES_META } from '../data/defaults';
import { ExtractedExerciseRow, ExtractedVocabRow, VocabWord } from '../types';
import { parseCourseFile } from '../utils/docParser';
import { normalizeSearch, speakChinese } from '../utils/helpers';

export const CourseDetailPage: React.FC = () => {
  const { level: levelParam } = useParams();
  const navigate = useNavigate();
  const {
    lessons,
    vocab,
    exercises,
    scoreSummaries,
    bulkImportWords,
    submitCourseExercise,
    setWriteQuickPool,
    showToast,
  } = useApp();

  const level = Math.min(6, Math.max(1, Number(levelParam) || 5));
  const meta = COURSES_META.find((c) => c.level === level) || COURSES_META[4];
  const levelScore = scoreSummaries.find((s) => s.level === level);
  const courseExercises = useMemo(
    () => exercises.filter((ex) => ex.level === level),
    [exercises, level],
  );
  const [exFeedback, setExFeedback] = useState<
    Record<string, { picked: string; correct: boolean; explanation: string }>
  >({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [loadingText, setLoadingText] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 180;
      setScrolledDown((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [extractedPreview, setExtractedPreview] = useState<ExtractedVocabRow[]>([]);
  const [extractedExercises, setExtractedExercises] = useState<ExtractedExerciseRow[]>([]);
  const [autoGenerateExercises, setAutoGenerateExercises] = useState(true);
  const [lessonBaseName, setLessonBaseName] = useState('');
  const [splitSize, setSplitSize] = useState<number>(50);
  const [extractSearch, setExtractSearch] = useState('');

  const courseLessons = useMemo(
    () => lessons.filter((l) => l.level === level),
    [lessons, level],
  );
  const courseWords = useMemo(
    () => vocab.filter((w) => w.level === level),
    [vocab, level],
  );
  // Pre-group words by lessonId once (O(N)) instead of filtering inside each lesson card (O(L*N))
  const wordsByLesson = useMemo(() => {
    const map = new Map<string, VocabWord[]>();
    for (const w of courseWords) {
      const arr = map.get(w.lessonId);
      if (arr) arr.push(w);
      else map.set(w.lessonId, [w]);
    }
    return map;
  }, [courseWords]);

  // Collapse lessons past the first 2 by default so 26 lessons / 1,300 words don't flood the DOM
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});
  const isLessonExpanded = (lessonId: string, idx: number) =>
    lessonId in expandedLessons ? expandedLessons[lessonId] : idx < 2;
  const toggleLessonExpanded = (lessonId: string, idx: number) => {
    setExpandedLessons((prev) => ({
      ...prev,
      [lessonId]: !(lessonId in prev ? prev[lessonId] : idx < 2),
    }));
  };
  const setAllLessonsExpanded = (open: boolean) => {
    const next: Record<string, boolean> = {};
    courseLessons.forEach((l) => {
      next[l.id] = open;
    });
    setExpandedLessons(next);
  };

  const masteredCount = useMemo(
    () => courseWords.filter((w) => w.status === 'mastered').length,
    [courseWords],
  );
  const pct = courseWords.length ? Math.round((masteredCount / courseWords.length) * 100) : 0;

  const openPreview = (
    items: ExtractedVocabRow[],
    docExercises: ExtractedExerciseRow[],
    defaultName: string,
  ) => {
    setExtractedPreview(items);
    setExtractedExercises(docExercises);
    setLessonBaseName(defaultName);
    setExtractSearch('');
    setSplitSize(items.length > 60 ? 50 : items.length > 25 ? 25 : 0);
  };

  const handleFile = async (file: File) => {
    setLoadingText(`Đang đọc file "${file.name}"...`);
    try {
      const { words: extracted, exercises: docExercises } = await parseCourseFile(file, (msg) =>
        setLoadingText(msg),
      );
      setLoadingText(null);
      if (!extracted.length && !docExercises.length) {
        showToast('Không tìm thấy từ vựng tiếng Trung hoặc bài tập nào trong file này.', 'pink');
        return;
      }
      const baseName = file.name.replace(/\.(docx|pdf|txt)$/i, '');
      openPreview(extracted, docExercises, baseName);
      const exMsg = docExercises.length ? ` & ${docExercises.length} câu bài tập sẵn có` : '';
      showToast(`Đã trích xuất thành công ${extracted.length} từ${exMsg} từ file!`, 'yellow');
    } catch (err: any) {
      setLoadingText(null);
      showToast(`Lỗi đọc file: ${err?.message || 'Không thể phân tích tài liệu.'}`, 'pink');
    }
  };

  const updateExtractedField = <K extends keyof ExtractedVocabRow>(
    idx: number,
    field: K,
    value: ExtractedVocabRow[K],
  ) => {
    setExtractedPreview((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );
  };

  const toggleAllExtracted = (checked: boolean) => {
    setExtractedPreview((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const selectedCount = extractedPreview.filter((i) => i.selected).length;
  const lessonCountPreview =
    splitSize > 0 && selectedCount > 0
      ? Math.ceil(selectedCount / splitSize)
      : selectedCount > 0
        ? 1
        : 0;

  const filteredPreview = useMemo(() => {
    const q = normalizeSearch(extractSearch.trim());
    return extractedPreview
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => {
        if (!q) return true;
        return (
          row.hanzi.includes(q) ||
          normalizeSearch(row.pinyin).includes(q) ||
          normalizeSearch(row.meaning).includes(q)
        );
      });
  }, [extractedPreview, extractSearch]);

  const MAX_PREVIEW_ROWS = 80;
  const visiblePreview = filteredPreview.slice(0, MAX_PREVIEW_ROWS);

  const confirmInsert = async () => {
    const picked = extractedPreview.filter((r) => r.selected);
    if (!picked.length) {
      showToast('Hãy chọn ít nhất 1 từ vựng để chèn vào khóa học!', 'pink');
      return;
    }
    const baseTitle =
      lessonBaseName.trim() || `Giáo trình HSK ${level} (${new Date().toLocaleDateString('vi-VN')})`;
    await bulkImportWords({
      level,
      baseTitle,
      splitSize,
      picked,
      autoGenerateExercises,
      extractedExercises,
    });
    setExtractedPreview([]);
    setExtractedExercises([]);
  };

  const practiceLessonWriting = (lessonId: string) => {
    const lessonWords = vocab.filter((w) => w.lessonId === lessonId);
    const chars: string[] = [];
    lessonWords.forEach((w) => {
      Array.from(w.hanzi).forEach((ch) => {
        if (/[\u4e00-\u9fff]/.test(ch) && !chars.includes(ch)) chars.push(ch);
      });
    });
    if (chars.length) {
      setWriteQuickPool(chars.slice(0, 15));
      showToast('Đã nạp các chữ Hán trong bài vào bảng luyện viết!', 'yellow');
      navigate(`/writing/hanzi/${encodeURIComponent(chars[0])}`);
    } else {
      navigate('/writing/hanzi');
    }
  };

  return (
    <section className="space-y-6">
      {/* Back & Course Header Banner */}
      <div className="t-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="t-btn px-3.5 py-1.5 bg-white text-[#111111] font-mono text-xs font-bold flex items-center gap-1.5 hover:bg-[#EFE078]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách khóa học</span>
          </button>
          <span
            className="px-2.5 py-1 font-mono text-[11px] font-bold text-[#111111] t-badge"
            style={{ backgroundColor: meta.color }}
          >
            {meta.code} • {meta.badge}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
          <div>
            <h2 className="font-serif font-bold text-3xl">
              {meta.emoji} {meta.title}
            </h2>
            <p className="text-xs sm:text-sm opacity-75 mt-1">{meta.subtitle}</p>
          </div>
          <div className="w-full md:w-64 shrink-0">
            <div className="flex justify-between font-mono text-[11px] font-bold mb-1">
              <span>Tiến độ khóa học</span>
              <span>
                {pct}% ({masteredCount}/{courseWords.length} từ)
              </span>
            </div>
            <div className="h-3 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
              <div
                className="h-full shimmer-bar transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: meta.color }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden native file input — triggered directly from floating right FAB (no modal) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.pdf,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFile(file);
            window.setTimeout(() => {
              previewCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 60);
          }
          e.target.value = '';
        }}
      />

      {/* Inline parsing indicator & extracted preview (only appears after selecting a file) */}
      {(loadingText || extractedPreview.length > 0) && (
        <div ref={previewCardRef} className="t-card p-5 sm:p-6 space-y-4">
          {loadingText && (
            <div className="p-4 rounded-lg bg-[#EFE078]/60 border border-[#141414] font-mono text-xs font-bold flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{loadingText}</span>
            </div>
          )}

          {extractedPreview.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="font-mono text-[11px] font-bold uppercase block mb-1">
                    Tên bộ bài học nhập từ file:
                  </label>
                  <input
                    type="text"
                    value={lessonBaseName}
                    onChange={(e) => setLessonBaseName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-[1.5px] border-[#141414] rounded text-sm font-bold outline-none"
                    placeholder="VD: NEW HSK5 3.0"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="font-mono text-[11px] font-bold uppercase block mb-1">
                    Tự động chia bài học:
                  </label>
                  <select
                    value={splitSize}
                    onChange={(e) => setSplitSize(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#EFE078] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none"
                  >
                    <option value={25}>25 từ / bài (Gọn nhẹ)</option>
                    <option value={50}>50 từ / bài (Khuyên dùng)</option>
                    <option value={0}>Gộp chung 1 bài</option>
                  </select>
                </div>
                <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-1.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => toggleAllExtracted(true)}
                    className="t-btn px-2.5 py-2 bg-white text-[#111111] font-bold"
                  >
                    Chọn hết
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllExtracted(false)}
                    className="t-btn px-2.5 py-2 bg-white text-[#111111] font-bold"
                  >
                    Bỏ chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExtractedPreview([]);
                      setExtractedExercises([]);
                    }}
                    className="t-btn px-2.5 py-2 bg-[#F4C2D7] text-[#111111] font-bold"
                  >
                    Hủy
                  </button>
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#CBEAD8]/60 border border-[#141414] cursor-pointer select-none">
                <span className="font-mono text-xs font-bold text-[#111111]">
                  Tự động sinh bài tập (Điền từ từ câu ví dụ + Trắc nghiệm + Dịch câu) cho mỗi bài học
                  {extractedExercises.length > 0
                    ? ` (+ ${extractedExercises.length} bài tập đọc trực tiếp từ file)`
                    : ''}
                </span>
                <input
                  type="checkbox"
                  checked={autoGenerateExercises}
                  onChange={(e) => setAutoGenerateExercises(e.target.checked)}
                  className="w-4 h-4 accent-[#111111] shrink-0"
                />
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={extractSearch}
                  onChange={(e) => setExtractSearch(e.target.value)}
                  placeholder="Tìm nhanh trong danh sách từ vừa trích xuất..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#141414]/40 rounded font-mono text-xs outline-none focus:border-[#141414]"
                />
              </div>

              <div className="max-h-72 overflow-y-auto border-[1.5px] border-[#141414] rounded-lg bg-white divide-y divide-stone-200">
                {visiblePreview.map(({ row, idx }) => (
                  <div key={`${row.hanzi}_${idx}`} className="p-2.5 grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => updateExtractedField(idx, 'selected', e.target.checked)}
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
                        onChange={(e) => updateExtractedField(idx, 'pinyin', e.target.value)}
                        placeholder="Pinyin..."
                        className="w-full px-2 py-1 bg-[#F8F6F1] border border-[#141414]/30 rounded font-mono text-xs outline-none focus:border-[#141414]"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-6 space-y-1">
                      <input
                        type="text"
                        value={row.meaning}
                        onChange={(e) => updateExtractedField(idx, 'meaning', e.target.value)}
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
                    Đang hiển thị {MAX_PREVIEW_ROWS} / {filteredPreview.length} từ để mượt trình duyệt — toàn bộ{' '}
                    {selectedCount} từ được chọn sẽ được chèn đầy đủ vào MongoDB!
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="font-mono text-xs font-bold">
                  Đang chọn {selectedCount} / {extractedPreview.length} từ → sẽ tạo {lessonCountPreview} bài học
                  {autoGenerateExercises ? ` + bài tập tự động` : ''}
                </span>
                <button
                  type="button"
                  onClick={confirmInsert}
                  className="t-btn-black px-5 py-2.5 font-mono text-xs font-bold flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#EFE078]" />
                  <span>Lưu vào MongoDB {meta.code} (+30 XP)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COURSE EXERCISES & ĐIỂM THI ĐUA (MONGO COLLECTION HSK{level}) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            <h3 className="font-serif font-bold text-2xl">Bài tập &amp; Điểm thi đua {meta.code}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold">
            <span className="px-2.5 py-1 bg-[#EFE078] text-[#111111] t-badge flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              Điểm: {levelScore?.totalScore ?? 0}
            </span>
            <span className="px-2.5 py-1 bg-[#F4C2D7] text-[#111111] t-badge">
              Kỷ lục: {levelScore?.highScore ?? 0} • Combo {levelScore?.bestCombo ?? 0}x
            </span>
            <span className="px-2.5 py-1 bg-[#CBEAD8] text-[#111111] t-badge">
              Bài tập: {courseExercises.filter((e) => e.completed).length}/{courseExercises.length}
            </span>
          </div>
        </div>

        {courseExercises.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courseExercises.slice(0, 20).map((ex, idx) => {
              const fb = exFeedback[ex.id];
              return (
                <div key={ex.id} className="t-card p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 bg-[#111111] text-[#EFE078] font-mono text-[10px] font-bold rounded-[4px]">
                        BÀI TẬP #{idx + 1} • +{ex.xpReward} XP
                      </span>
                      {ex.completed && (
                        <span className="px-2 py-0.5 bg-[#CBEAD8] text-[#111111] font-mono text-[10px] font-bold t-badge flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif font-bold text-lg">{ex.title}</h4>
                    <p className="text-sm font-medium leading-relaxed">{ex.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {ex.options.map((opt) => {
                        const isPicked = fb?.picked === opt;
                        const btnBg = isPicked
                          ? fb.correct
                            ? 'bg-[#CBEAD8]'
                            : 'bg-[#F4C2D7]'
                          : 'bg-[#F8F6F1] hover:bg-[#EFE078]/60';
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={async (e) => {
                              const res = await submitCourseExercise(ex.id, opt, {
                                clientX: e.clientX,
                                clientY: e.clientY,
                              });
                              setExFeedback((prev) => ({
                                ...prev,
                                [ex.id]: {
                                  picked: opt,
                                  correct: res.correct,
                                  explanation: res.explanation,
                                },
                              }));
                            }}
                            className={`t-btn px-3 py-2 flex items-center justify-center text-center text-xs font-semibold text-[#111111] ${btnBg}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {fb && (
                    <div
                      className={`p-2.5 rounded-lg border border-[#141414] text-xs ${
                        fb.correct ? 'bg-[#CBEAD8]/60' : 'bg-[#F4C2D7]/60'
                      }`}
                    >
                      <span className="font-mono font-bold mr-1">
                        {fb.correct ? '✓ Chính xác!' : '✗ Chưa đúng.'}
                      </span>
                      <span>{fb.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LESSONS LIST INSIDE COURSE */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif font-bold text-2xl">Danh sách Bài học</h3>
          <div className="flex items-center gap-2 font-mono text-xs">
            {courseLessons.length > 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setAllLessonsExpanded(true)}
                  className="px-2.5 py-1 bg-white text-[#111111] border border-[#141414] rounded font-bold hover:bg-[#EFE078]"
                >
                  Mở tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setAllLessonsExpanded(false)}
                  className="px-2.5 py-1 bg-white text-[#111111] border border-[#141414] rounded font-bold hover:bg-[#F4C2D7]"
                >
                  Thu gọn
                </button>
              </>
            )}
            <span className="px-2.5 py-1 bg-[#EFE078] text-[#111111] font-mono text-xs font-bold t-badge">
              {courseLessons.length} bài học
            </span>
          </div>
        </div>

        {!courseLessons.length ? (
          <div className="t-card p-8 text-center space-y-3">
            <p className="font-mono text-xs opacity-70">
              Chưa có bài học nào trong {meta.code}. Hãy tải file <code>.PDF / .DOCX / .TXT</code> qua Smart Importer để tự động chia bài học!
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="t-btn px-4 py-2 bg-[#EFE078] text-[#111111] font-mono text-xs font-bold inline-flex items-center gap-1.5"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Chọn file .PDF / .DOCX / .TXT</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {courseLessons.map((lesson, idx) => {
              const lessonWords = wordsByLesson.get(lesson.id) || [];
              const expanded = isLessonExpanded(lesson.id, idx);
              return (
                <div key={lesson.id} className="t-card p-4 sm:p-5 space-y-4">
                  <div
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      expanded ? 'pb-3 border-b border-dashed border-current/20' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleLessonExpanded(lesson.id, idx)}
                      className="text-left flex-1 min-w-0 group"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-serif font-bold text-xl group-hover:underline">
                          {lesson.title}
                        </h4>
                        {lesson.fromFile && (
                          <span className="px-2 py-0.5 bg-[#EFE078] text-[#111111] font-mono text-[10px] font-bold t-badge">
                            📄 Từ file tải lên
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-[#F8F6F1] border border-[#141414]/30 rounded font-mono text-[10px] font-bold">
                          {lessonWords.length} từ
                        </span>
                      </div>
                      <p className="text-xs opacity-75 mt-1">
                        {lesson.desc || 'Danh sách từ vựng trong bài học.'}
                      </p>
                    </button>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => navigate(`/flashcard/lesson/${encodeURIComponent(lesson.id)}`)}
                        className="t-btn-black px-3.5 py-2 flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Ôn Flashcard bài này</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => practiceLessonWriting(lesson.id)}
                        className="t-btn px-3.5 py-2 bg-[#EFE078] text-[#111111] flex items-center gap-1.5 hover:brightness-95"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Luyện viết bài này</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLessonExpanded(lesson.id, idx)}
                        className="t-btn px-2.5 py-2 bg-white text-[#111111] flex items-center gap-1 hover:bg-[#F4C2D7]"
                        title={expanded ? 'Thu gọn danh sách từ' : 'Xem danh sách từ'}
                      >
                        {expanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">{expanded ? 'Thu gọn' : 'Xem từ'}</span>
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {lessonWords.length ? (
                        lessonWords.map((w) => (
                          <div
                            key={w.id}
                            className="p-3 rounded-xl bg-[#F8F6F1] border border-[#141414]/25 flex items-start justify-between gap-2 hover:bg-white transition"
                          >
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-serifcn text-xl font-bold text-[#141414]">
                                  {w.hanzi}
                                </span>
                                <span className="font-mono text-[11px] text-[#A62626] font-semibold">
                                  {w.pinyin}
                                </span>
                              </div>
                              <div className="text-xs font-semibold mt-0.5 truncate">{w.meaning}</div>
                              <div className="font-mono text-[10px] opacity-60 mt-0.5">
                                {w.hanviet || '—'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => speakChinese(w.hanzi, 0.92, (m) => showToast(m, 'pink'))}
                              className="t-btn-black w-7 h-7 flex items-center justify-center shrink-0"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-full text-xs font-mono opacity-60">
                          Chưa có từ vựng trong bài học này.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOATING UPLOAD FAB (OPENS FILE PICKER DIRECTLY, NO MODAL) */}
      <button
        type="button"
        onClick={() => {
          if (extractedPreview.length > 0) {
            previewCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            fileInputRef.current?.click();
          }
        }}
        title={`Tải giáo trình .PDF / .DOCX / .TXT vào ${meta.code}`}
        aria-label={`Tải giáo trình vào ${meta.code}`}
        className={`t-btn-black fixed right-4 sm:right-6 z-40 h-11 sm:h-12 px-3.5 sm:px-4 !rounded-full flex items-center gap-2 font-mono text-xs font-bold transition-all duration-300 ${
          scrolledDown ? 'bottom-[152px] xl:bottom-20' : 'bottom-24 xl:bottom-6'
        }`}
      >
        {loadingText ? (
          <Loader2 className="w-4 h-4 text-[#EFE078] animate-spin shrink-0" />
        ) : (
          <FileUp className="w-4 h-4 text-[#EFE078] shrink-0" />
        )}
        <span className="hidden sm:inline whitespace-nowrap">
          {extractedPreview.length > 0 ? `Xem ${selectedCount} từ đã đọc` : 'Tải giáo trình'}
        </span>
        {extractedPreview.length > 0 && (
          <span className="sm:hidden px-1.5 py-0.5 bg-[#EFE078] text-[#111111] rounded-full text-[10px] font-bold">
            {selectedCount}
          </span>
        )}
      </button>
    </section>
  );
};
