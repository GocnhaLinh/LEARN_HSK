import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/features/courses/api/courses.api';
import type { BulkImportInput } from '@/features/courses/types';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import { spawnConfetti, spawnFloatingXP } from '@/lib/fx-utils';
import { coursesKeys, exercisesKeys, vocabKeys } from '@/lib/query-keys';
import { readAppCacheArray } from '@/lib/storage-cache';
import { useToastStore } from '@/stores/toast.store';
import type { ExerciseItem, Lesson, VocabWord } from '@/types';

export { coursesKeys };

/** Query: lessons list hydrated via /api/bootstrap with localStorage fallback */
export function useCourses(enabled = true) {
  return useQuery<Lesson[]>({
    queryKey: coursesKeys.lessons,
    queryFn: () => coursesApi.getLessons(),
    initialData: () => readAppCacheArray<Lesson>('lessons'),
    enabled,
  });
}

/** Mutation: bulk-import lessons, vocab & exercises into MongoDB HSK{level} (+30 XP) */
export function useBulkImportLessons() {
  const qc = useQueryClient();

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
        qc.setQueryData<ExerciseItem[]>(exercisesKeys.all, (prev) =>
          prev ? [...res.exercises, ...prev] : prev,
        );
        void qc.invalidateQueries({ queryKey: exercisesKeys.byLevel(vars.level) });
        createdExerciseCount = res.exercises.length;
      }
      if (res.profile) useProfileStore.getState().syncProfile(res.profile);

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
