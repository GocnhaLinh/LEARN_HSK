import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { notesApi, SaveNotePayload } from '@/features/notes/api/notes.api';
import { EffectCoords, spawnFloatingXP } from '@/lib/fx-utils';
import { useToastStore } from '@/stores/toast.store';
import type { MindNote } from '@/types';

const STORAGE_KEY = 'hsk_quest_30_clean_v4';

export const NOTE_TAGS = ['Nhật ký', 'Ngữ pháp', 'Mẹo nhớ'] as const;
export const NOTE_SNIPPETS = ['，', '。', '？', '「」', '〔〕'] as const;

export const notesKeys = {
  all: ['notes'] as const,
  list: ['notes', 'list'] as const,
};

function readCachedNotes(): MindNote[] | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.notes) ? parsed.notes : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedNotes(notes: MindNote[]): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, notes }));
  } catch {
    // ignore storage quota errors
  }
}

/** Query: fetch all notes (hydrated from /api/bootstrap or localStorage fallback) */
export function useNotes() {
  return useQuery<MindNote[]>({
    queryKey: notesKeys.list,
    queryFn: async () => {
      const data = await notesApi.getNotes();
      writeCachedNotes(data);
      return data;
    },
    initialData: readCachedNotes,
    initialDataUpdatedAt: 0,
  });
}

/** Mutation: create a new note (+10 XP) */
export function useCreateNote() {
  const qc = useQueryClient();
  const { syncProfile } = useApp();

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
      qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) => {
        const next = [optimistic, ...prev];
        writeCachedNotes(next);
        return next;
      });
      syncProfile((prev) => ({ ...prev, xp: prev.xp + 10 }));
      spawnFloatingXP(10, coords);
      return { optimisticId: optimistic.id };
    },

    onSuccess: (res, _vars, ctx) => {
      if (res?.note && ctx?.optimisticId) {
        qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) => {
          const next = prev.map((n) => (n.id === ctx.optimisticId ? res.note : n));
          writeCachedNotes(next);
          return next;
        });
      }
      if (res?.profile) syncProfile(res.profile);
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
      qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) => {
        const next = prev.map((n) => (n.id === id ? { ...n, ...payload } : n));
        writeCachedNotes(next);
        return next;
      });
    },

    onSuccess: (updated, { id }) => {
      if (updated?.id) {
        qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) => {
          const next = prev.map((n) => (n.id === id ? updated : n));
          writeCachedNotes(next);
          return next;
        });
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
      qc.setQueryData<MindNote[]>(notesKeys.list, (prev = []) => {
        const next = prev.filter((n) => n.id !== id);
        writeCachedNotes(next);
        return next;
      });
    },

    onSuccess: () => {
      useToastStore.getState().showToast('Đã xóa ghi chú');
    },

    onError: () => {
      useToastStore.getState().showToast('Đã xóa ghi chú (offline)');
    },
  });
}
