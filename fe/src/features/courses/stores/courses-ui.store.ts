import { create } from 'zustand';
import type { CourseImporterDraft, CoursesUiStore } from '@/features/courses/types';

export const EMPTY_IMPORTER_DRAFT: CourseImporterDraft = {
  extractedPreview: [],
  extractedExercises: [],
  autoGenerateExercises: true,
  lessonBaseName: '',
  splitSize: 50,
  extractSearch: '',
};

const getDraft = (map: Record<number, CourseImporterDraft>, level: number): CourseImporterDraft =>
  map[level] ?? EMPTY_IMPORTER_DRAFT;

export const useCoursesUiStore = create<CoursesUiStore>((set) => ({
  expandedLessons: {},
  importerDraftByLevel: {},

  toggleLesson: (lessonId, defaultOpen) =>
    set((s) => ({
      expandedLessons: {
        ...s.expandedLessons,
        [lessonId]: !(lessonId in s.expandedLessons ? s.expandedLessons[lessonId] : defaultOpen),
      },
    })),

  setLessonsExpanded: (lessonIds, open) =>
    set((s) => {
      const next = { ...s.expandedLessons };
      for (const id of lessonIds) next[id] = open;
      return { expandedLessons: next };
    }),

  openImporterPreview: (level, items, exercises, defaultName) =>
    set((s) => ({
      importerDraftByLevel: {
        ...s.importerDraftByLevel,
        [level]: {
          extractedPreview: items,
          extractedExercises: exercises,
          autoGenerateExercises: getDraft(s.importerDraftByLevel, level).autoGenerateExercises,
          lessonBaseName: defaultName,
          splitSize: items.length > 60 ? 50 : items.length > 25 ? 25 : 0,
          extractSearch: '',
        },
      },
    })),

  patchImporterDraft: (level, patch) =>
    set((s) => ({
      importerDraftByLevel: {
        ...s.importerDraftByLevel,
        [level]: { ...getDraft(s.importerDraftByLevel, level), ...patch },
      },
    })),

  updatePreviewField: (level, idx, field, value) =>
    set((s) => {
      const cur = getDraft(s.importerDraftByLevel, level);
      return {
        importerDraftByLevel: {
          ...s.importerDraftByLevel,
          [level]: {
            ...cur,
            extractedPreview: cur.extractedPreview.map((row, i) =>
              i === idx ? { ...row, [field]: value } : row,
            ),
          },
        },
      };
    }),

  updateExerciseField: (level, idx, field, value) =>
    set((s) => {
      const cur = getDraft(s.importerDraftByLevel, level);
      return {
        importerDraftByLevel: {
          ...s.importerDraftByLevel,
          [level]: {
            ...cur,
            extractedExercises: cur.extractedExercises.map((row, i) =>
              i === idx ? { ...row, [field]: value } : row,
            ),
          },
        },
      };
    }),

  toggleAllExtracted: (level, checked) =>
    set((s) => {
      const cur = getDraft(s.importerDraftByLevel, level);
      return {
        importerDraftByLevel: {
          ...s.importerDraftByLevel,
          [level]: {
            ...cur,
            extractedPreview: cur.extractedPreview.map((r) => ({ ...r, selected: checked })),
            extractedExercises: cur.extractedExercises.map((r) => ({ ...r, selected: checked })),
          },
        },
      };
    }),

  clearImporterDraft: (level) =>
    set((s) => ({
      importerDraftByLevel: {
        ...s.importerDraftByLevel,
        [level]: { ...EMPTY_IMPORTER_DRAFT },
      },
    })),
}));
