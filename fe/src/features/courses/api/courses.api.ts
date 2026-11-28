import type {
  BulkImportLessonsPayload,
  BulkImportLessonsResponse,
} from "@/features/courses/types";
import apiClient from "@/lib/api/client";
import type { ExerciseItem, Lesson } from "@/types";

export const coursesApi = {
  getLessons: async (level?: number): Promise<Lesson[]> => {
    const { data } = await apiClient.get<Lesson[]>("/lessons", {
      params: level ? { level } : undefined,
    });
    return data;
  },

  bulkImportLessons: async (
    payload: BulkImportLessonsPayload,
  ): Promise<BulkImportLessonsResponse> => {
    const { data } = await apiClient.post<BulkImportLessonsResponse>(
      "/lessons/import",
      payload,
      {
        timeout: 60_000,
      },
    );
    return data;
  },

  getExercises: async (level?: number): Promise<ExerciseItem[]> => {
    const { data } = await apiClient.get<ExerciseItem[]>("/exercises", {
      params: level ? { level } : undefined,
    });
    return data;
  },
};
