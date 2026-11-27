import apiClient from '@/lib/api/client';

export type MediaStorageProvider = 'cloudinary' | 'gridfs';
export type ExamSectionKey = 'listening' | 'reading' | 'writing';
export type ExamQuestionFormat =
  | 'listening_mcq'
  | 'reading_cloze'
  | 'reading_short'
  | 'reading_long'
  | 'writing_reorder'
  | 'writing_keywords'
  | 'writing_picture';

export interface MediaStorageStatus {
  provider: MediaStorageProvider;
  configured: boolean;
  connected: boolean;
  cloudName?: string;
  folder: string;
  error?: string;
}

export interface ExamQuestionItem {
  number: number;
  prompt?: string;
  options?: string[];
  correctAnswer: string;
  transcript?: string;
  explanation?: string;
  wordTiles?: string[];
  keywords?: string[];
  imageUrl?: string;
  minChars?: number;
  audioStartSec?: number;
  audioEndSec?: number;
}

export interface ExamQuestionGroup {
  groupId: string;
  rangeLabel?: string;
  passage?: string;
  transcript?: string;
  audioStartSec?: number;
  audioEndSec?: number;
  questions: ExamQuestionItem[];
}

export interface ExamPart {
  partNumber: number;
  title: string;
  instruction?: string;
  questionFormat: ExamQuestionFormat;
  groups: ExamQuestionGroup[];
}

export interface ExamSection {
  key: ExamSectionKey;
  title: string;
  durationMin: number;
  parts: ExamPart[];
}

export interface OfficialExam {
  id: string;
  code: string;
  level: number;
  title: string;
  description: string;
  totalQuestions: number;
  totalDurationMin: number;
  audioUrl?: string;
  audioStorage?: MediaStorageProvider;
  audioDurationSec?: number;
  sections: ExamSection[];
  createdAt?: string;
}

export interface OfficialExamSummary {
  id: string;
  code: string;
  level: number;
  title: string;
  description: string;
  totalQuestions: number;
  totalDurationMin: number;
  audioUrl?: string;
  audioStorage?: MediaStorageProvider;
  audioDurationSec?: number;
  sectionCounts: Record<string, number>;
  createdAt?: string;
}

export interface ImportOfficialExamPayload {
  code: string;
  level: number;
  title: string;
  description?: string;
  totalDurationMin?: number;
  audioDurationSec?: number;
  sections: ExamSection[];
}

export interface ImportOfficialExamInput {
  payload: ImportOfficialExamPayload;
  audioFile?: File | null;
  questionImages?: Array<{ questionNumber: number; blob: Blob; filename?: string }>;
  onUploadProgress?: (pct: number) => void;
}

export const examsApi = {
  getMediaStatus: async (): Promise<MediaStorageStatus> => {
    const { data } = await apiClient.get<MediaStorageStatus>('/exams/media/status');
    return data;
  },

  listByLevel: async (level?: number): Promise<OfficialExamSummary[]> => {
    const { data } = await apiClient.get<OfficialExamSummary[]>('/exams', {
      params: level ? { level } : undefined,
    });
    return Array.isArray(data) ? data : [];
  },

  getById: async (id: string): Promise<OfficialExam> => {
    const { data } = await apiClient.get<OfficialExam>(`/exams/${encodeURIComponent(id)}`);
    return data;
  },

  importExam: async ({
    payload,
    audioFile,
    questionImages,
    onUploadProgress,
  }: ImportOfficialExamInput): Promise<OfficialExam> => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    if (audioFile) {
      formData.append('audio', audioFile, audioFile.name);
    }
    if (questionImages?.length) {
      questionImages.forEach(({ questionNumber, blob, filename }) => {
        const safeName = filename || `q${questionNumber}.webp`;
        formData.append('images', blob, safeName);
      });
    }

    const { data } = await apiClient.post<OfficialExam>('/exams/import', formData, {
      headers: {
        // Override default application/json so browser attaches multipart boundary
        'Content-Type': undefined,
      },
      timeout: 300_000, // 5 min for large MP3 ffmpeg compression + Cloudinary upload
      onUploadProgress: (evt) => {
        if (!onUploadProgress || !evt.total) return;
        const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
        onUploadProgress(pct);
      },
    });
    return data;
  },

  remove: async (id: string): Promise<{ deleted: boolean; id: string; deletedAssets: number }> => {
    const { data } = await apiClient.delete<{
      deleted: boolean;
      id: string;
      deletedAssets: number;
    }>(`/exams/${encodeURIComponent(id)}`);
    return data;
  },
};
