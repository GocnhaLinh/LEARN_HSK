import { create } from 'zustand';
import type { ProfileStore } from '@/features/profile/types';
import { normalizeProfile } from '@/features/profile/utils/profile-stats';
import { readAppCache } from '@/lib/storage-cache';
import type { UserProfile } from '@/types';

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: normalizeProfile(readAppCache() as Partial<UserProfile> | null),
  apiConnected: false,

  syncProfile: (next) =>
    set((s) => ({
      profile:
        typeof next === 'function' ? next(s.profile) : normalizeProfile({ ...s.profile, ...next }),
    })),

  setApiConnected: (apiConnected) => set({ apiConnected }),
}));
