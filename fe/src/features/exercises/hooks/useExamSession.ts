import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useExamLockStore } from '@/features/exercises/stores/exam-lock.store';
import type {
  ActiveDraftSummary,
  ExamConfig,
  ExamConfirmModal,
  ExamGradeSummary,
  ExamPhase,
  ExamQuestion,
  ExamViewMode,
  LocalExamAttempt,
  LocalExamDraft,
  ReviewFilter,
} from '@/features/exercises/types';
import {
  appendExamHistory,
  appendSeenQuestionIds,
  buildExamFromIds,
  buildRandomExam,
  clearExamDraft,
  clearExamHistory,
  clearSeenQuestionIds,
  clearWrongQuestionIds,
  filterExercises,
  gradeExam,
  readExamDraft,
  readExamHistory,
  readSeenQuestionIds,
  readWrongQuestionIds,
  rebuildExamFromDraft,
  rebuildGradeFromAttempt,
  saveExamDraft,
  updateWrongQuestionIds,
} from '@/features/exercises/utils/exam-utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { spawnConfetti } from '@/lib/fx-utils';
import { useToastStore } from '@/stores/toast.store';
import type { ExerciseItem } from '@/types';

const DEFAULT_CONFIG: ExamConfig = {
  questionCount: 20,
  lessonId: 'all',
  exerciseType: 'all',
  timeLimitMinutes: 0,
  prioritizeUnseen: true,
};

/**
 * Full 3-phase Typed-Input Mock Exam session controller (`setup` -> `taking` -> `result`).
 * - 100% typed-input (NO multiple choice); compares against expected answers only after submit.
 * - Strictly READ-ONLY against MongoDB (zero POST/PATCH writes).
 * - Persists local draft, history (with review records), seen coverage, and mistake bank in `localStorage`.
 */
export function useExamSession(level: number, pool: readonly ExerciseItem[]) {
  const showToast = useToastStore((s) => s.showToast);
  const setExamActive = useExamLockStore((s) => s.setExamActive);

  const [phase, setPhase] = useState<ExamPhase>('setup');
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_CONFIG);
  const [viewMode, setViewMode] = useState<ExamViewMode>('single');
  const [activeExamLabel, setActiveExamLabel] = useState('');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [gradeResult, setGradeResult] = useState<ExamGradeSummary | null>(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [confirmModal, setConfirmModal] = useState<ExamConfirmModal>(null);

  const [history, setHistory] = useState<LocalExamAttempt[]>(() => readExamHistory(level));
  const [wrongIds, setWrongIds] = useState<string[]>(() => readWrongQuestionIds(level));
  const [seenIds, setSeenIds] = useState<string[]>(() => readSeenQuestionIds(level));
  const [savedDraft, setSavedDraft] = useState<LocalExamDraft | null>(() => readExamDraft(level));

  const phaseRef = useRef(phase);
  const answersRef = useRef(answers);
  const flaggedRef = useRef(flaggedIds);
  const questionsRef = useRef(questions);
  const currentIndexRef = useRef(currentIndex);
  const elapsedRef = useRef(elapsedSeconds);
  const remainingRef = useRef(remainingSeconds);
  const labelRef = useRef(activeExamLabel);

  phaseRef.current = phase;
  answersRef.current = answers;
  flaggedRef.current = flaggedIds;
  questionsRef.current = questions;
  currentIndexRef.current = currentIndex;
  elapsedRef.current = elapsedSeconds;
  remainingRef.current = remainingSeconds;
  labelRef.current = activeExamLabel;

  // Write draft directly to localStorage without calling setSavedDraft while taking
  // (avoids unnecessary re-renders on every keystroke or 5s timer checkpoint)
  const persistDraftNow = useCallback(() => {
    const qs = questionsRef.current;
    if (!qs.length) return;
    saveExamDraft({
      level,
      examLabel: labelRef.current || `Bài kiểm tra ${qs.length} câu`,
      questionIds: qs.map((q) => q.id),
      answers: answersRef.current,
      flaggedIds: flaggedRef.current,
      currentIndex: currentIndexRef.current,
      elapsedSeconds: elapsedRef.current,
      remainingSeconds: remainingRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, [level]);

  // Reset session and reload local data when level route param changes
  useEffect(() => {
    setPhase('setup');
    setConfig(DEFAULT_CONFIG);
    setQuestions([]);
    setAnswers({});
    setFlaggedIds({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setRemainingSeconds(null);
    setGradeResult(null);
    setIsViewingHistory(false);
    setConfirmModal(null);
    setHistory(readExamHistory(level));
    setWrongIds(readWrongQuestionIds(level));
    setSeenIds(readSeenQuestionIds(level));
    setSavedDraft(readExamDraft(level));
  }, [level]);

  // Sync focus-lock state with global Layout store and always release on unmount
  useEffect(() => {
    setExamActive(phase === 'taking');
    return () => {
      setExamActive(false);
    };
  }, [phase, setExamActive]);

  // Debounced auto-save draft (400ms) so typing Chinese IME never blocks keystrokes
  useEffect(() => {
    if (phase !== 'taking' || !questions.length) return;
    const timer = window.setTimeout(() => {
      persistDraftNow();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [phase, questions, answers, flaggedIds, currentIndex, persistDraftNow]);

  // Warn before accidentally closing/reloading browser tab mid-exam
  useEffect(() => {
    if (phase !== 'taking') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      persistDraftNow();
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase, persistDraftNow]);

  // Intercept Browser Back button (`popstate`) while taking an exam
  useEffect(() => {
    if (phase !== 'taking') return;
    window.history.pushState({ hskExamGuard: true }, '', window.location.href);

    const handlePopState = () => {
      if (phaseRef.current !== 'taking') return;
      window.history.pushState({ hskExamGuard: true }, '', window.location.href);
      setConfirmModal('exit');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [phase]);

  const closeConfirmModal = useCallback(() => setConfirmModal(null), []);
  useEscapeKey(confirmModal !== null, closeConfirmModal);

  const finalizeExam = useCallback(
    (reason?: 'timeout') => {
      const currentQuestions = questionsRef.current;
      if (!currentQuestions.length) return;

      const summary = gradeExam(currentQuestions, answersRef.current);
      const attempt: LocalExamAttempt = {
        id: `exam_${Date.now()}`,
        level,
        label: labelRef.current || `Bài kiểm tra ${currentQuestions.length} câu`,
        total: summary.total,
        correctCount: summary.correctCount,
        wrongCount: summary.wrongCount,
        unansweredCount: summary.unansweredCount,
        score10: summary.score10,
        percent: summary.percent,
        elapsedSeconds: elapsedRef.current,
        completedAt: new Date().toISOString(),
        records: summary.items.map((item) => ({
          questionId: item.question.id,
          userAnswer: item.userAnswer,
          isCorrect: item.isCorrect,
        })),
      };

      // Only add gradable missed questions to the wrong-answer notebook
      const missedIds = summary.items
        .filter((item) => item.hasAnswerKey && !item.isCorrect)
        .map((item) => item.question.id);
      const masteredIds = summary.items
        .filter((item) => item.hasAnswerKey && item.isCorrect)
        .map((item) => item.question.id);

      const nextHistory = appendExamHistory(attempt);
      const nextWrongIds = updateWrongQuestionIds(level, missedIds, masteredIds);
      const nextSeenIds = appendSeenQuestionIds(
        level,
        currentQuestions.map((q) => q.id),
      );
      clearExamDraft(level);

      setHistory(nextHistory);
      setWrongIds(nextWrongIds);
      setSeenIds(nextSeenIds);
      setSavedDraft(null);
      setGradeResult(summary);
      setIsViewingHistory(false);
      setReviewFilter('all');
      setConfirmModal(null);
      setPhase('result');
      setExamActive(false);

      if (reason === 'timeout') {
        showToast('Hết giờ làm bài! Hệ thống đã tự động chấm điểm.', 'pink');
      } else if (summary.score10 === null) {
        showToast(
          `Đã nộp bài tự luận (${summary.answered}/${summary.total} câu đã nhập).`,
          'yellow',
        );
      } else if (summary.score10 >= 8) {
        spawnConfetti();
        showToast(
          `Xuất sắc! Bạn đạt ${summary.score10.toFixed(1)}/10 (${summary.correctCount}/${summary.gradableCount} câu đúng).`,
          'yellow',
        );
      } else {
        showToast(
          `Đã nộp bài: ${summary.score10.toFixed(1)}/10 (${summary.correctCount}/${summary.gradableCount} câu đúng).`,
          'dark',
        );
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [level, setExamActive, showToast],
  );

  // Live timer during 'taking' phase
  useEffect(() => {
    if (phase !== 'taking') return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next % 5 === 0) {
          window.setTimeout(() => persistDraftNow(), 0);
        }
        return next;
      });
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev === 61) {
          window.setTimeout(() => {
            showToast('Còn 1 phút nữa sẽ tự động nộp bài!', 'pink');
          }, 0);
        }
        if (prev <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => finalizeExam('timeout'), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, finalizeExam, persistDraftNow, showToast]);

  const filteredPool = useMemo(
    () => filterExercises(pool, config.lessonId, config.exerciseType),
    [pool, config.lessonId, config.exerciseType],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    pool.forEach((ex) => {
      if (config.lessonId !== 'all' && ex.lessonId !== config.lessonId) return;
      counts.all += 1;
      counts[ex.exerciseType] = (counts[ex.exerciseType] || 0) + 1;
    });
    return counts;
  }, [pool, config.lessonId]);

  const lessonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    pool.forEach((ex) => {
      counts.set(ex.lessonId, (counts.get(ex.lessonId) || 0) + 1);
    });
    return counts;
  }, [pool]);

  const poolIdSet = useMemo(() => new Set(pool.map((ex) => ex.id)), [pool]);
  const validWrongIds = useMemo(
    () => wrongIds.filter((id) => poolIdSet.has(id)),
    [poolIdSet, wrongIds],
  );
  const validSeenIds = useMemo(
    () => seenIds.filter((id) => poolIdSet.has(id)),
    [poolIdSet, seenIds],
  );

  const activeDraftSummary = useMemo<ActiveDraftSummary | null>(() => {
    if (!savedDraft || pool.length === 0) return null;
    const validIds = savedDraft.questionIds.filter((id) => poolIdSet.has(id));
    if (validIds.length === 0) return null;
    const answeredInDraft = validIds.reduce(
      (acc, id) => (savedDraft.answers?.[id]?.trim() ? acc + 1 : acc),
      0,
    );
    return {
      examLabel: savedDraft.examLabel,
      totalQuestions: validIds.length,
      answeredCount: answeredInDraft,
      elapsedSeconds: savedDraft.elapsedSeconds || 0,
      remainingSeconds: savedDraft.remainingSeconds,
      updatedAt: savedDraft.updatedAt,
    };
  }, [savedDraft, pool.length, poolIdSet]);

  const answeredCount = useMemo(
    () => questions.reduce((acc, q) => (answers[q.id]?.trim() ? acc + 1 : acc), 0),
    [questions, answers],
  );
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const flaggedCount = useMemo(
    () => questions.reduce((acc, q) => (flaggedIds[q.id] ? acc + 1 : acc), 0),
    [questions, flaggedIds],
  );

  const launchExam = useCallback(
    (picked: ExamQuestion[], label: string, timeLimitMinutes: number) => {
      if (!picked.length) {
        showToast('Không có câu hỏi nào khớp với bộ lọc hiện tại.', 'pink');
        return;
      }
      setQuestions(picked);
      setAnswers({});
      setFlaggedIds({});
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setRemainingSeconds(timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null);
      setGradeResult(null);
      setIsViewingHistory(false);
      setConfirmModal(null);
      setActiveExamLabel(label);
      setPhase('taking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [showToast],
  );

  const updateConfig = useCallback((patch: Partial<ExamConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const startRandomExam = useCallback(() => {
    const picked = buildRandomExam(pool, config, validSeenIds);
    const label =
      config.questionCount === 0
        ? `Đề tổng hợp (${picked.length} câu)`
        : `Đề ngẫu nhiên (${picked.length} câu)`;
    launchExam(picked, label, config.timeLimitMinutes);
  }, [pool, config, validSeenIds, launchExam]);

  const startWrongBankExam = useCallback(() => {
    const picked = buildExamFromIds(pool, validWrongIds);
    launchExam(picked, `Ôn câu hay sai (${picked.length} câu)`, config.timeLimitMinutes);
  }, [pool, validWrongIds, config.timeLimitMinutes, launchExam]);

  const startRetryCurrentWrong = useCallback(() => {
    if (!gradeResult) return;
    const missedIds = gradeResult.items
      .filter((item) => item.hasAnswerKey && !item.isCorrect)
      .map((item) => item.question.id);
    const picked = buildExamFromIds(pool, missedIds);
    launchExam(picked, `Làm lại câu sai (${picked.length} câu)`, 0);
  }, [gradeResult, pool, launchExam]);

  const resumeDraft = useCallback(() => {
    if (!savedDraft) return;
    const rebuilt = rebuildExamFromDraft(savedDraft, pool);
    if (!rebuilt.length) {
      clearExamDraft(level);
      setSavedDraft(null);
      showToast('Không thể khôi phục bài nháp cũ.', 'pink');
      return;
    }
    setQuestions(rebuilt);
    setAnswers(savedDraft.answers || {});
    setFlaggedIds(savedDraft.flaggedIds || {});
    setCurrentIndex(Math.min(savedDraft.currentIndex || 0, rebuilt.length - 1));
    setElapsedSeconds(savedDraft.elapsedSeconds || 0);
    setRemainingSeconds(savedDraft.remainingSeconds ?? null);
    setGradeResult(null);
    setIsViewingHistory(false);
    setConfirmModal(null);
    setActiveExamLabel(savedDraft.examLabel || `Đề đang làm (${rebuilt.length} câu)`);
    setPhase('taking');
    showToast('Đã khôi phục bài thi đang làm dở!', 'yellow');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [savedDraft, pool, level, showToast]);

  const discardDraft = useCallback(() => {
    clearExamDraft(level);
    setSavedDraft(null);
    showToast('Đã hủy bản nháp bài thi.', 'dark');
  }, [level, showToast]);

  const openHistoryAttempt = useCallback(
    (attempt: LocalExamAttempt) => {
      const rebuilt = rebuildGradeFromAttempt(attempt, pool);
      if (!rebuilt) {
        showToast(
          'Lượt thi cũ này chưa có dữ liệu chi tiết từng câu (chỉ hỗ trợ xem lại từ các lượt thi mới).',
          'dark',
        );
        return;
      }
      setActiveExamLabel(attempt.label);
      setElapsedSeconds(attempt.elapsedSeconds);
      setGradeResult(rebuilt);
      setIsViewingHistory(true);
      setReviewFilter('all');
      setPhase('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [pool, showToast],
  );

  const updateAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setFlaggedIds((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  const goToQuestion = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(questions.length - 1, index));
      setCurrentIndex(clamped);
      if (viewMode === 'all') {
        window.setTimeout(() => {
          const el = document.getElementById(`exam-q-${clamped}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 30);
      }
    },
    [questions.length, viewMode],
  );

  const goToFirstUnanswered = useCallback(() => {
    const firstIdx = questions.findIndex((q) => !answers[q.id]?.trim());
    if (firstIdx === -1) return;
    setConfirmModal(null);
    goToQuestion(firstIdx);
  }, [questions, answers, goToQuestion]);

  const prevQuestion = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const nextQuestion = useCallback(() => {
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
  }, [questions.length]);

  // IME-safe keyboard navigation (Ctrl+Enter next / Ctrl+Shift+Enter prev) — avoids browser Alt+Left Back clash
  useEffect(() => {
    if (phase !== 'taking' || confirmModal !== null || viewMode !== 'single') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          prevQuestion();
        } else if (currentIndex < questions.length - 1) {
          nextQuestion();
        } else {
          setConfirmModal('submit');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, confirmModal, viewMode, currentIndex, questions.length, prevQuestion, nextQuestion]);

  const requestSubmit = useCallback(() => setConfirmModal('submit'), []);
  const confirmSubmit = useCallback(() => finalizeExam(), [finalizeExam]);
  const requestExit = useCallback(() => setConfirmModal('exit'), []);

  const confirmExit = useCallback(() => {
    clearExamDraft(level);
    setSavedDraft(null);
    setConfirmModal(null);
    setPhase('setup');
    setExamActive(false);
    showToast('Đã thoát và hủy bài thi thử (chưa lưu kết quả).', 'dark');
  }, [level, setExamActive, showToast]);

  const backToSetup = useCallback(() => {
    setIsViewingHistory(false);
    setPhase('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearHistory = useCallback(() => {
    clearExamHistory(level);
    setHistory([]);
    showToast('Đã xóa lịch sử thi thử cục bộ.', 'dark');
  }, [level, showToast]);

  const handleClearWrongBank = useCallback(() => {
    clearWrongQuestionIds(level);
    setWrongIds([]);
    showToast('Đã xóa danh sách câu hay sai cục bộ.', 'dark');
  }, [level, showToast]);

  const handleClearSeenBank = useCallback(() => {
    clearSeenQuestionIds(level);
    setSeenIds([]);
    showToast('Đã đặt lại tiến độ độ phủ ngân hàng câu hỏi.', 'dark');
  }, [level, showToast]);

  return {
    phase,
    config,
    viewMode,
    activeExamLabel,
    questions,
    answers,
    flaggedIds,
    currentIndex,
    elapsedSeconds,
    remainingSeconds,
    gradeResult,
    isViewingHistory,
    reviewFilter,
    confirmModal,
    history,
    validWrongIds,
    validSeenIds,
    activeDraftSummary,
    filteredPool,
    typeCounts,
    lessonCounts,
    answeredCount,
    unansweredCount,
    flaggedCount,
    updateConfig,
    setViewMode,
    setReviewFilter,
    closeConfirmModal,
    startRandomExam,
    startWrongBankExam,
    startRetryCurrentWrong,
    resumeDraft,
    discardDraft,
    openHistoryAttempt,
    updateAnswer,
    toggleFlag,
    goToQuestion,
    goToFirstUnanswered,
    prevQuestion,
    nextQuestion,
    requestSubmit,
    confirmSubmit,
    requestExit,
    confirmExit,
    backToSetup,
    handleClearHistory,
    handleClearWrongBank,
    handleClearSeenBank,
  };
}
