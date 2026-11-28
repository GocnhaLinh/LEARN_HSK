import { ArrowLeft, BookOpenCheck, GraduationCap } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui';
import { COURSES_META } from '@/data/defaults';
import { useCourses } from '@/features/courses/hooks/useCourses';
import { OfficialExamsTab } from '@/features/exams/components/OfficialExamsTab';
import { useExamImporterStore } from '@/features/exams/stores/exam-importer.store';
import { ExamResultView } from '@/features/exercises/components/ExamResultView';
import { ExamSetupPanel } from '@/features/exercises/components/ExamSetupPanel';
import { ExamTakingView } from '@/features/exercises/components/ExamTakingView';
import { useExamSession } from '@/features/exercises/hooks/useExamSession';
import { useExercisesQuery } from '@/features/exercises/hooks/useExercisesQuery';
import type { CourseMeta } from '@/types';

type StudioTab = 'practice' | 'official';

interface ModeSwitcherButtonsProps {
  activeTab: StudioTab;
  disabled: boolean;
  vertical?: boolean;
  onSwitch: (tab: StudioTab) => void;
}

const ModeSwitcherButtons: React.FC<ModeSwitcherButtonsProps> = ({
  activeTab,
  disabled,
  vertical = false,
  onSwitch,
}) => {
  const busyTitle = disabled ? 'Đang xử lý tải đề lên, vui lòng chờ hoàn tất...' : undefined;
  const baseBtn = vertical
    ? 'w-full px-2.5 py-2 text-[11px]'
    : 'px-3 py-1.5 text-xs';

  return (
    <div
      className={`${
        vertical ? 'flex flex-col p-1.5 shadow-[3px_3px_0px_#141414]' : 'inline-flex p-1 shadow-[2px_2px_0px_#141414]'
      } gap-1.5 rounded-xl border-2 border-[#141414] bg-white`}
    >
      <button
        type="button"
        disabled={disabled}
        title={busyTitle}
        onClick={() => onSwitch('practice')}
        className={`${baseBtn} rounded-lg border-[1.5px] font-mono font-bold inline-flex items-center gap-1.5 transition-all whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed ${
          activeTab === 'practice'
            ? 'bg-[#111111] text-[#EFE078] border-[#111111] shadow-[2px_2px_0px_#141414]'
            : 'bg-white text-[#141414] border-transparent hover:bg-[#F8F6F1] hover:border-[#141414]/35'
        }`}
      >
        <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Luyện dịch</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        title={busyTitle}
        onClick={() => onSwitch('official')}
        className={`${baseBtn} rounded-lg border-[1.5px] font-mono font-bold inline-flex items-center gap-1.5 transition-all whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed ${
          activeTab === 'official'
            ? 'bg-[#EFE078] text-[#111111] border-[#141414] shadow-[2px_2px_0px_#141414]'
            : 'bg-white text-[#141414] border-transparent hover:bg-[#F8F6F1] hover:border-[#141414]/35'
        }`}
      >
        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
        <span>Đề thi HSK</span>
      </button>
    </div>
  );
};

interface PracticeExercisesTabProps {
  level: number;
  meta: CourseMeta;
  onBackToCourse: () => void;
  onSessionActiveChange: (active: boolean) => void;
}

/** Mounted ONLY when the Practice tab is active so Official Exam tab never fetches 1,300 translation drills */
const PracticeExercisesTab: React.FC<PracticeExercisesTabProps> = ({
  level,
  meta,
  onBackToCourse,
  onSessionActiveChange,
}) => {
  const { data: lessons = [] } = useCourses();
  const courseLessons = useMemo(
    () => lessons.filter((l) => l.level === level),
    [lessons, level],
  );
  const { data: exercises = [], isLoading } = useExercisesQuery(level);
  const session = useExamSession(level, exercises);

  useEffect(() => {
    onSessionActiveChange(session.phase !== 'setup');
    return () => onSessionActiveChange(false);
  }, [session.phase, onSessionActiveChange]);

  if (session.phase === 'taking') {
    return (
      <ExamTakingView
        meta={meta}
        examLabel={session.activeExamLabel}
        questions={session.questions}
        answers={session.answers}
        flaggedIds={session.flaggedIds}
        currentIndex={session.currentIndex}
        viewMode={session.viewMode}
        elapsedSeconds={session.elapsedSeconds}
        remainingSeconds={session.remainingSeconds}
        answeredCount={session.answeredCount}
        unansweredCount={session.unansweredCount}
        flaggedCount={session.flaggedCount}
        confirmModal={session.confirmModal}
        onUpdateAnswer={session.updateAnswer}
        onToggleFlag={session.toggleFlag}
        onGoToQuestion={session.goToQuestion}
        onGoToFirstUnanswered={session.goToFirstUnanswered}
        onPrevQuestion={session.prevQuestion}
        onNextQuestion={session.nextQuestion}
        onChangeViewMode={session.setViewMode}
        onRequestSubmit={session.requestSubmit}
        onConfirmSubmit={session.confirmSubmit}
        onRequestExit={session.requestExit}
        onConfirmExit={session.confirmExit}
        onCloseConfirmModal={session.closeConfirmModal}
      />
    );
  }

  if (session.phase === 'result' && session.gradeResult) {
    return (
      <ExamResultView
        meta={meta}
        examLabel={session.activeExamLabel}
        gradeResult={session.gradeResult}
        elapsedSeconds={session.elapsedSeconds}
        isViewingHistory={session.isViewingHistory}
        reviewFilter={session.reviewFilter}
        onChangeReviewFilter={session.setReviewFilter}
        onRetryWrong={session.startRetryCurrentWrong}
        onStartNewRandomExam={session.startRandomExam}
        onBackToSetup={session.backToSetup}
        onBackToCourse={onBackToCourse}
      />
    );
  }

  return (
    <ExamSetupPanel
      meta={meta}
      totalBankCount={exercises.length}
      filteredCount={session.filteredPool.length}
      seenCount={session.validSeenIds.length}
      isLoading={isLoading && exercises.length === 0}
      config={session.config}
      lessons={courseLessons}
      lessonCounts={session.lessonCounts}
      typeCounts={session.typeCounts}
      wrongIdsCount={session.validWrongIds.length}
      history={session.history}
      activeDraft={session.activeDraftSummary}
      onBackToCourse={onBackToCourse}
      onUpdateConfig={session.updateConfig}
      onStartRandomExam={session.startRandomExam}
      onStartWrongBankExam={session.startWrongBankExam}
      onResumeDraft={session.resumeDraft}
      onDiscardDraft={session.discardDraft}
      onOpenHistoryAttempt={session.openHistoryAttempt}
      onClearHistory={session.handleClearHistory}
      onClearWrongBank={session.handleClearWrongBank}
      onClearSeenBank={session.handleClearSeenBank}
    />
  );
};

export const ExercisesPage: React.FC = () => {
  const { level: levelParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const level = Math.min(6, Math.max(1, Number(levelParam) || 5));
  const meta = COURSES_META.find((c) => c.level === level) || COURSES_META[4];

  const activeTab: StudioTab =
    searchParams.get('tab') === 'official' ? 'official' : 'practice';
  const defaultOpenImporter = searchParams.get('import') === '1';
  const [sessionActive, setSessionActive] = useState(false);
  const isImporterBusy = useExamImporterStore((s) => s.busyStage !== 'idle');

  const goBackToCourse = useCallback(() => {
    if (isImporterBusy) return;
    navigate(`/courses/${level}`);
  }, [isImporterBusy, navigate, level]);

  const switchTab = useCallback(
    (tab: StudioTab) => {
      if (isImporterBusy) return;
      setSessionActive(false);
      setSearchParams(tab === 'official' ? { tab: 'official' } : {}, { replace: true });
    },
    [isImporterBusy, setSearchParams],
  );

  const handleConsumedImportParam = useCallback(() => {
    setSearchParams({ tab: 'official' }, { replace: true });
  }, [setSearchParams]);

  return (
    <div className="space-y-4">
      {/* Top bar: Back button on Official tab; inline switcher only on narrow screens (<1420px) */}
      {!sessionActive && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 ${
            activeTab === 'practice' ? 'min-[1420px]:hidden' : ''
          }`}
        >
          {activeTab === 'official' ? (
            <Button
              variant="default"
              size="sm"
              disabled={isImporterBusy}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={goBackToCourse}
            >
              Quay lại {meta.code}
            </Button>
          ) : (
            <div />
          )}

          <div className="min-[1420px]:hidden">
            <ModeSwitcherButtons
              activeTab={activeTab}
              disabled={isImporterBusy}
              onSwitch={switchTab}
            />
          </div>
        </div>
      )}

      {/* Outer right-gutter floating switcher (>=1420px) */}
      {!sessionActive && (
        <aside className="hidden min-[1420px]:block fixed top-20 right-3 z-30 w-[144px]">
          <ModeSwitcherButtons
            activeTab={activeTab}
            disabled={isImporterBusy}
            vertical
            onSwitch={switchTab}
          />
        </aside>
      )}

      {/* Only mount the active tab so unused queries/hooks stay idle */}
      {activeTab === 'official' ? (
        <OfficialExamsTab
          level={level}
          meta={meta}
          defaultOpenImporter={defaultOpenImporter}
          onConsumedImportParam={handleConsumedImportParam}
          onSessionActiveChange={setSessionActive}
        />
      ) : (
        <PracticeExercisesTab
          level={level}
          meta={meta}
          onBackToCourse={goBackToCourse}
          onSessionActiveChange={setSessionActive}
        />
      )}
    </div>
  );
};
