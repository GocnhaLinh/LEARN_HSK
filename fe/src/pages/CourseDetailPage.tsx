import { ArrowLeft, FileUp, Loader2 } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, ProgressBar } from '@/components/ui';
import { COURSES_META } from '@/data/defaults';
import { ExamStudioLauncherCard } from '@/features/courses/components/ExamStudioLauncherCard';
import { ImportPreviewPanel } from '@/features/courses/components/ImportPreviewPanel';
import { LessonAccordionList } from '@/features/courses/components/LessonAccordionList';
import { useCourseImporter } from '@/features/courses/hooks/useCourseImporter';
import { useCourses } from '@/features/courses/hooks/useCourses';
import { useExercisesQuery } from '@/features/exercises/hooks/useExercisesQuery';
import { getLocalCourseExamStats } from '@/features/exercises/utils/exam-utils';
import { useVocab } from '@/features/vocab/hooks/useVocab';
import { useWritingStore } from '@/features/writing/stores/writing.store';
import { useScrollPast } from '@/hooks/useScrollPast';
import { speakChinese } from '@/lib/speech-utils';
import { useToastStore } from '@/stores/toast.store';

export const CourseDetailPage: React.FC = () => {
  const { level: levelParam } = useParams();
  const navigate = useNavigate();
  const level = Math.min(6, Math.max(1, Number(levelParam) || 5));
  const meta = COURSES_META.find((c) => c.level === level) || COURSES_META[4];

  const { data: lessons = [] } = useCourses();
  const { data: vocab = [] } = useVocab();
  const { data: courseExercises = [] } = useExercisesQuery(level);
  const localExamStats = useMemo(() => getLocalCourseExamStats(level), [level]);
  const scrolledDown = useScrollPast(180);
  const importer = useCourseImporter(level);

  const courseLessons = useMemo(() => lessons.filter((l) => l.level === level), [lessons, level]);
  const courseWords = useMemo(() => vocab.filter((w) => w.level === level), [vocab, level]);
  const masteredCount = useMemo(
    () => courseWords.filter((w) => w.status === 'mastered').length,
    [courseWords],
  );
  const pct = courseWords.length ? Math.round((masteredCount / courseWords.length) * 100) : 0;

  const handleOpenOfficialExams = useCallback(
    () => navigate(`/courses/${level}/exercises?tab=official&import=1`),
    [navigate, level],
  );
  const handleOpenExercises = useCallback(
    () => navigate(`/courses/${level}/exercises`),
    [navigate, level],
  );
  const handleOpenFlashcard = useCallback(
    (lessonId: string) => navigate(`/flashcard/lesson/${encodeURIComponent(lessonId)}`),
    [navigate],
  );
  const handleSpeakWord = useCallback((hanzi: string) => {
    speakChinese(hanzi, 0.92, (m) => useToastStore.getState().showToast(m, 'pink'));
  }, []);

  const handlePracticeWriting = useCallback(
    (lessonId: string) => {
      const chars: string[] = [];
      for (const w of courseWords) {
        if (w.lessonId !== lessonId) continue;
        for (const ch of Array.from(w.hanzi)) {
          if (/[\u4e00-\u9fff]/.test(ch) && !chars.includes(ch)) chars.push(ch);
        }
      }
      if (chars.length) {
        useWritingStore.getState().setWriteQuickPool(chars.slice(0, 15));
        useToastStore
          .getState()
          .showToast('Đã nạp các chữ Hán trong bài vào bảng luyện viết!', 'yellow');
        navigate(`/writing/hanzi/${encodeURIComponent(chars[0])}`);
      } else {
        navigate('/writing/hanzi');
      }
    },
    [courseWords, navigate],
  );

  return (
    <section className="space-y-6">
      <Card padding="none" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            size="sm"
            className="px-3.5 py-1.5"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate('/courses')}
          >
            Quay lại danh sách khóa học
          </Button>
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
            <ProgressBar percent={pct} color={meta.color} size="md" />
          </div>
        </div>
      </Card>

      <input
        ref={importer.fileInputRef}
        type="file"
        accept=".docx,.pdf,.txt"
        className="hidden"
        onChange={importer.handleFileInputChange}
      />

      <ImportPreviewPanel
        level={level}
        meta={meta}
        previewCardRef={importer.previewCardRef}
        loadingText={importer.loadingText}
        isSaving={importer.isSaving}
        draft={importer.draft}
        selectedCount={importer.selectedCount}
        selectedExerciseCount={importer.selectedExerciseCount}
        bilingualExampleCount={importer.bilingualExampleCount}
        lessonCountPreview={importer.lessonCountPreview}
        filteredPreview={importer.filteredPreview}
        onConfirmInsert={importer.confirmInsert}
      />

      <ExamStudioLauncherCard
        meta={meta}
        exerciseCount={courseExercises.length}
        localExamStats={localExamStats}
        onOpenOfficialExams={handleOpenOfficialExams}
        onOpenExercises={handleOpenExercises}
      />

      <LessonAccordionList
        meta={meta}
        courseLessons={courseLessons}
        courseWords={courseWords}
        onPickFile={importer.triggerFilePicker}
        onOpenFlashcard={handleOpenFlashcard}
        onPracticeWriting={handlePracticeWriting}
        onSpeakWord={handleSpeakWord}
      />

      {/* Floating Upload FAB — opens file picker directly without modal */}
      <button
        type="button"
        onClick={importer.openFilePickerOrScroll}
        title={`Tải giáo trình hoặc file bài tập .PDF / .DOCX / .TXT vào ${meta.code}`}
        aria-label={`Tải tài liệu vào ${meta.code}`}
        className={`t-btn-black fixed right-4 sm:right-6 z-40 h-11 sm:h-12 px-3.5 sm:px-4 !rounded-full flex items-center gap-2 font-mono text-xs font-bold transition-all duration-300 ${
          scrolledDown ? 'bottom-[152px] xl:bottom-20' : 'bottom-24 xl:bottom-6'
        }`}
      >
        {importer.loadingText ? (
          <Loader2 className="w-4 h-4 text-[#EFE078] animate-spin shrink-0" />
        ) : (
          <FileUp className="w-4 h-4 text-[#EFE078] shrink-0" />
        )}
        {importer.hasPreview && (
          <span className="sm:hidden px-1.5 py-0.5 bg-[#EFE078] text-[#111111] rounded-full text-[10px] font-bold">
            {importer.draft.extractedPreview.length > 0
              ? importer.selectedCount
              : importer.selectedExerciseCount}
          </span>
        )}
      </button>
    </section>
  );
};
