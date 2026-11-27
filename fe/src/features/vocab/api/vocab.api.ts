import type { CreateVocabPayload, UpdateVocabPayload } from "@/features/vocab/types";
import apiClient from "@/lib/api/client";
import type { UserProfile, VocabStatus, VocabWord } from "@/types";

export const vocabApi = {
  getVocab: async (): Promise<VocabWord[]> => {
    const { data } = await apiClient.get<VocabWord[]>("/vocab");
    return data;
  },

  createVocab: async (
    payload: CreateVocabPayload,
  ): Promise<{ word: VocabWord; profile: UserProfile }> => {
    const { data } = await apiClient.post<{
      word: VocabWord;
      profile: UserProfile;
    }>("/vocab", payload);
    return data;
  },

  updateVocab: async (
    id: string,
    payload: UpdateVocabPayload,
  ): Promise<VocabWord> => {
    const { data } = await apiClient.patch<VocabWord>(`/vocab/${id}`, payload);
    return data;
  },

  updateVocabStatus: async (
    id: string,
    status: VocabStatus,
    recordReview = false,
  ): Promise<{ word: VocabWord; profile: UserProfile | null }> => {
    const { data } = await apiClient.patch<{
      word: VocabWord;
      profile: UserProfile | null;
    }>(`/vocab/${id}/status`, { status, recordReview });
    return data;
  },

  batchUpdateVocabStatus: async (
    ids: string[],
    status: VocabStatus,
  ): Promise<{ updatedCount: number; status: VocabStatus }> => {
    const { data } = await apiClient.patch<{
      updatedCount: number;
      status: VocabStatus;
    }>("/vocab/batch/status", { ids, status });
    return data;
  },

  deleteVocab: async (
    id: string,
  ): Promise<{ deleted: boolean; id: string }> => {
    const { data } = await apiClient.delete<{ deleted: boolean; id: string }>(
      `/vocab/${id}`,
    );
    return data;
  },

  batchDeleteVocab: async (
    ids: string[],
  ): Promise<{ deletedCount: number }> => {
    const { data } = await apiClient.post<{ deletedCount: number }>(
      "/vocab/batch/delete",
      {
        ids,
      },
    );
    return data;
  },

  exportBackup: async (): Promise<unknown> => {
    const { data } = await apiClient.get<unknown>("/backup/export");
    return data;
  },

  importBackup: async (payload: unknown): Promise<unknown> => {
    const { data } = await apiClient.post<unknown>("/backup/import", payload, {
      timeout: 60_000,
    });
    return data;
  },
};
