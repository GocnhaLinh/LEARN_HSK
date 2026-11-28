import { useQuery, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/features/courses/api/courses.api';
import { normalizeExamQuestion } from '@/features/exercises/utils/exam-utils';
import { exercisesKeys } from '@/lib/query-keys';
import type { ExerciseItem } from '@/types';

export { exercisesKeys };

/** Stable top-level selector so React Query v5 memoizes normalization across renders/timer ticks */
const normalizeExamList = (items: ExerciseItem[]) => items.map(normalizeExamQuestion);

/**
 * Read-only query for all exercises in a given HSK level.
 * Uses hydrated React Query bootstrap data immediately when available, normalizes every question
 * into a Vietnamese-only typed-input prompt, and refreshes via GET /api/exercises?level=X.
 */
export function useExercisesQuery(level: number) {
  const qc = useQueryClient();

  return useQuery<ExerciseItem[]>({
    queryKey: exercisesKeys.byLevel(level),
    queryFn: async () => {
      try {
        const remote = await coursesApi.getExercises(level);
        if (Array.isArray(remote)) return remote;
      } catch {
        // Fallback to already-hydrated exercises if backend is temporarily offline
      }
      return (
        qc.getQueryData<ExerciseItem[]>(exercisesKeys.byLevel(level)) ??
        qc.getQueryData<ExerciseItem[]>(exercisesKeys.all)?.filter((ex) => ex.level === level) ??
        []
      );
    },
    select: normalizeExamList,
    initialData: () => {
      const all = qc.getQueryData<ExerciseItem[]>(exercisesKeys.all);
      const forLevel = all?.filter((ex) => ex.level === level);
      return forLevel && forLevel.length > 0 ? forLevel : undefined;
    },
    initialDataUpdatedAt: () => qc.getQueryState(exercisesKeys.all)?.dataUpdatedAt ?? 0,
    staleTime: 60_000,
  });
}
