import type {
  ExamQuestionItem,
  ExamSectionKey,
  FlattenedExamQuestion,
  GradedOfficialQuestion,
  LocalOfficialExamAttempt,
  LocalOfficialExamDraft,
  OfficialExam,
  OfficialExamGradeResult,
  OfficialExamMode,
  SectionScoreBreakdown,
} from '@/features/exams/types';
import type { DiffCharSegment } from '@/features/exercises/types';
import { diffTypedAnswer, normalizeTypedAnswer } from '@/features/exercises/utils/exam-utils';

const OFFICIAL_HISTORY_KEY = 'hsk_official_exam_history_v1';
const OFFICIAL_DRAFT_KEY = 'hsk_official_exam_draft_v1';

export const SECTION_LABELS: Record<ExamSectionKey, string> = {
  listening: 'Nghe (听力)',
  reading: 'Đọc (阅读)',
  writing: 'Viết (书写)',
};

export const MODE_LABELS: Record<OfficialExamMode, string> = {
  full: 'Thi thử chuẩn HSK (3 kỹ năng)',
  listening: 'Luyện riêng phần Nghe (听力)',
  reading: 'Luyện riêng phần Đọc (阅读)',
  writing: 'Luyện riêng phần Viết (书写)',
};

export function countHanziChars(text: string): number {
  const matches = (text || '').match(/[\u4e00-\u9fff]/g);
  return matches ? matches.length : 0;
}

export function flattenExamQuestions(
  exam: OfficialExam,
  mode: OfficialExamMode = 'full',
): FlattenedExamQuestion[] {
  const out: FlattenedExamQuestion[] = [];
  for (const sec of exam.sections || []) {
    if (mode !== 'full' && sec.key !== mode) continue;
    for (const part of sec.parts || []) {
      for (const group of part.groups || []) {
        for (const q of group.questions || []) {
          out.push({
            sectionKey: sec.key,
            sectionTitle: sec.title,
            partNumber: part.partNumber,
            partTitle: part.title,
            partInstruction: part.instruction,
            questionFormat: part.questionFormat,
            groupId: group.groupId,
            groupRangeLabel: group.rangeLabel,
            groupPassage: group.passage,
            groupTranscript: group.transcript,
            question: q,
          });
        }
      }
    }
  }
  return out.sort((a, b) => a.question.number - b.question.number);
}

export function getActiveSectionsForMode(exam: OfficialExam, mode: OfficialExamMode) {
  return (exam.sections || []).filter((s) => mode === 'full' || s.key === mode);
}

export function getDurationMinutesForMode(exam: OfficialExam, mode: OfficialExamMode): number {
  const active = getActiveSectionsForMode(exam, mode);
  if (mode === 'full') return exam.totalDurationMin || 120;
  return active.reduce((sum, s) => sum + (s.durationMin || 40), 0);
}

/**
 * Evaluates a completed Official HSK Exam attempt on the standard 100-per-section / 300-total scale.
 * Pure function — ZERO side effects and ZERO DB writes.
 */
export function gradeOfficialExam(
  exam: OfficialExam,
  mode: OfficialExamMode,
  answers: Record<number, string>,
): OfficialExamGradeResult {
  const flatList = flattenExamQuestions(exam, mode);
  const items: GradedOfficialQuestion[] = [];
  const sectionMap = new Map<ExamSectionKey, GradedOfficialQuestion[]>();

  for (const flat of flatList) {
    const q = flat.question;
    const rawAns = String(answers[q.number] || '').trim();
    const isUnanswered = rawAns.length === 0;
    const isMcq = Array.isArray(q.options) && q.options.length >= 2;
    const isEssay =
      flat.questionFormat === 'writing_keywords' || flat.questionFormat === 'writing_picture';
    const expected = (q.correctAnswer || '').trim();
    const isSelfCheck = isEssay || (!isMcq && !expected);

    let isCorrect = false;
    let diffSegments: DiffCharSegment[] | undefined;
    let matchedKeywords: string[] | undefined;
    let missingKeywords: string[] | undefined;
    let hanziCount: number | undefined;

    if (isEssay) {
      hanziCount = countHanziChars(rawAns);
      if (q.keywords?.length) {
        matchedKeywords = q.keywords.filter((kw) => rawAns.includes(kw));
        missingKeywords = q.keywords.filter((kw) => !rawAns.includes(kw));
      }
    } else if (isMcq && expected) {
      const normalizedUser = rawAns.toUpperCase();
      const normalizedExp = expected.toUpperCase();
      if (normalizedUser === normalizedExp) {
        isCorrect = true;
      } else if (normalizedExp.length === 1 && q.options) {
        const expIdx = normalizedExp.charCodeAt(0) - 65;
        const expText = q.options[expIdx] || '';
        isCorrect = Boolean(
          expText && normalizeTypedAnswer(rawAns) === normalizeTypedAnswer(expText),
        );
      }
    } else if (!isSelfCheck && !isUnanswered) {
      const normUser = normalizeTypedAnswer(rawAns);
      const normExp = normalizeTypedAnswer(expected);
      isCorrect = normUser.length > 0 && normUser === normExp;
      if (!isCorrect) {
        diffSegments = diffTypedAnswer(rawAns, expected).segments;
      }
    }

    const graded: GradedOfficialQuestion = {
      flat,
      userAnswer: rawAns,
      isMcq,
      isSelfCheck,
      isCorrect,
      isUnanswered,
      ...(matchedKeywords ? { matchedKeywords, missingKeywords } : {}),
      ...(hanziCount !== undefined ? { hanziCount } : {}),
      ...(diffSegments ? { diffSegments } : {}),
    };
    items.push(graded);

    const bucket = sectionMap.get(flat.sectionKey) || [];
    bucket.push(graded);
    sectionMap.set(flat.sectionKey, bucket);
  }

  const activeSections = getActiveSectionsForMode(exam, mode);
  const sectionBreakdowns: SectionScoreBreakdown[] = activeSections.map((sec) => {
    const secItems = sectionMap.get(sec.key) || [];
    const autoItems = secItems.filter((it) => !it.isSelfCheck);
    const essayItems = secItems.filter((it) => it.isSelfCheck);
    const correctCount = autoItems.filter((it) => it.isCorrect).length;
    const unansweredCount = secItems.filter((it) => it.isUnanswered).length;
    const wrongCount = autoItems.filter((it) => !it.isUnanswered && !it.isCorrect).length;

    let score100 = 0;
    if (sec.key === 'writing' && essayItems.length > 0 && autoItems.length > 0) {
      // Standard HSK5 Writing weighting: Part 1 (Q91-98 reorder) = 60 pts, Part 2 (Q99-100 essays) = 40 pts
      const part1Score = (correctCount / autoItems.length) * 60;
      const perEssayMax = 40 / essayItems.length;
      const part2Score = essayItems.reduce((sum, it) => {
        const target = it.flat.question.minChars || 80;
        const chars = it.hanziCount || 0;
        if (chars < 10) return sum;
        const lenRatio = Math.min(1, chars / target);
        const kwTotal = it.flat.question.keywords?.length || 0;
        const kwRatio =
          kwTotal > 0 ? (it.matchedKeywords?.length || 0) / kwTotal : 1;
        return sum + perEssayMax * (0.55 * lenRatio + 0.45 * kwRatio);
      }, 0);
      score100 = Math.round(part1Score + part2Score);
    } else if (autoItems.length > 0) {
      score100 = Math.round((correctCount / autoItems.length) * 100);
    } else if (essayItems.length > 0) {
      const perEssayMax = 100 / essayItems.length;
      score100 = Math.round(
        essayItems.reduce((sum, it) => {
          const target = it.flat.question.minChars || 80;
          const chars = it.hanziCount || 0;
          if (chars < 10) return sum;
          const lenRatio = Math.min(1, chars / target);
          const kwTotal = it.flat.question.keywords?.length || 0;
          const kwRatio =
            kwTotal > 0 ? (it.matchedKeywords?.length || 0) / kwTotal : 1;
          return sum + perEssayMax * (0.55 * lenRatio + 0.45 * kwRatio);
        }, 0),
      );
    }

    return {
      key: sec.key,
      title: sec.title,
      totalQuestions: secItems.length,
      autoGradedTotal: autoItems.length,
      correctCount,
      wrongCount,
      unansweredCount,
      essayCount: essayItems.length,
      score100: Math.min(100, Math.max(0, score100)),
    };
  });

  const totalScore = sectionBreakdowns.reduce((sum, s) => sum + s.score100, 0);
  const maxScore = sectionBreakdowns.length * 100;
  const passScore = Math.round(maxScore * 0.6); // HSK standard pass mark: 180/300 (60%)
  const autoItemsAll = items.filter((it) => !it.isSelfCheck);

  return {
    examId: exam.id,
    examTitle: exam.title,
    examCode: exam.code,
    mode,
    totalQuestions: items.length,
    answeredCount: items.filter((it) => !it.isUnanswered).length,
    autoCorrectCount: autoItemsAll.filter((it) => it.isCorrect).length,
    autoTotalCount: autoItemsAll.length,
    essayCount: items.filter((it) => it.isSelfCheck).length,
    totalScore,
    maxScore,
    passScore,
    passed: totalScore >= passScore,
    sections: sectionBreakdowns,
    items,
  };
}

// ---------------------------------------------------------------------------
// LocalStorage helpers (100% browser-local, ZERO DB writes for attempts)
// ---------------------------------------------------------------------------
function readMap<T>(storageKey: string): Record<string, T> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeMap<T>(storageKey: string, map: Record<string, T>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // Ignore quota errors
  }
}

export function loadAllOfficialExamDrafts(): Record<string, LocalOfficialExamDraft> {
  return readMap<LocalOfficialExamDraft>(OFFICIAL_DRAFT_KEY);
}

export function loadOfficialExamDraft(examId: string): LocalOfficialExamDraft | null {
  return readMap<LocalOfficialExamDraft>(OFFICIAL_DRAFT_KEY)[examId] || null;
}

export function saveOfficialExamDraft(draft: LocalOfficialExamDraft): void {
  const map = readMap<LocalOfficialExamDraft>(OFFICIAL_DRAFT_KEY);
  map[draft.examId] = draft;
  writeMap(OFFICIAL_DRAFT_KEY, map);
}

export function clearOfficialExamDraft(examId: string): void {
  const map = readMap<LocalOfficialExamDraft>(OFFICIAL_DRAFT_KEY);
  if (examId in map) {
    delete map[examId];
    writeMap(OFFICIAL_DRAFT_KEY, map);
  }
}

export function loadOfficialExamHistory(level: number): LocalOfficialExamAttempt[] {
  const list = readMap<LocalOfficialExamAttempt[]>(OFFICIAL_HISTORY_KEY)[String(level)];
  return Array.isArray(list) ? list : [];
}

export function appendOfficialExamHistory(
  level: number,
  attempt: LocalOfficialExamAttempt,
): LocalOfficialExamAttempt[] {
  const map = readMap<LocalOfficialExamAttempt[]>(OFFICIAL_HISTORY_KEY);
  const current = Array.isArray(map[String(level)]) ? map[String(level)] : [];
  const next = [attempt, ...current].slice(0, 30);
  map[String(level)] = next;
  writeMap(OFFICIAL_HISTORY_KEY, map);
  return next;
}

export function clearOfficialExamHistory(level: number): void {
  const map = readMap<LocalOfficialExamAttempt[]>(OFFICIAL_HISTORY_KEY);
  delete map[String(level)];
  writeMap(OFFICIAL_HISTORY_KEY, map);
}

export function getOptionTextByLetter(q: ExamQuestionItem, letter?: string): string {
  if (!letter || !q.options?.length) return '';
  const idx = letter.trim().toUpperCase().charCodeAt(0) - 65;
  return idx >= 0 && idx < q.options.length ? q.options[idx] : '';
}
