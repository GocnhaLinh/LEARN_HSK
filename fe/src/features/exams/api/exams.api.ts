import type {
  ImportOfficialExamInput,
  MediaStorageStatus,
  OfficialExam,
  OfficialExamSummary,
} from "@/features/exams/types";
import apiClient from "@/lib/api/client";

export const examsApi = {
  getMediaStatus: async (): Promise<MediaStorageStatus> => {
    const { data } = await apiClient.get<MediaStorageStatus>(
      "/exams/media/status",
    );
    return data;
  },

  listByLevel: async (level?: number): Promise<OfficialExamSummary[]> => {
    const { data } = await apiClient.get<OfficialExamSummary[]>("/exams", {
      params: level ? { level } : undefined,
    });
    return Array.isArray(data) ? data : [];
  },

  getById: async (id: string): Promise<OfficialExam> => {
    const { data } = await apiClient.get<OfficialExam>(
      `/exams/${encodeURIComponent(id)}`,
    );
    return data;
  },

  importExam: async ({
    payload,
    audioFile,
    questionImages,
    onUploadProgress,
  }: ImportOfficialExamInput): Promise<OfficialExam> => {
    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    if (audioFile) {
      formData.append("audio", audioFile, audioFile.name);
    }
    if (questionImages?.length) {
      questionImages.forEach(({ questionNumber, blob, filename }) => {
        const safeName = filename || `q${questionNumber}.webp`;
        formData.append("images", blob, safeName);
      });
    }

    const { data } = await apiClient.post<OfficialExam>(
      "/exams/import",
      formData,
      {
        headers: {
          // Override default application/json so browser attaches multipart boundary
          "Content-Type": undefined,
        },
        timeout: 300_000, // 5 min for large MP3 ffmpeg compression + Cloudinary upload
        onUploadProgress: (evt) => {
          if (!onUploadProgress || !evt.total) return;
          const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
          onUploadProgress(pct);
        },
      },
    );
    return data;
  },

  remove: async (
    id: string,
  ): Promise<{ deleted: boolean; id: string; deletedAssets: number }> => {
    const { data } = await apiClient.delete<{
      deleted: boolean;
      id: string;
      deletedAssets: number;
    }>(`/exams/${encodeURIComponent(id)}`);
    return data;
  },
};
