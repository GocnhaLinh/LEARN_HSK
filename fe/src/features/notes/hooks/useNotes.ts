import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '@/features/notes/api/notes.api';
import type { SaveNotePayload } from '@/features/notes/types';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import { EffectCoords, spawnFloatingXP } from '@/lib/fx-utils';
import { notesKeys } from '@/lib/query-keys';
import { readAppCacheArray } from '@/lib/storage-cache';
import { useToastStore } from '@/stores/toast.store';
import type { MindNote } from '@/types';

export const NOTE_TAGS = ['Nhật ký', 'Ngữ pháp', 'Mẹo nhớ'] as const;
export const NOTE_SNIPPETS = ['，', '。', '？', '「」', '〔〕'] as const;

export { notesKeys };

/** Query: fetch all notes (hydrated from /api/bootstrap or localStorage fallback) */
export function useNotes() {
  return useQuery<MindNote[]>({
    queryKey: notesKeys.list,
    queryFn: notesApi.getNotes,
    initialData: () => readAppCacheArray<MindNote>('notes'),
    initialDataUpdatedAt: 0,
  });
}

/** Mutation: create a new note (+10 XP) */
export function useCreateNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }: { payload: SaveNotePayload; coords?: EffectCoords }) =>
      notesApi.createNote(payload),

    onMutate: async ({ payload, coords }) => {
      await qc.cancelQueries({ queryKey: notesKeys.list });
      const optimistic: MindNote = {
        id: `note_${Date.now()}`,
        title: payload.title,
        tag: payload.tag,
        content: payload.content,
        date: new Date().toLocaleDateString('vi-VN'),
      };
      qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) => [optimistic, ...prev]);
      useProfileStore.getState().syncProfile((prev) => ({ ...prev, xp: prev.xp + 10 }));
      spawnFloatingXP(10, coords);
      return { optimisticId: optimistic.id };
    },

    onSuccess: (res, _vars, ctx) => {
      if (res?.note && ctx?.optimisticId) {
        qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) =>
          prev.map((n) => (n.id === ctx.optimisticId ? res.note : n)),
        );
      }
      if (res?.profile) useProfileStore.getState().syncProfile(res.profile);
      useToastStore.getState().showToast('Đã lưu ghi chú mới (+10 XP)', 'yellow');
    },

    onError: () => {
      // Keep optimistic note locally so offline mode still works
      useToastStore.getState().showToast('Đã lưu ghi chú (chế độ offline, +10 XP)', 'yellow');
    },
  });
}

/** Mutation: update an existing note */
export function useUpdateNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SaveNotePayload }) =>
      notesApi.updateNote(id, payload),

    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: notesKeys.list });
      qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) =>
        prev.map((n) => (n.id === id ? { ...n, ...payload } : n)),
      );
    },

    onSuccess: (updated, { id }) => {
      if (updated?.id) {
        qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) =>
          prev.map((n) => (n.id === id ? updated : n)),
        );
      }
      useToastStore.getState().showToast('Đã cập nhật ghi chú');
    },

    onError: () => {
      useToastStore.getState().showToast('Đã cập nhật ghi chú (offline)');
    },
  });
}

/** Mutation: delete a note by id */
export function useDeleteNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesApi.deleteNote(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notesKeys.list });
      qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) => prev.filter((n) => n.id !== id));
    },

    onSuccess: () => {
      useToastStore.getState().showToast('Đã xóa ghi chú');
    },

    onError: () => {
      useToastStore.getState().showToast('Đã xóa ghi chú (offline)');
    },
  });
}
