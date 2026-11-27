import type { CreateHandwritingPayload } from "@/features/writing/types";
import apiClient from "@/lib/api/client";
import type { HandwritingItem, UserProfile } from "@/types";

export const handwritingApi = {
  getHandwriting: async (): Promise<HandwritingItem[]> => {
    const { data } = await apiClient.get<HandwritingItem[]>("/handwriting");
    return data;
  },

  createHandwriting: async (
    payload: CreateHandwritingPayload,
  ): Promise<{ item: HandwritingItem; profile: UserProfile }> => {
    const { data } = await apiClient.post<{
      item: HandwritingItem;
      profile: UserProfile;
    }>("/handwriting", payload);
    return data;
  },

  deleteHandwriting: async (
    id: string,
  ): Promise<{ deleted: boolean; id: string }> => {
    const { data } = await apiClient.delete<{ deleted: boolean; id: string }>(
      `/handwriting/${id}`,
    );
    return data;
  },
};
