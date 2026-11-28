import type {
  CompletedSentenceInfo,
  DiffCharSegment,
  ExamConfig,
  ExamGradeSummary,
  ExamQuestion,
  GradedQuestionItem,
  LocalCourseExamStats,
  LocalExamAttempt,
  LocalExamDraft,
} from '@/features/exercises/types';
import type { ExerciseItem } from '@/types';

export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  all: 'Tất cả dạng bài',
  translate: 'Dịch Việt → Trung',
  fill_blank: 'Điền từ vào câu',
  writing: 'Tự luận / Nhập đáp án',
  listen: 'Nghe & gõ lại',
  quiz: 'Trắc nghiệm (từ file A/B/C/D)',
};

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const QUESTION_COUNT_PRESETS = [10, 20, 30, 50, 0] as const;
export const TIME_LIMIT_PRESETS = [0, 10, 15, 30] as const;

export function hasSelectableOptions(question: ExamQuestion): boolean {
  return Array.isArray(question.options) && question.options.length >= 2;
}

const EXAM_HISTORY_KEY = 'hsk_mock_exam_history_v1';
const EXAM_WRONG_IDS_KEY = 'hsk_mock_exam_wrong_ids_v1';
const EXAM_DRAFT_KEY = 'hsk_mock_exam_draft_v1';
const EXAM_SEEN_IDS_KEY = 'hsk_mock_exam_seen_ids_v1';
const MAX_HISTORY_PER_LEVEL = 100;

const BLANK_REGEX = /_{2,}|＿{2,}|\(\s*\)|（\s*）/;
const HANZI_REGEX = /[\u4e00-\u9fff]/;
const LATIN_VI_REGEX = /[a-zA-ZÀ-ỹ]{2,}/;
const PUNCT_AND_SPACE_REGEX =
  /[\s.,!?;:'"`“”‘’()（）【】[\]《》〈〉、，。！？；：\-–—…~·/\\]/g;

/**
 * Normalizes any exercise (including legacy fill_blank / quiz / translate DB records)
 * into a clean Vietnamese-only prompt for typed-input practice so Chinese text is
 * NEVER shown beside Vietnamese while taking the test.
 */
export function normalizeExamQuestion(ex: ExerciseItem): ExamQuestion {
  const rawQ = String(ex.question || '').trim();
  const rawAns = String(ex.correctAnswer || '').trim();

  // Case 1: Bilingual fill-in-the-blank or sentence with Vietnamese in trailing parentheses
  // (closing paren is optional in case source PDF truncated the line)
  const parenViMatch = rawQ.match(
    /^([\s\S]*?[\u4e00-\u9fff][\s\S]*?)\s*[（(]([^()（）]*[a-zA-ZÀ-ỹ]{2,}[^()（）]*)[）)]?\s*$/,
  );
  if (parenViMatch && !HANZI_REGEX.test(parenViMatch[2])) {
    const zhPart = parenViMatch[1].trim();
    const viPart = parenViMatch[2].trim();
    const filledZh =
      BLANK_REGEX.test(zhPart) && rawAns
        ? zhPart.replace(/\s*(?:_{2,}|＿{2,}|\(\s*\)|（\s*）)\s*/g, rawAns)
        : zhPart;

    return {
      ...ex,
      exerciseType: 'translate',
      title: ex.title.replace(/^Điền từ vào câu/i, 'Dịch sang tiếng Trung'),
      question: viPart,
      options: undefined,
      correctAnswer: filledZh,
    };
  }

  // Case 2: Legacy "Chọn bản dịch tiếng Việt đúng cho câu: '<Chinese>'" -> flip to Vi -> Zh
  const legacyTransMatch = rawQ.match(
    /Chọn bản dịch tiếng Việt đúng cho câu\s*[:：]\s*["“「]?([\s\S]+?)["”」]?\s*$/i,
  );
  if (
    legacyTransMatch &&
    HANZI_REGEX.test(legacyTransMatch[1]) &&
    rawAns &&
    !HANZI_REGEX.test(rawAns)
  ) {
    return {
      ...ex,
      exerciseType: 'translate',
      title: ex.title.replace(/^Đọc hiểu câu ví dụ/i, 'Dịch sang tiếng Trung'),
      question: rawAns,
      options: undefined,
      correctAnswer: legacyTransMatch[1].trim(),
    };
  }

  // Case 3: Legacy vocab quiz 'Từ "<Hanzi>" có nghĩa tiếng Việt & Pinyin nào đúng nhất?' -> flip to Vi -> Hanzi
  const legacyQuizMatch = rawQ.match(
    /Từ\s*["“「]([\u4e00-\u9fff]+)["”」]\s*có nghĩa/i,
  );
  if (legacyQuizMatch && rawAns && !HANZI_REGEX.test(rawAns)) {
    const hanzi = legacyQuizMatch[1].trim();
    const meaningOnly = rawAns.replace(/\s*\([^)]*\)\s*$/, '').trim() || rawAns;
    return {
      ...ex,
      exerciseType: 'writing',
      title: ex.title.replace(/^Trắc nghiệm từ vựng/i, 'Nhập từ tiếng Trung'),
      question: `Nhập từ tiếng Trung mang nghĩa: "${meaningOnly}"`,
      options: undefined,
      correctAnswer: hanzi,
    };
  }

  // Case 4: Inline dash-separated bilingual prompt "中文 — Tiếng Việt"
  const dashIdx = rawQ.search(/\s+[-–—]\s+(?=[^\u4e00-\u9fff])/);
  if (dashIdx > 0) {
    const left = rawQ.slice(0, dashIdx).trim();
    const right = rawQ.slice(dashIdx).replace(/^[\s\-–—]+/, '').trim();
    if (HANZI_REGEX.test(left) && LATIN_VI_REGEX.test(right) && !HANZI_REGEX.test(right)) {
      const filledZh =
        BLANK_REGEX.test(left) && rawAns
          ? left.replace(/\s*(?:_{2,}|＿{2,}|\(\s*\)|（\s*）)\s*/g, rawAns)
          : left;
      return {
        ...ex,
        exerciseType: 'translate',
        title: ex.title.replace(/^Điền từ vào câu/i, 'Dịch sang tiếng Trung'),
        question: right,
        options: undefined,
        correctAnswer: filledZh,
      };
    }
  }

  // Keep options ONLY if the exercise genuinely has >= 2 A/B/C/D options (from an uploaded MCQ file)
  const cleanOpts = Array.isArray(ex.options)
    ? ex.options.map((o) => String(o).trim()).filter(Boolean)
    : [];
  return {
    ...ex,
    options: cleanOpts.length >= 2 ? cleanOpts : undefined,
  };
}

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

  return config.questionCount > 0 ? ordered.slice(0, config.questionCount) : ordered;
}

/**
 * Builds a randomized exam from an explicit list of question IDs (e.g. wrong-answer bank).
 */
export function buildExamFromIds(
  pool: readonly ExerciseItem[],
  ids: readonly string[],
): ExamQuestion[] {
  const idSet = new Set(ids);
  return shuffleArray(pool.filter((ex) => idSet.has(ex.id)));
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
    if (ex) result.push(ex);
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
    questions.push(ex);
    if (rec.userAnswer !== null && rec.userAnswer !== '') {
      answers[ex.id] = rec.userAnswer;
    }
  }

  if (questions.length === 0) return null;
  return gradeExam(questions, answers);
}

/**
 * Normalizes typed text for fair comparison (ignores spacing, case, and
 * fullwidth/halfwidth punctuation differences like `，` vs `,` or trailing `。`).
 */
export function normalizeTypedAnswer(text: string): string {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(PUNCT_AND_SPACE_REGEX, '')
    .trim();
}

/**
 * Computes Longest Common Subsequence (LCS) match indices on user input chars
 * against normalized expected answer for character-level visual diffing & similarity %.
 */
export function diffTypedAnswer(
  userRaw: string,
  expectedRaw: string,
): { segments: DiffCharSegment[]; similarityPct: number } {
  const userChars = Array.from(userRaw.trim());
  const expectedNorm = Array.from(normalizeTypedAnswer(expectedRaw));

  if (!userChars.length || !expectedNorm.length) {
    return {
      segments: userChars.map((char) => ({ char, matched: false })),
      similarityPct: 0,
    };
  }

  // Filter user characters that participate in normalized comparison (keep punctuation visually)
  const normPositions: Array<{ origIdx: number; char: string }> = [];
  userChars.forEach((ch, idx) => {
    const norm = normalizeTypedAnswer(ch);
    if (norm) {
      for (const nc of Array.from(norm)) {
        normPositions.push({ origIdx: idx, char: nc });
      }
    }
  });

  const m = normPositions.length;
  const n = expectedNorm.length;

  // Guard DP matrix size for very long paragraphs
  if (m === 0 || m * n > 40_000) {
    const expectedSet = new Set(expectedNorm);
    let hits = 0;
    const segments = userChars.map((char) => {
      const norm = normalizeTypedAnswer(char);
      const matched = !norm || expectedSet.has(norm);
      if (norm && matched) hits += 1;
      return { char, matched };
    });
    const sim = Math.round((hits / Math.max(m, n)) * 100);
    return { segments, similarityPct: Math.min(100, sim) };
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (normPositions[i - 1].char === expectedNorm[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const matchedOrigIndices = new Set<number>();
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (normPositions[i - 1].char === expectedNorm[j - 1]) {
      matchedOrigIndices.add(normPositions[i - 1].origIdx);
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  const lcsLen = dp[m][n];
  const similarityPct = Math.round((lcsLen / Math.max(m, n)) * 100);
  const segments = userChars.map((char, idx) => {
    const isPunctOrSpace = !normalizeTypedAnswer(char);
    return {
      char,
      matched: isPunctOrSpace || matchedOrigIndices.has(idx),
    };
  });

  return { segments, similarityPct };
}

/**
 * Pure client-side grading engine for typed answers — runs ONLY when user submits the exam.
 * Questions without an answer key in the file are marked `isSelfCheck` so they don't penalize score.
 */
export function gradeExam(
  questions: readonly ExamQuestion[],
  answers: Readonly<Record<string, string>>,
): ExamGradeSummary {
  let gradableCount = 0;
  let selfCheckCount = 0;
  let answered = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const items: GradedQuestionItem[] = questions.map((question, index) => {
    const rawUser = answers[question.id];
    const trimmedUser = typeof rawUser === 'string' ? rawUser.trim() : '';
    const userAnswer = trimmedUser.length > 0 ? trimmedUser : null;
    const isUnanswered = userAnswer === null;
    const expected = String(question.correctAnswer || '').trim();
    const hasAnswerKey = expected.length > 0;
    const isSelfCheck = !hasAnswerKey;

    if (hasAnswerKey) gradableCount += 1;
    else selfCheckCount += 1;

    if (isUnanswered) {
      unansweredCount += 1;
    } else {
      answered += 1;
    }

    let isCorrect = false;
    let similarityPct = 0;
    let diffSegments: DiffCharSegment[] | undefined;

    if (hasAnswerKey && !isUnanswered) {
      const normUser = normalizeTypedAnswer(userAnswer);
      const normExpected = normalizeTypedAnswer(expected);
      isCorrect = normExpected.length > 0 && normUser === normExpected;
      if (isCorrect) {
        correctCount += 1;
        similarityPct = 100;
      } else {
        wrongCount += 1;
        const diff = diffTypedAnswer(userAnswer, expected);
        similarityPct = diff.similarityPct;
        diffSegments = diff.segments;
      }
    }

    return {
      question,
      index,
      userAnswer,
      hasAnswerKey,
      isSelfCheck,
      isCorrect,
      isUnanswered,
      similarityPct,
      diffSegments,
    };
  });

  const total = questions.length;
  const percent =
    gradableCount > 0
      ? Math.round((correctCount / gradableCount) * 100)
      : total > 0
        ? Math.round((answered / total) * 100)
        : 0;
  const score10 =
    gradableCount > 0
      ? Math.round((correctCount / gradableCount) * 100) / 10
      : null;

  let gradeLabel = 'Hoàn thành tự luận';
  let gradeVariant: 'mint' | 'yellow' | 'pink' | 'lavender' = 'lavender';

  if (score10 !== null) {
    if (score10 >= 8.5) {
      gradeLabel = 'Xuất sắc';
      gradeVariant = 'mint';
    } else if (score10 >= 7) {
      gradeLabel = 'Khá tốt';
      gradeVariant = 'mint';
    } else if (score10 >= 5) {
      gradeLabel = 'Đạt yêu cầu';
      gradeVariant = 'yellow';
    } else {
      gradeLabel = 'Cần ôn thêm';
      gradeVariant = 'pink';
    }
  }

  return {
    total,
    gradableCount,
    selfCheckCount,
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
  if (HANZI_REGEX.test(answer)) return stripNonChineseParentheticals(answer) || answer;

  const strippedQuestion = stripNonChineseParentheticals(question.question);
  if (HANZI_REGEX.test(strippedQuestion)) return strippedQuestion;
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

function readLevelValue<T>(storageKey: string, level: number, fallback: T): T {
  const map = readRecordMap<T>(storageKey);
  const val = map[String(level)];
  return val !== undefined ? val : fallback;
}

function writeLevelValue<T>(storageKey: string, level: number, value: T): T {
  const map = readRecordMap<T>(storageKey);
  map[String(level)] = value;
  writeRecordMap(storageKey, map);
  return value;
}

function clearLevelValue(storageKey: string, level: number): void {
  const map = readRecordMap<unknown>(storageKey);
  delete map[String(level)];
  writeRecordMap(storageKey, map);
}

export function readExamHistory(level: number): LocalExamAttempt[] {
  const list = readLevelValue<LocalExamAttempt[]>(EXAM_HISTORY_KEY, level, []);
  return Array.isArray(list) ? list : [];
}

export function appendExamHistory(attempt: LocalExamAttempt): LocalExamAttempt[] {
  const prev = readExamHistory(attempt.level);
  const next = [attempt, ...prev].slice(0, MAX_HISTORY_PER_LEVEL);
  return writeLevelValue(EXAM_HISTORY_KEY, attempt.level, next);
}

export function clearExamHistory(level: number): void {
  clearLevelValue(EXAM_HISTORY_KEY, level);
}

export function readWrongQuestionIds(level: number): string[] {
  const list = readLevelValue<string[]>(EXAM_WRONG_IDS_KEY, level, []);
  return Array.isArray(list) ? list : [];
}

export function updateWrongQuestionIds(
  level: number,
  missedIds: readonly string[],
  masteredIds: readonly string[],
): string[] {
  const current = new Set<string>(readWrongQuestionIds(level));
  masteredIds.forEach((id) => current.delete(id));
  missedIds.forEach((id) => current.add(id));
  return writeLevelValue(EXAM_WRONG_IDS_KEY, level, Array.from(current));
}

export function clearWrongQuestionIds(level: number): void {
  clearLevelValue(EXAM_WRONG_IDS_KEY, level);
}

export function readSeenQuestionIds(level: number): string[] {
  const list = readLevelValue<string[]>(EXAM_SEEN_IDS_KEY, level, []);
  return Array.isArray(list) ? list : [];
}

export function appendSeenQuestionIds(
  level: number,
  newIds: readonly string[],
): string[] {
  const current = new Set<string>(readSeenQuestionIds(level));
  newIds.forEach((id) => current.add(id));
  return writeLevelValue(EXAM_SEEN_IDS_KEY, level, Array.from(current));
}

export function clearSeenQuestionIds(level: number): void {
  clearLevelValue(EXAM_SEEN_IDS_KEY, level);
}

export function readExamDraft(level: number): LocalExamDraft | null {
  const draft = readLevelValue<LocalExamDraft | null>(EXAM_DRAFT_KEY, level, null);
  return draft && Array.isArray(draft.questionIds) && draft.questionIds.length > 0
    ? draft
    : null;
}

export function saveExamDraft(draft: LocalExamDraft): void {
  writeLevelValue(EXAM_DRAFT_KEY, draft.level, draft);
}

export function clearExamDraft(level: number): void {
  clearLevelValue(EXAM_DRAFT_KEY, level);
}

export function getLocalCourseExamStats(
  level: number,
  validExerciseIds?: ReadonlySet<string>,
): LocalCourseExamStats {
  const history = readExamHistory(level);
  const wrongIds = readWrongQuestionIds(level);
  const wrongCount = validExerciseIds
    ? wrongIds.filter((id) => validExerciseIds.has(id)).length
    : wrongIds.length;
  const scored = history.filter((item) => typeof item.score10 === 'number');
  const bestScore10 = scored.length
    ? scored.reduce((max, item) => ((item.score10 ?? 0) > max ? item.score10! : max), 0)
    : null;

  return {
    attemptCount: history.length,
    bestScore10,
    wrongCount,
    lastAttempt: history[0] || null,
  };
}
