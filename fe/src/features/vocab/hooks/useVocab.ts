import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { VOCAB_STATUS_LABELS } from '@/data/defaults';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import { vocabApi } from '@/features/vocab/api/vocab.api';
import type { VocabFormInput } from '@/features/vocab/types';
import { downloadBlob } from '@/features/vocab/utils/vocab-utils';
import { getTodayISO } from '@/lib/date-utils';
import { spawnFloatingXP } from '@/lib/fx-utils';
import { coursesKeys, notesKeys, vocabKeys } from '@/lib/query-keys';
import { readAppCacheArray } from '@/lib/storage-cache';
import { useToastStore } from '@/stores/toast.store';
import type { Lesson, MindNote, VocabStatus, VocabWord } from '@/types';

export { vocabKeys };

const TRIM_FIELDS = [
  'hanzi',
  'pinyin',
  'english',
  'meaning',
  'pos',
  'note',
  'exampleZh',
  'exampleVi',
] as const;

function normalizeVocabPatch(patch: Partial<VocabFormInput>): Partial<VocabWord> {
  const out: Partial<VocabWord> = { ...patch };
  for (const key of TRIM_FIELDS) {
    if (typeof patch[key] === 'string') out[key] = patch[key].trim();
  }
  if (typeof patch.hanviet === 'string') out.hanviet = patch.hanviet.trim().toUpperCase();
  return out;
}

/** Query: vocab list hydrated via /api/bootstrap with localStorage fallback */
export function useVocab(enabled = true) {
  return useQuery<VocabWord[]>({
    queryKey: vocabKeys.list,
    queryFn: vocabApi.getVocab,
    initialData: () => readAppCacheArray<VocabWord>('vocab'),
    enabled,
  });
}

/** Mutation: add a custom word (+10 XP) */
export function useAddVocab() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: VocabFormInput) =>
      vocabApi.createVocab({ ...input, ...normalizeVocabPatch(input) }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: vocabKeys.list });
      const lessons = qc.getQueryData<Lesson[]>(coursesKeys.lessons) || [];
      const defaultLesson = lessons.find((l) => l.level === input.level);
      const optimistic: VocabWord = {
        id: `cw_${Date.now()}`,
        lessonId: input.lessonId || defaultLesson?.id || `hsk${input.level}-l1`,
        hanzi: input.hanzi.trim(),
        pinyin: input.pinyin.trim(),
        hanviet: (input.hanviet || '').trim().toUpperCase() || 'TỰ THÊM',
        english: (input.english || '').trim(),
        meaning: input.meaning.trim(),
        pos: (input.pos || '').trim() || 'Từ vựng',
        level: input.level,
        status: input.status || 'new',
        custom: true,
        note: (input.note || '').trim() || 'Từ vựng cá nhân do bạn tự thêm.',
        exampleZh: (input.exampleZh || '').trim() || input.hanzi.trim(),
        exampleVi: (input.exampleVi || '').trim() || input.meaning.trim(),
      };
      qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) => [optimistic, ...prev]);
      useProfileStore.getState().syncProfile((prev) => ({ ...prev, xp: prev.xp + 10 }));
      spawnFloatingXP(10);
      useToastStore.getState().showToast(`Đã thêm từ "${optimistic.hanzi}" (+10 XP)`, 'yellow');
      return { optimisticId: optimistic.id };
    },
    onSuccess: (res, _vars, ctx) => {
      if (res?.word && ctx?.optimisticId) {
        qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) =>
          prev.map((w) => (w.id === ctx.optimisticId ? res.word : w)),
        );
      }
      if (res?.profile) useProfileStore.getState().syncProfile(res.profile);
    },
    onError: () => {},
  });
}

/** Mutation: edit an existing word */
export function useUpdateVocab() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VocabFormInput> }) =>
      vocabApi.updateVocab(id, normalizeVocabPatch(patch)),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: vocabKeys.list });
      const normalized = normalizeVocabPatch(patch);
      qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) =>
        prev.map((w) => (w.id === id ? { ...w, ...normalized } : w)),
      );
      useToastStore
        .getState()
        .showToast(`Đã lưu thay đổi cho "${normalized.hanzi || 'từ vựng'}"`, 'yellow');
    },
    onSuccess: (updated, { id }) => {
      if (updated?.id) {
        qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) =>
          prev.map((w) => (w.id === id ? { ...w, ...updated } : w)),
        );
      }
    },
    onError: () => {},
  });
}

/** Mutation: change status of a single word (no review XP) */
export function useChangeVocabStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VocabStatus }) =>
      vocabApi.updateVocabStatus(id, status, false),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: vocabKeys.list });
      const word = qc.getQueryData<VocabWord[]>(vocabKeys.list)?.find((w) => w.id === id);
      qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) =>
        prev.map((w) => (w.id === id ? { ...w, status } : w)),
      );
      if (word) useToastStore.getState().showToast(`Đã cập nhật trạng thái "${word.hanzi}"`);
    },
    onError: () => {},
  });
}

/** Mutation: batch change status for selected words */
export function useBatchVocabStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: VocabStatus }) => {
      try {
        await vocabApi.batchUpdateVocabStatus(ids, status);
      } catch {
        await Promise.allSettled(ids.map((id) => vocabApi.updateVocabStatus(id, status, false)));
      }
    },
    onMutate: async ({ ids, status }) => {
      const idSet = new Set(ids);
      if (!idSet.size) return;
      await qc.cancelQueries({ queryKey: vocabKeys.list });
      qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) =>
        prev.map((w) => (idSet.has(w.id) ? { ...w, status } : w)),
      );
      useToastStore
        .getState()
        .showToast(`Đã chuyển ${idSet.size} từ sang "${VOCAB_STATUS_LABELS[status]}"`, 'yellow');
    },
    onError: () => {},
  });
}

/** Mutation: delete a single word */
export function useDeleteVocab() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vocabApi.deleteVocab(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: vocabKeys.list });
      const target = qc.getQueryData<VocabWord[]>(vocabKeys.list)?.find((w) => w.id === id);
      qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) => prev.filter((w) => w.id !== id));
      useToastStore
        .getState()
        .showToast(target ? `Đã xóa từ "${target.hanzi}"` : 'Đã xóa từ vựng', 'pink');
    },
    onError: () => {},
  });
}

/** Mutation: batch delete selected words */
export function useBatchDeleteVocab() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      try {
        await vocabApi.batchDeleteVocab(ids);
      } catch {
        await Promise.allSettled(ids.map((id) => vocabApi.deleteVocab(id)));
      }
    },
    onMutate: async (ids) => {
      const idSet = new Set(ids);
      if (!idSet.size) return;
      await qc.cancelQueries({ queryKey: vocabKeys.list });
      qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) =>
        prev.filter((w) => !idSet.has(w.id)),
      );
      useToastStore.getState().showToast(`Đã xóa ${idSet.size} từ khỏi kho từ`, 'pink');
    },
    onError: () => {},
  });
}

/** Hook: full JSON backup export & restore */
export function useBackupJson() {
  const qc = useQueryClient();

  const exportBackupJson = useCallback(async () => {
    const { profile } = useProfileStore.getState();
    let payload: unknown = {
      exportedAt: new Date().toISOString(),
      xp: profile.xp,
      streak: profile.streak,
      dailyTarget: profile.dailyTarget,
      weeklyLog: profile.weeklyLog,
      lessons: qc.getQueryData<Lesson[]>(coursesKeys.lessons) || [],
      vocab: qc.getQueryData<VocabWord[]>(vocabKeys.list) || [],
      notes: qc.getQueryData<MindNote[]>(notesKeys.list) || [],
    };
    try {
      payload = await vocabApi.exportBackup();
    } catch {
      // Fall back to local snapshot when backend is offline
    }
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      `hsk-quest-3.0-backup-${getTodayISO()}.json`,
    );
    useToastStore.getState().showToast('Đã xuất file Backup JSON thành công!', 'yellow');
  }, [qc]);

  const importBackupJson = useCallback(
    async (rawJson: string) => {
      try {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed.lessons) && parsed.lessons.length > 0) {
          qc.setQueryData<Lesson[]>(coursesKeys.lessons, parsed.lessons);
        }
        if (Array.isArray(parsed.vocab) && parsed.vocab.length > 0) {
          qc.setQueryData<VocabWord[]>(vocabKeys.list, parsed.vocab);
        }
        if (Array.isArray(parsed.notes)) {
          qc.setQueryData<MindNote[]>(notesKeys.list, parsed.notes);
        }
        useProfileStore.getState().syncProfile((prev) => ({
          ...prev,
          xp: typeof parsed.xp === 'number' ? parsed.xp : prev.xp,
          streak: typeof parsed.streak === 'number' ? parsed.streak : prev.streak,
          dailyTarget:
            typeof parsed.dailyTarget === 'number' ? parsed.dailyTarget : prev.dailyTarget,
          weeklyLog:
            Array.isArray(parsed.weeklyLog) && parsed.weeklyLog.length === 7
              ? parsed.weeklyLog
              : prev.weeklyLog,
        }));
        try {
          await vocabApi.importBackup(parsed);
        } catch {
          // Offline restore still succeeds
        }
        useToastStore.getState().showToast('Khôi phục dữ liệu từ file JSON thành công!', 'yellow');
      } catch {
        useToastStore.getState().showToast('File JSON không hợp lệ.', 'pink');
      }
    },
    [qc],
  );

  return { exportBackupJson, importBackupJson };
}
