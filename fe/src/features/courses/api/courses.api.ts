import apiClient from "@/lib/api/client";
import type { ExerciseItem, Lesson, UserProfile, VocabWord } from "@/types";

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
    exerciseType?: "quiz" | "fill_blank" | "listen" | "translate";
    title: string;
    question: string;
    options: string[];
    correctAnswer: string;
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

export interface SubmitExerciseResponse {
  correct: boolean;
  alreadyCompleted?: boolean;
  correctAnswer: string;
  explanation: string;
  xpEarned: number;
  exercise: ExerciseItem;
  profile: UserProfile | null;
}

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

  submitExercise: async (
    id: string,
    answer: string,
  ): Promise<SubmitExerciseResponse> => {
    const { data } = await apiClient.post<SubmitExerciseResponse>(
      `/exercises/${id}/submit`,
      {
        answer,
      },
    );
    return data;
  },
};
