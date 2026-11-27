import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useExamLockStore } from '@/features/exercises/stores/exam-lock.store';
import type {
  ExamSectionKey,
  LocalOfficialExamAttempt,
  LocalOfficialExamDraft,
  OfficialExam,
  OfficialExamGradeResult,
  OfficialExamMode,
  OfficialSessionPhase,
} from '@/features/exams/types';
import {
  appendOfficialExamHistory,
  clearOfficialExamDraft,
  clearOfficialExamHistory,
  flattenExamQuestions,
  getActiveSectionsForMode,
  getDurationMinutesForMode,
  gradeOfficialExam,
  loadAllOfficialExamDrafts,
  loadOfficialExamDraft,
  loadOfficialExamHistory,
  saveOfficialExamDraft,
} from '../utils/official-exam-grading';

export function useOfficialExamSession(level: number, exam: OfficialExam | null) {
  const { showToast } = useApp();
  const setExamActive = useExamLockStore((s) => s.setExamActive);

  const [phase, setPhase] = useState<OfficialSessionPhase>('idle');
  const [mode, setMode] = useState<OfficialExamMode>('full');
  const [strictAudio, setStrictAudio] = useState(true);
  const [activeSection, setActiveSection] = useState<ExamSectionKey>('listening');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [initialAudioTimeSec, setInitialAudioTimeSec] = useState(0);
  const [confirmModal, setConfirmModal] = useState<'submit' | 'exit' | null>(null);
  const [gradeResult, setGradeResult] = useState<OfficialExamGradeResult | null>(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [history, setHistory] = useState<LocalOfficialExamAttempt[]>(() =>
    loadOfficialExamHistory(level),
  );
  const [draftsByExamId, setDraftsByExamId] = useState<Record<string, LocalOfficialExamDraft>>(
    () => loadAllOfficialExamDrafts(),
  );

  // Track live audio position in a ref so playback updates cause ZERO React re-renders
  const audioTimeRef = useRef(0);

  const refreshDrafts = useCallback(() => {
    setDraftsByExamId(loadAllOfficialExamDrafts());
  }, []);

  useEffect(() => {
    setHistory(loadOfficialExamHistory(level));
    refreshDrafts();
  }, [level, refreshDrafts]);

  const flatQuestions = useMemo(
    () => (exam ? flattenExamQuestions(exam, mode) : []),
    [exam, mode],
  );

  const answeredCount = useMemo(
    () => flatQuestions.filter((f) => Boolean((answers[f.question.number] || '').trim())).length,
    [flatQuestions, answers],
  );

  const flaggedCount = useMemo(
    () => flatQuestions.filter((f) => Boolean(flagged[f.question.number])).length,
    [flatQuestions, flagged],
  );

  // Lock Layout Navbar / BottomDock while actively taking official exam
  useEffect(() => {
    const active = phase === 'taking';
    setExamActive(active);
    return () => setExamActive(false);
  }, [phase, setExamActive]);

  // Browser reload & Back button guard during exam
  useEffect(() => {
    if (phase !== 'taking') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.history.pushState({ officialExamLock: true }, '', window.location.href);
    const onPopState = () => {
      window.history.pushState({ officialExamLock: true }, '', window.location.href);
      setConfirmModal('exit');
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [phase]);

  // Latest state ref for debounced draft persistence & timer auto-submit
  const stateRef = useRef({
    exam,
    mode,
    strictAudio,
    activeSection,
    answers,
    flagged,
    elapsedSeconds,
    remainingSeconds,
  });
  stateRef.current = {
    exam,
    mode,
    strictAudio,
    activeSection,
    answers,
    flagged,
    elapsedSeconds,
    remainingSeconds,
  };

  const persistDraftNow = useCallback(() => {
    const s = stateRef.current;
    if (!s.exam) return;
    saveOfficialExamDraft({
      examId: s.exam.id,
      level: s.exam.level,
      mode: s.mode,
      strictAudio: s.strictAudio,
      activeSection: s.activeSection,
      answers: s.answers,
      flagged: s.flagged,
      elapsedSeconds: s.elapsedSeconds,
      remainingSeconds: s.remainingSeconds,
      audioTimeSec: audioTimeRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const reportAudioTime = useCallback((sec: number) => {
    audioTimeRef.current = Math.max(0, Math.floor(sec));
  }, []);

  // Debounced draft save (400ms) while taking
  useEffect(() => {
    if (phase !== 'taking' || !exam) return;
    const timer = window.setTimeout(persistDraftNow, 400);
    return () => window.clearTimeout(timer);
  }, [phase, exam, answers, flagged, activeSection, persistDraftNow]);

  // Flush draft on pagehide
  useEffect(() => {
    if (phase !== 'taking') return;
    const flush = () => persistDraftNow();
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [phase, persistDraftNow]);

  const finishAndGrade = useCallback(
    (autoSubmitted = false) => {
      const s = stateRef.current;
      if (!s.exam) return;
      const result = gradeOfficialExam(s.exam, s.mode, s.answers);
      const sectionScores: Record<string, number> = {};
      result.sections.forEach((sec) => {
        sectionScores[sec.key] = sec.score100;
      });

      const attempt: LocalOfficialExamAttempt = {
        id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        examId: s.exam.id,
        examCode: s.exam.code,
        examTitle: s.exam.title,
        level: s.exam.level,
        mode: s.mode,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        passed: result.passed,
        autoCorrectCount: result.autoCorrectCount,
        autoTotalCount: result.autoTotalCount,
        sectionScores,
        elapsedSeconds: s.elapsedSeconds,
        completedAt: new Date().toISOString(),
        answers: { ...s.answers },
      };

      const nextHistory = appendOfficialExamHistory(s.exam.level, attempt);
      clearOfficialExamDraft(s.exam.id);
      refreshDrafts();
      setHistory(nextHistory);
      setGradeResult(result);
      setIsViewingHistory(false);
      setConfirmModal(null);
      setPhase('result');

      showToast(
        autoSubmitted
          ? `Hết giờ — hệ thống đã tự chấm: ${result.totalScore}/${result.maxScore} điểm.`
          : `Đã chấm xong đề ${s.exam.code}: ${result.totalScore}/${result.maxScore} điểm!`,
        result.passed ? 'yellow' : 'dark',
      );
    },
    [showToast, refreshDrafts],
  );

  // 1-second timer tick while taking
  useEffect(() => {
    if (phase !== 'taking') return;
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.setTimeout(() => finishAndGrade(true), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, finishAndGrade]);

  const startExam = useCallback(
    (targetExam: OfficialExam, nextMode: OfficialExamMode, useTimer = true) => {
      const activeSecs = getActiveSectionsForMode(targetExam, nextMode);
      const firstKey = activeSecs[0]?.key || 'listening';
      const durationMin = getDurationMinutesForMode(targetExam, nextMode);

      clearOfficialExamDraft(targetExam.id);
      refreshDrafts();
      audioTimeRef.current = 0;
      setMode(nextMode);
      setStrictAudio(nextMode === 'full');
      setActiveSection(firstKey);
      setAnswers({});
      setFlagged({});
      setElapsedSeconds(0);
      setRemainingSeconds(useTimer ? durationMin * 60 : null);
      setInitialAudioTimeSec(0);
      setGradeResult(null);
      setIsViewingHistory(false);
      setConfirmModal(null);
      setPhase('taking');
    },
    [refreshDrafts],
  );

  const resumeDraft = useCallback((targetExam: OfficialExam) => {
    const draft = loadOfficialExamDraft(targetExam.id);
    if (!draft) return;
    const savedSec = draft.audioTimeSec || 0;
    audioTimeRef.current = savedSec;
    setMode(draft.mode);
    setStrictAudio(draft.strictAudio);
    setActiveSection(draft.activeSection);
    setAnswers(draft.answers || {});
    setFlagged(draft.flagged || {});
    setElapsedSeconds(draft.elapsedSeconds || 0);
    setRemainingSeconds(draft.remainingSeconds ?? null);
    setInitialAudioTimeSec(savedSec);
    setGradeResult(null);
    setIsViewingHistory(false);
    setConfirmModal(null);
    setPhase('taking');
  }, []);

  const discardDraft = useCallback(
    (examId: string) => {
      clearOfficialExamDraft(examId);
      refreshDrafts();
      setPhase('idle');
      showToast('Đã xóa bản nháp bài thi.', 'dark');
    },
    [showToast, refreshDrafts],
  );

  const updateAnswer = useCallback((questionNumber: number, value: string) => {
    setAnswers((prev) => {
      if (prev[questionNumber] === value) return prev;
      return { ...prev, [questionNumber]: value };
    });
  }, []);

  const toggleFlag = useCallback((questionNumber: number) => {
    setFlagged((prev) => ({ ...prev, [questionNumber]: !prev[questionNumber] }));
  }, []);

  const openHistoryAttempt = useCallback(
    (targetExam: OfficialExam, attempt: LocalOfficialExamAttempt) => {
      const result = gradeOfficialExam(targetExam, attempt.mode, attempt.answers || {});
      setMode(attempt.mode);
      setElapsedSeconds(attempt.elapsedSeconds);
      setGradeResult(result);
      setIsViewingHistory(true);
      setPhase('result');
    },
    [],
  );

  const handleClearHistory = useCallback(() => {
    clearOfficialExamHistory(level);
    setHistory([]);
    showToast('Đã xóa lịch sử thi thử HSK trên trình duyệt.', 'dark');
  }, [level, showToast]);

  const confirmExit = useCallback(() => {
    persistDraftNow();
    refreshDrafts();
    setConfirmModal(null);
    setPhase('idle');
    showToast('Đã lưu nháp tiến độ làm bài trên trình duyệt.', 'dark');
  }, [persistDraftNow, refreshDrafts, showToast]);

  const backToList = useCallback(() => {
    refreshDrafts();
    setPhase('idle');
    setGradeResult(null);
    setIsViewingHistory(false);
  }, [refreshDrafts]);

  return {
    phase,
    mode,
    strictAudio,
    setStrictAudio,
    activeSection,
    setActiveSection,
    answers,
    flagged,
    elapsedSeconds,
    remainingSeconds,
    initialAudioTimeSec,
    reportAudioTime,
    answeredCount,
    totalCount: flatQuestions.length,
    unansweredCount: Math.max(0, flatQuestions.length - answeredCount),
    flaggedCount,
    confirmModal,
    setConfirmModal,
    gradeResult,
    isViewingHistory,
    history,
    draftsByExamId,
    startExam,
    resumeDraft,
    discardDraft,
    updateAnswer,
    toggleFlag,
    finishAndGrade,
    openHistoryAttempt,
    handleClearHistory,
    confirmExit,
    backToList,
  };
}
