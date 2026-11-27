import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { examsApi } from '@/features/exams/api/exams.api';
import type {
  ImportOfficialExamInput,
  MediaStorageStatus,
  OfficialExam,
  OfficialExamSummary,
} from '@/features/exams/types';

export const examsKeys = {
  all: ['exams'] as const,
  mediaStatus: ['exams', 'media-status'] as const,
  byLevel: (level: number) => ['exams', 'list', level] as const,
  detail: (id: string) => ['exams', 'detail', id] as const,
};

export function useExamsByLevel(level: number) {
  return useQuery<OfficialExamSummary[]>({
    queryKey: examsKeys.byLevel(level),
    queryFn: () => examsApi.listByLevel(level),
    staleTime: 60_000,
  });
}

export function useExamDetail(id: string | null) {
  return useQuery<OfficialExam>({
    queryKey: examsKeys.detail(id || ''),
    queryFn: () => examsApi.getById(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}

export function useMediaStorageStatus(enabled = true) {
  return useQuery<MediaStorageStatus>({
    queryKey: examsKeys.mediaStatus,
    queryFn: () => examsApi.getMediaStatus(),
    enabled,
    staleTime: 120_000,
    retry: 1,
  });
}

export function useImportExamMutation(level: number) {
  const queryClient = useQueryClient();
  const { showToast } = useApp();

  return useMutation({
    mutationFn: (input: ImportOfficialExamInput) => examsApi.importExam(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: examsKeys.byLevel(level) });
      queryClient.setQueryData(examsKeys.detail(created.id), created);
      showToast(
        `Đã lưu bộ đề "${created.title}" (${created.totalQuestions} câu) lên MongoDB${
          created.audioUrl ? ' & Cloudinary' : ''
        }!`,
        'yellow',
      );
    },
    onError: (err: Error) => {
      showToast(`Lưu đề thi thất bại: ${err.message}`, 'pink');
    },
  });
}

export function useDeleteExamMutation(level: number) {
  const queryClient = useQueryClient();
  const { showToast } = useApp();

  return useMutation({
    mutationFn: (id: string) => examsApi.remove(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: examsKeys.byLevel(level) });
      queryClient.removeQueries({ queryKey: examsKeys.detail(res.id) });
      showToast(
        res.deletedAssets > 0
          ? `Đã xóa đề thi và dọn ${res.deletedAssets} file media trên Cloudinary.`
          : 'Đã xóa bộ đề thi.',
        'dark',
      );
    },
    onError: (err: Error) => {
      showToast(`Xóa đề thi thất bại: ${err.message}`, 'pink');
    },
  });
}
