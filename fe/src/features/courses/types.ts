import type {
  ExerciseItem,
  ExtractedExerciseRow,
  ExtractedVocabRow,
  Lesson,
  UserProfile,
  VocabWord,
} from '@/types';

export interface BulkImportLessonsPayload {
  level: number;
  baseTitle: string;
  splitSize: number;
  autoGenerateExercises?: boolean;
  words: Array<{
    hanzi: string;
    pinyin?: string;
    english?: string;
    meaning?: string;
    exampleZh?: string;
    exampleVi?: string;
  }>;
  extractedExercises?: Array<{
    exerciseType?: 'translate' | 'fill_blank' | 'writing' | 'listen' | 'quiz';
    title: string;
    question: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
    xpReward?: number;
  }>;
}

export interface BulkImportLessonsResponse {
  lessons: Lesson[];
  words: VocabWord[];
  exercises: ExerciseItem[];
  totalChunks: number;
  totalWords: number;
  totalExercises: number;
  profile: UserProfile;
}

export interface BulkImportInput {
  level: number;
  baseTitle: string;
  splitSize: number;
  picked: ExtractedVocabRow[];
  autoGenerateExercises?: boolean;
  extractedExercises?: ExtractedExerciseRow[];
}

export interface CourseLevelStats {
  lessons: number;
  words: number;
  mastered: number;
}

export interface CourseImporterDraft {
  extractedPreview: ExtractedVocabRow[];
  extractedExercises: ExtractedExerciseRow[];
  autoGenerateExercises: boolean;
  lessonBaseName: string;
  splitSize: number;
  extractSearch: string;
}

export interface CoursesUiStore {
  expandedLessons: Record<string, boolean>;
  importerDraftByLevel: Record<number, CourseImporterDraft>;
  toggleLesson: (lessonId: string, defaultOpen: boolean) => void;
  setLessonsExpanded: (lessonIds: string[], open: boolean) => void;
  openImporterPreview: (
    level: number,
    items: ExtractedVocabRow[],
    exercises: ExtractedExerciseRow[],
    defaultName: string,
  ) => void;
  patchImporterDraft: (level: number, patch: Partial<CourseImporterDraft>) => void;
  updatePreviewField: <K extends keyof ExtractedVocabRow>(
    level: number,
    idx: number,
    field: K,
    value: ExtractedVocabRow[K],
  ) => void;
  updateExerciseField: <K extends keyof ExtractedExerciseRow>(
    level: number,
    idx: number,
    field: K,
    value: ExtractedExerciseRow[K],
  ) => void;
  toggleAllExtracted: (level: number, checked: boolean) => void;
  clearImporterDraft: (level: number) => void;
}
