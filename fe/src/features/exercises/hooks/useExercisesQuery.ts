import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { coursesApi } from '@/features/courses/api/courses.api';
import type { ExerciseItem } from '@/types';

export const exercisesKeys = {
  all: ['courses', 'exercises'] as const,
  byLevel: (level: number) => ['courses', 'exercises', level] as const,
};

/**
 * Read-only query for all exercises in a given HSK level.
 * Uses hydrated AppContext data immediately when available, and refreshes
 * via GET /api/exercises?level=X with ZERO write/mutation calls to MongoDB.
 */
export function useExercisesQuery(level: number) {
  const { exercises: hydratedAll } = useApp();

  const hydratedForLevel = useMemo(
    () => hydratedAll.filter((ex) => ex.level === level),
    [hydratedAll, level],
  );

  return useQuery<ExerciseItem[]>({
    queryKey: exercisesKeys.byLevel(level),
    queryFn: async () => {
      try {
        const remote = await coursesApi.getExercises(level);
        return Array.isArray(remote) ? remote : hydratedForLevel;
      } catch {
        // Fallback to already-hydrated exercises if backend is temporarily offline
        return hydratedForLevel;
      }
    },
    initialData: hydratedForLevel.length > 0 ? hydratedForLevel : undefined,
    initialDataUpdatedAt: hydratedForLevel.length > 0 ? Date.now() - 30_000 : 0,
    staleTime: 60_000,
  });
}
