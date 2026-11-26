import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { profileApi } from '@/features/profile/api/profile.api';
import { handwritingApi } from '@/features/writing/api/handwriting.api';
import { EffectCoords, spawnFloatingXP } from '@/lib/fx-utils';
import { useToastStore } from '@/stores/toast.store';
import type { HandwritingItem } from '@/types';

const STORAGE_KEY = 'hsk_quest_30_clean_v4';

export const handwritingKeys = {
  all: ['writing'] as const,
  list: ['writing', 'handwriting'] as const,
};

function readCachedHandwriting(): HandwritingItem[] | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.handwritingGallery) ? parsed.handwritingGallery : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedHandwriting(items: HandwritingItem[]): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...parsed, handwritingGallery: items.slice(0, 6) }),
    );
  } catch {
    // ignore storage quota errors
  }
}

/** Query: fetch saved handwriting snapshots */
export function useHandwriting() {
  return useQuery<HandwritingItem[]>({
    queryKey: handwritingKeys.list,
    queryFn: async () => {
      const data = await handwritingApi.getHandwriting();
      writeCachedHandwriting(data);
      return data;
    },
    initialData: readCachedHandwriting,
    initialDataUpdatedAt: 0,
  });
}

/** Mutation: record completed HanziWriter quiz (+10 XP + daily writing mission) */
export function useRecordHanziQuiz() {
  const { syncProfile } = useApp();

  return useMutation({
    mutationFn: (_vars: { char: string }) => profileApi.recordWritten(10),

    onMutate: ({ char }) => {
      syncProfile((prev) => {
        const nextCount = prev.writtenCountToday + 1;
        return {
          ...prev,
          writtenCountToday: nextCount,
          xp: prev.xp + 10,
          missionsDone: nextCount >= 5 ? { ...prev.missionsDone, m3: true } : prev.missionsDone,
        };
      });
      spawnFloatingXP(10);
      useToastStore.getState().showToast(`Hoàn thành đồ nét chữ "${char}" (+10 XP)`, 'yellow');
    },

    onSuccess: (updatedProfile) => {
      if (updatedProfile) syncProfile(updatedProfile);
    },

    onError: () => {
      // Offline optimistic update already applied
    },
  });
}

/** Mutation: save a freehand canvas snapshot (+10 XP) */
export function useSaveHandwritingSnapshot() {
  const qc = useQueryClient();
  const { syncProfile } = useApp();

  return useMutation({
    mutationFn: ({ img, caption }: { img: string; caption: string; coords?: EffectCoords }) =>
      handwritingApi.createHandwriting({ img, caption }),

    onMutate: async ({ img, caption, coords }) => {
      await qc.cancelQueries({ queryKey: handwritingKeys.list });
      const optimistic: HandwritingItem = {
        id: `hw_${Date.now()}`,
        img,
        caption,
        date: new Date().toLocaleDateString('vi-VN'),
      };
      qc.setQueryData<HandwritingItem[]>(handwritingKeys.list, (prev = []) => {
        const next = [optimistic, ...prev].slice(0, 15);
        writeCachedHandwriting(next);
        return next;
      });
      syncProfile((prev) => {
        const nextCount = prev.writtenCountToday + 1;
        return {
          ...prev,
          writtenCountToday: nextCount,
          xp: prev.xp + 10,
          missionsDone: nextCount >= 5 ? { ...prev.missionsDone, m3: true } : prev.missionsDone,
        };
      });
      spawnFloatingXP(10, coords);
      return { optimisticId: optimistic.id };
    },

    onSuccess: (res, _vars, ctx) => {
      if (res?.item && ctx?.optimisticId) {
        qc.setQueryData<HandwritingItem[]>(handwritingKeys.list, (prev = []) => {
          const next = prev.map((item) => (item.id === ctx.optimisticId ? res.item : item));
          writeCachedHandwriting(next);
          return next;
        });
      }
      if (res?.profile) syncProfile(res.profile);
      useToastStore.getState().showToast('Đã lưu bài viết tay vào sổ tay (+10 XP)', 'yellow');
    },

    onError: () => {
      useToastStore
        .getState()
        .showToast('Đã lưu bài viết tay vào sổ tay (offline, +10 XP)', 'yellow');
    },
  });
}

/** Mutation: delete a saved handwriting snapshot */
export function useDeleteHandwritingItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => handwritingApi.deleteHandwriting(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: handwritingKeys.list });
      qc.setQueryData<HandwritingItem[]>(handwritingKeys.list, (prev = []) => {
        const next = prev.filter((item) => item.id !== id);
        writeCachedHandwriting(next);
        return next;
      });
    },

    onSuccess: () => {
      useToastStore.getState().showToast('Đã xóa ảnh khỏi sổ tay');
    },

    onError: () => {
      useToastStore.getState().showToast('Đã xóa ảnh khỏi sổ tay (offline)');
    },
  });
}
