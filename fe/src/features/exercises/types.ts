import type { ExerciseItem } from '@/types';

export type ExamPhase = 'setup' | 'taking' | 'result';
export type ExamViewMode = 'single' | 'all';
export type ReviewFilter = 'all' | 'wrong' | 'correct';
export type ExamConfirmModal = null | 'submit' | 'exit';
export type ExamQuestion = ExerciseItem;

export interface ExamLockState {
  isExamActive: boolean;
  setExamActive: (active: boolean) => void;
}

export interface ExamConfig {
  /** 0 means take all matching questions in the filtered bank */
  questionCount: number;
  lessonId: string;
  exerciseType: string;
  /** 0 means unlimited (stopwatch counts up) */
  timeLimitMinutes: number;
  /** When true, unseen questions are placed ahead of previously seen ones */
  prioritizeUnseen: boolean;
}

export interface DiffCharSegment {
  char: string;
  matched: boolean;
}

export interface GradedQuestionItem {
  question: ExamQuestion;
  index: number;
  userAnswer: string | null;
  hasAnswerKey: boolean;
  isSelfCheck: boolean;
  isCorrect: boolean;
  isUnanswered: boolean;
  similarityPct: number;
  /** Precomputed character diff for incorrect typed answers (avoids recalculating LCS on re-renders) */
  diffSegments?: DiffCharSegment[];
}

export interface ExamGradeSummary {
  total: number;
  gradableCount: number;
  selfCheckCount: number;
  answered: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  /** null when none of the questions had an expected answer key */
  score10: number | null;
  percent: number;
  gradeLabel: string;
  gradeVariant: 'mint' | 'yellow' | 'pink' | 'lavender';
  items: GradedQuestionItem[];
}

export interface LocalExamAttemptRecord {
  questionId: string;
  userAnswer: string | null;
  isCorrect: boolean;
}

export interface LocalExamAttempt {
  id: string;
  level: number;
  label: string;
  total: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score10: number | null;
  percent: number;
  elapsedSeconds: number;
  completedAt: string;
  /** Compact per-question snapshot so past attempts can be reopened for review */
  records?: LocalExamAttemptRecord[];
}

export interface LocalExamDraft {
  level: number;
  examLabel: string;
  questionIds: string[];
  answers: Record<string, string>;
  flaggedIds: Record<string, boolean>;
  currentIndex: number;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  updatedAt: string;
}

export interface ActiveDraftSummary {
  examLabel: string;
  totalQuestions: number;
  answeredCount: number;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  updatedAt: string;
}

export interface LocalCourseExamStats {
  attemptCount: number;
  bestScore10: number | null;
  wrongCount: number;
  lastAttempt: LocalExamAttempt | null;
}

export interface CompletedSentenceInfo {
  before: string;
  answer: string;
  after: string;
  fullSentence: string;
  speakText: string;
}
