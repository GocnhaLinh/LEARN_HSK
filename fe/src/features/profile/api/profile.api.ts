import apiClient from '@/lib/api/client';
import type {
  BootstrapResponse,
  HealthResponse,
  UpdateProfilePayload,
} from '@/features/profile/types';
import type { UserProfile } from '@/types';

export type { BootstrapResponse, HealthResponse, UpdateProfilePayload };

export const profileApi = {
  health: async (): Promise<HealthResponse> => {
    const { data } = await apiClient.get<HealthResponse>('/health');
    return data;
  },

  bootstrap: async (): Promise<BootstrapResponse> => {
    const { data } = await apiClient.get<BootstrapResponse>('/bootstrap');
    return data;
  },

  getProfile: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get<UserProfile>('/profile');
    return data;
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<UserProfile> => {
    const { data } = await apiClient.patch<UserProfile>('/profile', payload);
    return data;
  },

  dailyCheckin: async (): Promise<{ profile: UserProfile; alreadyCheckedIn: boolean }> => {
    const { data } = await apiClient.post<{ profile: UserProfile; alreadyCheckedIn: boolean }>(
      '/profile/checkin',
    );
    return data;
  },

  addXp: async (amount: number): Promise<UserProfile> => {
    const { data } = await apiClient.post<UserProfile>('/profile/xp', { amount });
    return data;
  },

  recordReview: async (xpAmount = 0, markMission4 = false): Promise<UserProfile> => {
    const { data } = await apiClient.post<UserProfile>('/profile/review', {
      xpAmount,
      markMission4,
    });
    return data;
  },

  recordWritten: async (xpAmount = 10): Promise<UserProfile> => {
    const { data } = await apiClient.post<UserProfile>('/profile/written', { xpAmount });
    return data;
  },

  toggleMission: async (
    key: string,
    done?: boolean,
  ): Promise<{ profile: UserProfile; completedNow: boolean }> => {
    const { data } = await apiClient.patch<{ profile: UserProfile; completedNow: boolean }>(
      `/profile/missions/${key}`,
      { done },
    );
    return data;
  },
};
