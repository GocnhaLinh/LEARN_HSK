import type { ExerciseItem } from '@/types';

export type ExamPhase = 'setup' | 'taking' | 'result';
export type ExamViewMode = 'single' | 'all';
export type ReviewFilter = 'all' | 'wrong' | 'correct';

export interface ExamConfig {
  /** 0 means take all matching questions in the filtered bank */
  questionCount: number;
  lessonId: string;
  exerciseType: string;
  /** 0 means unlimited (stopwatch counts up) */
  timeLimitMinutes: number;
  shuffleOptions: boolean;
  /** When true, unseen questions are placed ahead of previously seen ones */
  prioritizeUnseen: boolean;
}

export interface ExamQuestion extends ExerciseItem {
  options: string[];
}

export interface GradedQuestionItem {
  question: ExamQuestion;
  index: number;
  userAnswer: string | null;
  isCorrect: boolean;
  isUnanswered: boolean;
}

export interface ExamGradeSummary {
  total: number;
  answered: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score10: number;
  percent: number;
  gradeLabel: string;
  gradeVariant: 'mint' | 'yellow' | 'pink';
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
  score10: number;
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
  optionOrderById: Record<string, string[]>;
  answers: Record<string, string>;
  flaggedIds: Record<string, boolean>;
  currentIndex: number;
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

export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  all: 'Tất cả dạng bài',
  fill_blank: 'Điền từ vào câu',
  quiz: 'Trắc nghiệm',
  translate: 'Dịch câu',
  listen: 'Nghe hiểu',
};

export const QUESTION_COUNT_PRESETS = [10, 20, 30, 50, 0] as const;
export const TIME_LIMIT_PRESETS = [0, 10, 15, 30] as const;
export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

const EXAM_HISTORY_KEY = 'hsk_mock_exam_history_v1';
const EXAM_WRONG_IDS_KEY = 'hsk_mock_exam_wrong_ids_v1';
const EXAM_DRAFT_KEY = 'hsk_mock_exam_draft_v1';
const EXAM_SEEN_IDS_KEY = 'hsk_mock_exam_seen_ids_v1';
const MAX_HISTORY_PER_LEVEL = 100;

const BLANK_REGEX = /_{2,}|＿{2,}|\(\s*\)|（\s*）/;
const HANZI_REGEX = /[\u4e00-\u9fff]/;

/** Pure Fisher-Yates shuffle returning a brand-new array. */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getExerciseTypeLabel(type: string): string {
  return EXERCISE_TYPE_LABELS[type] || type;
}

export function filterExercises(
  pool: readonly ExerciseItem[],
  lessonId: string,
  exerciseType: string,
): ExerciseItem[] {
  return pool.filter((ex) => {
    if (lessonId !== 'all' && ex.lessonId !== lessonId) return false;
    if (exerciseType !== 'all' && ex.exerciseType !== exerciseType) return false;
    return true;
  });
}

function cleanQuestionOptions(options: readonly string[] | undefined): string[] {
  return Array.isArray(options)
    ? Array.from(new Set(options.map((o) => String(o).trim()).filter(Boolean)))
    : [];
}

function prepareExamQuestion(ex: ExerciseItem, shuffleOptions: boolean): ExamQuestion {
  const cleanOptions = cleanQuestionOptions(ex.options);
  return {
    ...ex,
    options: shuffleOptions ? shuffleArray(cleanOptions) : cleanOptions,
  };
}

/**
 * Randomly draws questions from `pool` matching `config` filters.
 * When `config.prioritizeUnseen` is true, unseen questions are drawn first before seen ones.
 */
export function buildRandomExam(
  pool: readonly ExerciseItem[],
  config: ExamConfig,
  seenIds: readonly string[] = [],
): ExamQuestion[] {
  const matched = filterExercises(pool, config.lessonId, config.exerciseType);
  let ordered: ExerciseItem[];

  if (config.prioritizeUnseen && seenIds.length > 0) {
    const seenSet = new Set(seenIds);
    const unseen: ExerciseItem[] = [];
    const seen: ExerciseItem[] = [];
    for (const ex of matched) {
      if (seenSet.has(ex.id)) seen.push(ex);
      else unseen.push(ex);
    }
    ordered = [...shuffleArray(unseen), ...shuffleArray(seen)];
  } else {
    ordered = shuffleArray(matched);
  }

  const picked =
    config.questionCount > 0 ? ordered.slice(0, config.questionCount) : ordered;
  return picked.map((ex) => prepareExamQuestion(ex, config.shuffleOptions));
}

/**
 * Builds a randomized exam from an explicit list of question IDs (e.g. wrong-answer bank).
 */
export function buildExamFromIds(
  pool: readonly ExerciseItem[],
  ids: readonly string[],
  shuffleOptions: boolean,
): ExamQuestion[] {
  const idSet = new Set(ids);
  const matched = pool.filter((ex) => idSet.has(ex.id));
  return shuffleArray(matched).map((ex) => prepareExamQuestion(ex, shuffleOptions));
}

/**
 * Reconstructs ordered ExamQuestions from a saved localStorage draft against the live pool.
 */
export function rebuildExamFromDraft(
  draft: LocalExamDraft,
  pool: readonly ExerciseItem[],
): ExamQuestion[] {
  const byId = new Map(pool.map((ex) => [ex.id, ex]));
  const result: ExamQuestion[] = [];
  for (const id of draft.questionIds) {
    const ex = byId.get(id);
    if (!ex) continue;
    const savedOrder = draft.optionOrderById?.[id];
    const cleanOptions = cleanQuestionOptions(ex.options);
    const validOrder =
      Array.isArray(savedOrder) && savedOrder.length > 0 ? savedOrder : cleanOptions;
    result.push({
      ...ex,
      options: validOrder,
    });
  }
  return result;
}

/**
 * Reconstructs a full ExamGradeSummary from a saved history attempt snapshot.
 */
export function rebuildGradeFromAttempt(
  attempt: LocalExamAttempt,
  pool: readonly ExerciseItem[],
): ExamGradeSummary | null {
  if (!Array.isArray(attempt.records) || attempt.records.length === 0) return null;
  const byId = new Map(pool.map((ex) => [ex.id, ex]));
  const questions: ExamQuestion[] = [];
  const answers: Record<string, string> = {};

  for (const rec of attempt.records) {
    const ex = byId.get(rec.questionId);
    if (!ex) continue;
    questions.push({
      ...ex,
      options: cleanQuestionOptions(ex.options),
    });
    if (rec.userAnswer !== null && rec.userAnswer !== '') {
      answers[ex.id] = rec.userAnswer;
    }
  }

  if (questions.length === 0) return null;
  return gradeExam(questions, answers);
}

/**
 * Pure client-side grading engine — runs ONLY when user submits the exam.
 */
export function gradeExam(
  questions: readonly ExamQuestion[],
  answers: Readonly<Record<string, string>>,
): ExamGradeSummary {
  let answered = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const items: GradedQuestionItem[] = questions.map((question, index) => {
    const rawUser = answers[question.id];
    const userAnswer = rawUser !== undefined && rawUser !== '' ? rawUser : null;
    const isUnanswered = userAnswer === null;
    const isCorrect =
      !isUnanswered &&
      userAnswer.trim() === String(question.correctAnswer || '').trim();

    if (isUnanswered) {
      unansweredCount += 1;
    } else {
      answered += 1;
      if (isCorrect) correctCount += 1;
      else wrongCount += 1;
    }

    return {
      question,
      index,
      userAnswer,
      isCorrect,
      isUnanswered,
    };
  });

  const total = questions.length;
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const score10 = total > 0 ? Math.round((correctCount / total) * 100) / 10 : 0;

  let gradeLabel = 'Cần ôn thêm';
  let gradeVariant: 'mint' | 'yellow' | 'pink' = 'pink';
  if (score10 >= 8.5) {
    gradeLabel = 'Xuất sắc';
    gradeVariant = 'mint';
  } else if (score10 >= 7) {
    gradeLabel = 'Khá tốt';
    gradeVariant = 'mint';
  } else if (score10 >= 5) {
    gradeLabel = 'Đạt yêu cầu';
    gradeVariant = 'yellow';
  }

  return {
    total,
    answered,
    correctCount,
    wrongCount,
    unansweredCount,
    score10,
    percent,
    gradeLabel,
    gradeVariant,
    items,
  };
}

/**
 * Strips parenthetical non-Chinese explanations (e.g. Vietnamese translations)
 * so Chinese TTS reads only clean Mandarin text.
 */
function stripNonChineseParentheticals(text: string): string {
  return text
    .replace(/\([^()]*\)/g, (seg) => (HANZI_REGEX.test(seg) ? seg : ''))
    .replace(/（[^（）]*）/g, (seg) => (HANZI_REGEX.test(seg) ? seg : ''))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * For fill-in-the-blank exercises, splices the correct answer into the blank
 * for post-submit review & clean Chinese TTS pronunciation.
 */
export function buildCompletedSentence(
  question: ExamQuestion,
): CompletedSentenceInfo | null {
  const answer = String(question.correctAnswer || '').trim();
  if (!answer) return null;
  const match = BLANK_REGEX.exec(question.question);
  if (!match || match.index === undefined) return null;

  const before = question.question.slice(0, match.index);
  const after = question.question.slice(match.index + match[0].length);
  const fullSentence = `${before}${answer}${after}`;
  const cleanedChinese = stripNonChineseParentheticals(fullSentence);
  const speakText = HANZI_REGEX.test(cleanedChinese)
    ? cleanedChinese
    : HANZI_REGEX.test(answer)
      ? answer
      : '';

  return { before, answer, after, fullSentence, speakText };
}

/**
 * Returns clean Chinese text suitable for Web Speech TTS on the result review card.
 */
export function getQuestionSpeechText(question: ExamQuestion): string | null {
  const completed = buildCompletedSentence(question);
  if (completed?.speakText) return completed.speakText;

  const answer = String(question.correctAnswer || '').trim();
  const strippedQuestion = stripNonChineseParentheticals(question.question);
  if (HANZI_REGEX.test(strippedQuestion)) return strippedQuestion;
  if (HANZI_REGEX.test(answer)) return answer;
  return null;
}

export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatAttemptDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* =========================================================================
   CLIENT-ONLY LOCALSTORAGE HELPERS (ZERO DATABASE WRITES)
   ========================================================================= */

function readRecordMap<T>(storageKey: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRecordMap<T>(storageKey: string, map: Record<string, T>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

/* --- Attempt History --- */

export function readExamHistory(level: number): LocalExamAttempt[] {
  const map = readRecordMap<LocalExamAttempt[]>(EXAM_HISTORY_KEY);
  const list = map[String(level)];
  return Array.isArray(list) ? list : [];
}

export function appendExamHistory(attempt: LocalExamAttempt): LocalExamAttempt[] {
  const map = readRecordMap<LocalExamAttempt[]>(EXAM_HISTORY_KEY);
  const key = String(attempt.level);
  const prev = Array.isArray(map[key]) ? map[key] : [];
  const next = [attempt, ...prev].slice(0, MAX_HISTORY_PER_LEVEL);
  map[key] = next;
  writeRecordMap(EXAM_HISTORY_KEY, map);
  return next;
}

export function clearExamHistory(level: number): void {
  const map = readRecordMap<LocalExamAttempt[]>(EXAM_HISTORY_KEY);
  delete map[String(level)];
  writeRecordMap(EXAM_HISTORY_KEY, map);
}

/* --- Wrong-Answer Bank --- */

export function readWrongQuestionIds(level: number): string[] {
  const map = readRecordMap<string[]>(EXAM_WRONG_IDS_KEY);
  const list = map[String(level)];
  return Array.isArray(list) ? list : [];
}

/**
 * Adds newly missed question IDs and removes IDs that the learner answered correctly
 * in the latest submission (acts as a local mistake-review notebook).
 */
export function updateWrongQuestionIds(
  level: number,
  missedIds: readonly string[],
  masteredIds: readonly string[],
): string[] {
  const map = readRecordMap<string[]>(EXAM_WRONG_IDS_KEY);
  const key = String(level);
  const current = new Set<string>(Array.isArray(map[key]) ? map[key] : []);
  masteredIds.forEach((id) => current.delete(id));
  missedIds.forEach((id) => current.add(id));
  const next = Array.from(current);
  map[key] = next;
  writeRecordMap(EXAM_WRONG_IDS_KEY, map);
  return next;
}

export function clearWrongQuestionIds(level: number): void {
  const map = readRecordMap<string[]>(EXAM_WRONG_IDS_KEY);
  delete map[String(level)];
  writeRecordMap(EXAM_WRONG_IDS_KEY, map);
}

/* --- Seen-Questions Coverage Bank --- */

export function readSeenQuestionIds(level: number): string[] {
  const map = readRecordMap<string[]>(EXAM_SEEN_IDS_KEY);
  const list = map[String(level)];
  return Array.isArray(list) ? list : [];
}

export function appendSeenQuestionIds(
  level: number,
  newIds: readonly string[],
): string[] {
  const map = readRecordMap<string[]>(EXAM_SEEN_IDS_KEY);
  const key = String(level);
  const current = new Set<string>(Array.isArray(map[key]) ? map[key] : []);
  newIds.forEach((id) => current.add(id));
  const next = Array.from(current);
  map[key] = next;
  writeRecordMap(EXAM_SEEN_IDS_KEY, map);
  return next;
}

export function clearSeenQuestionIds(level: number): void {
  const map = readRecordMap<string[]>(EXAM_SEEN_IDS_KEY);
  delete map[String(level)];
  writeRecordMap(EXAM_SEEN_IDS_KEY, map);
}

/* --- In-Progress Exam Auto-Save Draft --- */

export function readExamDraft(level: number): LocalExamDraft | null {
  const map = readRecordMap<LocalExamDraft>(EXAM_DRAFT_KEY);
  const draft = map[String(level)];
  if (!draft || !Array.isArray(draft.questionIds) || draft.questionIds.length === 0) {
    return null;
  }
  return draft;
}

export function saveExamDraft(draft: LocalExamDraft): void {
  const map = readRecordMap<LocalExamDraft>(EXAM_DRAFT_KEY);
  map[String(draft.level)] = draft;
  writeRecordMap(EXAM_DRAFT_KEY, map);
}

export function clearExamDraft(level: number): void {
  const map = readRecordMap<LocalExamDraft>(EXAM_DRAFT_KEY);
  delete map[String(level)];
  writeRecordMap(EXAM_DRAFT_KEY, map);
}

/* --- Summary Stats for CourseDetailPage Launcher --- */

export function getLocalCourseExamStats(level: number): LocalCourseExamStats {
  const history = readExamHistory(level);
  const wrongIds = readWrongQuestionIds(level);
  const bestScore10 = history.length
    ? history.reduce((max, item) => (item.score10 > max ? item.score10 : max), 0)
    : null;

  return {
    attemptCount: history.length,
    bestScore10,
    wrongCount: wrongIds.length,
    lastAttempt: history[0] || null,
  };
}
