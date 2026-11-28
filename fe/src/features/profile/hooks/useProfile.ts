import { useCallback } from 'react';
import { profileApi } from '@/features/profile/api/profile.api';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import { getTodayISO } from '@/lib/date-utils';
import { type EffectCoords, spawnConfetti, spawnFloatingXP } from '@/lib/fx-utils';
import { useToastStore } from '@/stores/toast.store';
import type { MissionsDone, ThemeMode } from '@/types';

function triggerXpEffects(amount: number, toastLabel?: string, coords?: EffectCoords) {
  spawnFloatingXP(amount, coords);
  if (amount >= 15) spawnConfetti(coords, 12);
  if (toastLabel) useToastStore.getState().showToast(`${toastLabel} (+${amount} XP)`, 'yellow');
}

export function useToggleTheme() {
  return useCallback(() => {
    const { profile, syncProfile, setApiConnected } = useProfileStore.getState();
    const nextTheme: ThemeMode = profile.theme === 'zine' ? 'diary' : 'zine';
    syncProfile({ theme: nextTheme });
    profileApi
      .updateProfile({ theme: nextTheme })
      .then(() => setApiConnected(true))
      .catch(() => {});
    useToastStore
      .getState()
      .showToast(
        nextTheme === 'zine'
          ? 'Đã chuyển sang giao diện Editorial Zine'
          : 'Đã chuyển sang giao diện Pastel Diary',
        'pink',
      );
  }, []);
}

export function useDailyCheckin() {
  return useCallback(async (coords?: EffectCoords) => {
    const today = getTodayISO();
    const { profile, syncProfile, setApiConnected } = useProfileStore.getState();
    if (profile.lastCheckinISO === today) {
      useToastStore
        .getState()
        .showToast('Bạn đã điểm danh hôm nay rồi! Hẹn gặp lại ngày mai nha 🐼', 'pink');
      return;
    }

    const nextStreak = profile.streak + 1;
    syncProfile((prev) => ({
      ...prev,
      lastCheckinISO: today,
      streak: prev.streak + 1,
      xp: prev.xp + 15,
    }));
    triggerXpEffects(15, `Điểm danh thành công! Chuỗi ${nextStreak} ngày`, coords);

    try {
      const res = await profileApi.dailyCheckin();
      if (res?.profile) syncProfile(res.profile);
      setApiConnected(true);
    } catch {
      // Offline optimistic state already applied
    }
  }, []);
}

export function useAdjustDailyTarget() {
  return useCallback(async (delta: number) => {
    const { profile, syncProfile, setApiConnected } = useProfileStore.getState();
    const nextTarget = Math.max(5, Math.min(100, profile.dailyTarget + delta));
    syncProfile({ dailyTarget: nextTarget });
    try {
      await profileApi.updateProfile({ dailyTarget: nextTarget });
      setApiConnected(true);
    } catch {
      // Offline optimistic state already applied
    }
  }, []);
}

export function useSetFocusLevel() {
  return useCallback(async (lv: number) => {
    const { syncProfile, setApiConnected } = useProfileStore.getState();
    syncProfile({ focusLevel: lv });
    try {
      await profileApi.updateProfile({ focusLevel: lv });
      setApiConnected(true);
    } catch {
      // Offline optimistic state already applied
    }
  }, []);
}

export function useToggleMission() {
  return useCallback(async (key: keyof MissionsDone) => {
    const { profile, syncProfile, setApiConnected } = useProfileStore.getState();
    const nextDone = !profile.missionsDone[key];
    syncProfile((prev) => ({
      ...prev,
      xp: nextDone ? prev.xp + 15 : prev.xp,
      missionsDone: { ...prev.missionsDone, [key]: nextDone },
    }));
    if (nextDone) triggerXpEffects(15, 'Hoàn thành nhiệm vụ hôm nay');

    try {
      const res = await profileApi.toggleMission(key, nextDone);
      if (res?.profile) syncProfile(res.profile);
      setApiConnected(true);
    } catch {
      // Offline optimistic state already applied
    }
  }, []);
}
