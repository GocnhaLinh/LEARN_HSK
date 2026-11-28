import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { coursesApi } from '@/features/courses/api/courses.api';
import type { BulkImportInput } from '@/features/courses/types';
import { exercisesKeys } from '@/features/exercises/hooks/useExercisesQuery';
import { vocabKeys } from '@/features/vocab/hooks/useVocab';
import { spawnConfetti, spawnFloatingXP } from '@/lib/fx-utils';
import { useToastStore } from '@/stores/toast.store';
import type { ExerciseItem, Lesson, VocabWord } from '@/types';

const STORAGE_KEY = 'hsk_quest_30_clean_v4';

export const coursesKeys = {
  all: ['courses'] as const,
  lessons: ['courses', 'lessons'] as const,
};

function readCachedLessons(): Lesson[] | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.lessons) ? parsed.lessons : undefined;
  } catch {
    return undefined;
  }
}

/** Query: lessons list hydrated via /api/bootstrap with localStorage fallback */
export function useCourses(enabled = true) {
  return useQuery<Lesson[]>({
    queryKey: coursesKeys.lessons,
    queryFn: () => coursesApi.getLessons(),
    initialData: readCachedLessons,
    enabled,
  });
}

/** Mutation: bulk-import lessons, vocab & exercises into MongoDB HSK{level} (+30 XP) */
export function useBulkImportLessons() {
  const qc = useQueryClient();
  const { syncProfile } = useApp();

  return useMutation({
    mutationFn: ({
      level,
      baseTitle,
      splitSize,
      picked,
      autoGenerateExercises = true,
      extractedExercises = [],
    }: BulkImportInput) =>
      coursesApi.bulkImportLessons({
        level,
        baseTitle,
        splitSize,
        autoGenerateExercises,
        words: picked.map((item) => ({
          hanzi: item.hanzi,
          pinyin: item.pinyin,
          english: item.english,
          meaning: item.meaning,
          exampleZh: item.exampleZh,
          exampleVi: item.exampleVi,
        })),
        extractedExercises,
      }),

    onSuccess: (res, vars) => {
      if (Array.isArray(res.lessons) && res.lessons.length) {
        qc.setQueryData<Lesson[]>(coursesKeys.lessons, (prev = []) => [...res.lessons, ...prev]);
      }
      if (Array.isArray(res.words) && res.words.length) {
        qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) => [...res.words, ...prev]);
      }
      let createdExerciseCount = 0;
      if (Array.isArray(res.exercises) && res.exercises.length) {
        qc.setQueryData<ExerciseItem[]>(exercisesKeys.byLevel(vars.level), (prev = []) => [
          ...res.exercises,
          ...prev,
        ]);
        void qc.invalidateQueries({ queryKey: exercisesKeys.byLevel(vars.level) });
        createdExerciseCount = res.exercises.length;
      }
      if (res.profile) syncProfile(res.profile);

      const chunkSize = vars.splitSize > 0 ? vars.splitSize : Math.max(1, vars.picked.length);
      const totalChunks =
        vars.picked.length > 0
          ? Math.ceil(vars.picked.length / chunkSize)
          : (vars.extractedExercises?.length ?? 0) > 0
            ? 1
            : 0;
      const summary =
        vars.picked.length > 0
          ? `Đã lưu ${vars.picked.length} từ (${totalChunks} bài)${
              createdExerciseCount > 0 ? ` & ${createdExerciseCount} bài tập tự nhập` : ''
            } vào MongoDB HSK ${vars.level}`
          : `Đã lưu ${createdExerciseCount} câu bài tập vào MongoDB HSK ${vars.level}`;

      spawnFloatingXP(30);
      spawnConfetti(undefined, 12);
      useToastStore.getState().showToast(`${summary} (+30 XP)`, 'yellow');
    },

    onError: (err: Error) => {
      useToastStore
        .getState()
        .showToast(
          `Không kết nối được Backend (${err?.message || 'Port 3001 chưa chạy'}) — chưa lưu vào MongoDB! Hãy kiểm tra terminal npm run dev:be.`,
          'pink',
        );
    },
  });
}
