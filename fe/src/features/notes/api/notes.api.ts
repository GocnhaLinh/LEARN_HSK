import type { SaveNotePayload } from "@/features/notes/types";
import apiClient from "@/lib/api/client";
import type { MindNote, UserProfile } from "@/types";

export const notesApi = {
  getNotes: async (): Promise<MindNote[]> => {
    const { data } = await apiClient.get<MindNote[]>("/notes");
    return data;
  },

  createNote: async (
    payload: SaveNotePayload,
  ): Promise<{ note: MindNote; profile: UserProfile }> => {
    const { data } = await apiClient.post<{
      note: MindNote;
      profile: UserProfile;
    }>("/notes", payload);
    return data;
  },

  updateNote: async (
    id: string,
    payload: SaveNotePayload,
  ): Promise<MindNote> => {
    const { data } = await apiClient.patch<MindNote>(`/notes/${id}`, payload);
    return data;
  },

  deleteNote: async (id: string): Promise<{ deleted: boolean; id: string }> => {
    const { data } = await apiClient.delete<{ deleted: boolean; id: string }>(
      `/notes/${id}`,
    );
    return data;
  },
};
