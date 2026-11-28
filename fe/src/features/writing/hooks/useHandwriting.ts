import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/features/profile/api/profile.api';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import { handwritingApi } from '@/features/writing/api/handwriting.api';
import { EffectCoords, spawnFloatingXP } from '@/lib/fx-utils';
import { handwritingKeys } from '@/lib/query-keys';
import { readAppCacheArray } from '@/lib/storage-cache';
import { useToastStore } from '@/stores/toast.store';
import type { HandwritingItem } from '@/types';

export { handwritingKeys };

/** Query: fetch saved handwriting snapshots */
export function useHandwriting() {
  return useQuery<HandwritingItem[]>({
    queryKey: handwritingKeys.list,
    queryFn: handwritingApi.getHandwriting,
    initialData: () => readAppCacheArray<HandwritingItem>('handwritingGallery'),
    initialDataUpdatedAt: 0,
  });
}

/** Mutation: record completed HanziWriter quiz (+10 XP + daily writing mission) */
export function useRecordHanziQuiz() {
  return useMutation({
    mutationFn: (_vars: { char: string }) => profileApi.recordWritten(10),

    onMutate: ({ char }) => {
      useProfileStore.getState().syncProfile((prev) => {
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
      if (updatedProfile) useProfileStore.getState().syncProfile(updatedProfile);
    },

    onError: () => {
      // Offline optimistic update already applied
    },
  });
}

/** Mutation: save a freehand canvas snapshot (+10 XP) */
export function useSaveHandwritingSnapshot() {
  const qc = useQueryClient();

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
      qc.setQueryData<HandwritingItem[]>(handwritingKeys.list, (prev = []) =>
        [optimistic, ...prev].slice(0, 15),
      );
      useProfileStore.getState().syncProfile((prev) => {
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
        qc.setQueryData<HandwritingItem[]>(handwritingKeys.list, (prev = []) =>
          prev.map((item) => (item.id === ctx.optimisticId ? res.item : item)),
        );
      }
      if (res?.profile) useProfileStore.getState().syncProfile(res.profile);
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
      qc.setQueryData<HandwritingItem[]>(handwritingKeys.list, (prev = []) =>
        prev.filter((item) => item.id !== id),
      );
    },

    onSuccess: () => {
      useToastStore.getState().showToast('Đã xóa ảnh khỏi sổ tay');
    },

    onError: () => {
      useToastStore.getState().showToast('Đã xóa ảnh khỏi sổ tay (offline)');
    },
  });
}
