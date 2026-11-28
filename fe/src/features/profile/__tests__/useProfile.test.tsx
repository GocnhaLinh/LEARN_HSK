/**
 * Kiểm thử các hook hành động của feature Profile (useProfile.ts).
 * Mục đích: Đảm bảo đổi theme, điểm danh ngày (+15 XP & chặn bấm 2 lần),
 * điều chỉnh mục tiêu ngày (kẹp 5–100), đổi cấp HSK và tick nhiệm vụ hoạt động đúng cả online & offline.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileApi } from '@/features/profile/api/profile.api';
import {
  useAdjustDailyTarget,
  useDailyCheckin,
  useSetFocusLevel,
  useToggleMission,
  useToggleTheme,
} from '@/features/profile/hooks/useProfile';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import { normalizeProfile } from '@/features/profile/utils/profile-stats';
import { getTodayISO } from '@/lib/date-utils';
import { useToastStore } from '@/stores/toast.store';
import type { UserProfile } from '@/types';

// Mock hiệu ứng confetti / floating XP để tránh thao tác DOM thừa khi chạy trên jsdom
vi.mock('@/lib/fx-utils', () => ({
  spawnConfetti: vi.fn(),
  spawnFloatingXP: vi.fn(),
}));

describe('useProfile hooks (Đổi theme, điểm danh, mục tiêu & nhiệm vụ ngày)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useProfileStore.setState({ profile: normalizeProfile(null), apiConnected: false });
    useToastStore.getState().clearToasts();
  });

  it('useToggleTheme đổi qua lại giữa Editorial Zine và Pastel Diary, đồng thời gọi API lưu', () => {
    const spy = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue(normalizeProfile({ theme: 'diary' }));
    const { result } = renderHook(() => useToggleTheme());

    // Mặc định là zine -> bấm đổi sang diary
    act(() => {
      result.current();
    });
    expect(useProfileStore.getState().profile.theme).toBe('diary');
    expect(spy).toHaveBeenCalledWith({ theme: 'diary' });

    // Bấm lần nữa -> quay về zine
    act(() => {
      result.current();
    });
    expect(useProfileStore.getState().profile.theme).toBe('zine');
  });

  it('useDailyCheckin cộng 15 XP + tăng streak ở lần đầu và chặn điểm danh trùng trong cùng ngày', async () => {
    const today = getTodayISO();
    const serverProfile: UserProfile = {
      ...normalizeProfile(null),
      lastCheckinISO: today,
      streak: 1,
      xp: 15,
    };
    const spy = vi
      .spyOn(profileApi, 'dailyCheckin')
      .mockResolvedValue({ profile: serverProfile, alreadyCheckedIn: false });

    const { result } = renderHook(() => useDailyCheckin());

    // Lần 1 trong ngày -> tăng streak lên 1, cộng 15 XP và gọi Backend
    await act(async () => {
      await result.current();
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(useProfileStore.getState().profile.streak).toBe(1);
    expect(useProfileStore.getState().profile.xp).toBe(15);
    expect(useProfileStore.getState().apiConnected).toBe(true);

    // Lần 2 trong cùng ngày -> chặn sớm, không cộng thêm XP và không gọi lại API
    await act(async () => {
      await result.current();
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(useProfileStore.getState().profile.xp).toBe(15);
    const toasts = useToastStore.getState().toasts;
    expect(toasts[toasts.length - 1]?.variant).toBe('pink');
  });

  it('useAdjustDailyTarget kẹp mục tiêu trong khoảng [5, 100] và useSetFocusLevel đổi cấp HSK', async () => {
    const spy = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue(normalizeProfile(null));
    const { result: adjustHook } = renderHook(() => useAdjustDailyTarget());
    const { result: focusHook } = renderHook(() => useSetFocusLevel());

    // Giảm sâu hơn giới hạn dưới -> bị kẹp ở mức tối thiểu 5
    await act(async () => {
      await adjustHook.current(-50);
    });
    expect(useProfileStore.getState().profile.dailyTarget).toBe(5);

    // Tăng vượt giới hạn trên -> bị kẹp ở mức tối đa 100
    await act(async () => {
      await adjustHook.current(200);
    });
    expect(useProfileStore.getState().profile.dailyTarget).toBe(100);

    // Đổi cấp độ theo đuổi sang HSK 3
    await act(async () => {
      await focusHook.current(3);
    });
    expect(useProfileStore.getState().profile.focusLevel).toBe(3);
    expect(spy).toHaveBeenLastCalledWith({ focusLevel: 3 });
  });

  it('useToggleMission bật hoàn thành sẽ cộng 15 XP và bỏ tick sẽ tắt trạng thái nhiệm vụ', async () => {
    const spy = vi.spyOn(profileApi, 'toggleMission').mockRejectedValue(new Error('Offline'));
    const { result } = renderHook(() => useToggleMission());

    // Bật m2 -> cộng 15 XP (vẫn giữ state lạc quan dù Backend offline)
    await act(async () => {
      await result.current('m2');
    });
    expect(spy).toHaveBeenCalledWith('m2', true);
    expect(useProfileStore.getState().profile.missionsDone.m2).toBe(true);
    expect(useProfileStore.getState().profile.xp).toBe(15);

    // Bỏ tick m2 -> tắt m2, giữ nguyên XP
    await act(async () => {
      await result.current('m2');
    });
    expect(useProfileStore.getState().profile.missionsDone.m2).toBe(false);
    expect(useProfileStore.getState().profile.xp).toBe(15);
  });
});
