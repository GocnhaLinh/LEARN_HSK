import type { DiffCharSegment } from '@/features/exercises/types';

// --- API & Domain Models ---

export type MediaStorageProvider = 'cloudinary' | 'gridfs';
export type ExamSectionKey = 'listening' | 'reading' | 'writing';
export type ExamQuestionFormat =
  | 'listening_mcq'
  | 'reading_cloze'
  | 'reading_short'
  | 'reading_long'
  | 'writing_reorder'
  | 'writing_keywords'
  | 'writing_picture';

export interface MediaStorageStatus {
  provider: MediaStorageProvider;
  configured: boolean;
  connected: boolean;
  cloudName?: string;
  folder: string;
  error?: string;
}

export interface ExamQuestionItem {
  number: number;
  prompt?: string;
  options?: string[];
  correctAnswer: string;
  transcript?: string;
  explanation?: string;
  wordTiles?: string[];
  keywords?: string[];
  imageUrl?: string;
  minChars?: number;
  audioStartSec?: number;
  audioEndSec?: number;
}

export interface ExamQuestionGroup {
  groupId: string;
  rangeLabel?: string;
  passage?: string;
  transcript?: string;
  audioStartSec?: number;
  audioEndSec?: number;
  questions: ExamQuestionItem[];
}

export interface ExamPart {
  partNumber: number;
  title: string;
  instruction?: string;
  questionFormat: ExamQuestionFormat;
  groups: ExamQuestionGroup[];
}

export interface ExamSection {
  key: ExamSectionKey;
  title: string;
  durationMin: number;
  parts: ExamPart[];
}

export interface OfficialExam {
  id: string;
  code: string;
  level: number;
  title: string;
  description: string;
  totalQuestions: number;
  totalDurationMin: number;
  audioUrl?: string;
  audioStorage?: MediaStorageProvider;
  audioDurationSec?: number;
  sections: ExamSection[];
  createdAt?: string;
}

export interface OfficialExamSummary {
  id: string;
  code: string;
  level: number;
  title: string;
  description: string;
  totalQuestions: number;
  totalDurationMin: number;
  audioUrl?: string;
  audioStorage?: MediaStorageProvider;
  audioDurationSec?: number;
  sectionCounts: Record<string, number>;
  createdAt?: string;
}

export interface ImportOfficialExamPayload {
  code: string;
  level: number;
  title: string;
  description?: string;
  totalDurationMin?: number;
  audioDurationSec?: number;
  sections: ExamSection[];
}

export interface ImportOfficialExamInput {
  payload: ImportOfficialExamPayload;
  audioFile?: File | null;
  questionImages?: Array<{ questionNumber: number; blob: Blob; filename?: string }>;
  onUploadProgress?: (pct: number) => void;
}

// --- PDF Bundle Parser ---

export interface PdfRawTextItem {
  x: number;
  y: number;
  w: number;
  str: string;
}

export interface PdfExtractedPage {
  pageNumber: number;
  width: number;
  height: number;
  items: PdfRawTextItem[];
}

export interface ParsedExamWarning {
  questionNumber: number;
  severity: 'warning' | 'error';
  message: string;
  /** Optional raw source text from PDF so user can easily locate & fix it in the source file */
  sourceText?: string;
  /** Optional 1-to-1 OCR typo suggestion (e.g. from "陂" -> to "被") */
  suggestedFix?: { from: string; to: string };
}

export interface CroppedQuestionImage {
  questionNumber: number;
  blob: Blob;
  previewUrl: string;
  filename: string;
}

export interface ParsedExamBundleResult {
  code: string;
  level: number;
  title: string;
  description: string;
  totalDurationMin: number;
  audioDurationSec?: number;
  sections: ExamSection[];
  warnings: ParsedExamWarning[];
  stats: {
    totalQuestions: number;
    listeningCount: number;
    readingCount: number;
    writingCount: number;
    answersMatched: number;
    transcriptsMatched: number;
    imagesCropped: number;
  };
  croppedImages: CroppedQuestionImage[];
}

export interface ClassifiedExamFiles {
  examPdf: File | null;
  answerPdf: File | null;
  transcriptPdf: File | null;
  audioFile: File | null;
}

export interface ParsedTranscriptData {
  /** Per-question individual transcripts (Q1-30) */
  byQuestion: Map<number, { transcript: string; spokenQuestion?: string }>;
  /** Grouped passage transcripts (Q31-45), keyed by range start question number */
  groups: Array<{
    start: number;
    end: number;
    transcript: string;
    questions: Map<number, string>;
  }>;
}

// --- Grading & Local Session ---

export type OfficialExamMode = 'full' | 'listening' | 'reading' | 'writing';
export type OfficialSessionPhase = 'idle' | 'taking' | 'result';

export interface FlattenedExamQuestion {
  sectionKey: ExamSectionKey;
  sectionTitle: string;
  partNumber: number;
  partTitle: string;
  partInstruction?: string;
  questionFormat: ExamQuestionFormat;
  groupId: string;
  groupRangeLabel?: string;
  groupPassage?: string;
  groupTranscript?: string;
  question: ExamQuestionItem;
}

export interface GradedOfficialQuestion {
  flat: FlattenedExamQuestion;
  userAnswer: string;
  isMcq: boolean;
  isSelfCheck: boolean;
  isCorrect: boolean;
  isUnanswered: boolean;
  /** Keyword usage breakdown for Q99 */
  matchedKeywords?: string[];
  missingKeywords?: string[];
  /** Chinese char count for essay questions Q99-100 */
  hanziCount?: number;
  /** Character-level LCS diff for incorrect Q91-98 reorder answers */
  diffSegments?: DiffCharSegment[];
}

export interface SectionScoreBreakdown {
  key: ExamSectionKey;
  title: string;
  totalQuestions: number;
  autoGradedTotal: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  essayCount: number;
  /** Scaled 0–100 HSK section score (essays contribute via completion + keyword heuristic) */
  score100: number;
}

export interface OfficialExamGradeResult {
  examId: string;
  examTitle: string;
  examCode: string;
  mode: OfficialExamMode;
  totalQuestions: number;
  answeredCount: number;
  autoCorrectCount: number;
  autoTotalCount: number;
  essayCount: number;
  /** Standard HSK 300-point scale when full exam; proportional 100-point per active section */
  totalScore: number;
  maxScore: number;
  passScore: number;
  passed: boolean;
  sections: SectionScoreBreakdown[];
  items: GradedOfficialQuestion[];
}

export interface LocalOfficialExamDraft {
  examId: string;
  level: number;
  mode: OfficialExamMode;
  strictAudio: boolean;
  activeSection: ExamSectionKey;
  answers: Record<number, string>;
  flagged: Record<number, boolean>;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  audioTimeSec: number;
  updatedAt: string;
}

export interface LocalOfficialExamAttempt {
  id: string;
  examId: string;
  examCode: string;
  examTitle: string;
  level: number;
  mode: OfficialExamMode;
  totalScore: number;
  maxScore: number;
  passed: boolean;
  autoCorrectCount: number;
  autoTotalCount: number;
  sectionScores: Record<string, number>;
  elapsedSeconds: number;
  completedAt: string;
  answers: Record<number, string>;
}

// --- Importer Store ---

export type ImporterBusyStage = 'idle' | 'parsing' | 'uploading';

export interface ExamImporterDraft {
  files: ClassifiedExamFiles;
  parsed: ParsedExamBundleResult | null;
  isOpen: boolean;
  updatedAt: number;
}

export interface ExamImporterStoreState {
  draftsByLevel: Record<number, ExamImporterDraft>;
  busyStage: ImporterBusyStage;
  busyLevel: number | null;
  busyMessage: string;
  uploadPct: number;

  setOpen: (level: number, isOpen: boolean) => void;
  setFiles: (
    level: number,
    updater: ClassifiedExamFiles | ((prev: ClassifiedExamFiles) => ClassifiedExamFiles),
  ) => void;
  setParsed: (
    level: number,
    updater:
      | ParsedExamBundleResult
      | null
      | ((prev: ParsedExamBundleResult | null) => ParsedExamBundleResult | null),
    revokeOld?: boolean,
  ) => void;
  clearDraft: (level: number) => void;
  pruneExpired: (level: number) => void;
  setBusy: (
    stage: ImporterBusyStage,
    opts?: { level?: number | null; message?: string; uploadPct?: number },
  ) => void;
}
