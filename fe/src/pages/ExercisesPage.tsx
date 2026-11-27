import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { COURSES_META } from '@/data/defaults';
import { ExamResultView } from '@/features/exercises/components/ExamResultView';
import { ExamSetupPanel } from '@/features/exercises/components/ExamSetupPanel';
import { ExamTakingView } from '@/features/exercises/components/ExamTakingView';
import { useExamSession } from '@/features/exercises/hooks/useExamSession';
import { useExercisesQuery } from '@/features/exercises/hooks/useExercisesQuery';

export const ExercisesPage: React.FC = () => {
  const { level: levelParam } = useParams();
  const navigate = useNavigate();
  const { lessons } = useApp();

  const level = Math.min(6, Math.max(1, Number(levelParam) || 5));
  const meta = COURSES_META.find((c) => c.level === level) || COURSES_META[4];

  const courseLessons = useMemo(
    () => lessons.filter((l) => l.level === level),
    [lessons, level],
  );

  const { data: exercises = [], isLoading } = useExercisesQuery(level);
  const session = useExamSession(level, exercises);

  const goBackToCourse = () => navigate(`/courses/${level}`);

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
        onBackToCourse={goBackToCourse}
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
      onBackToCourse={goBackToCourse}
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
