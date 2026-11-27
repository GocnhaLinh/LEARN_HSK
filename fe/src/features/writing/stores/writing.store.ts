import { create } from 'zustand';
import { DEFAULT_WRITE_QUICK_POOL } from '@/data/defaults';
import type { WritingStoreState } from '@/features/writing/types';

export const useWritingStore = create<WritingStoreState>((set) => ({
  writeQuickPool: DEFAULT_WRITE_QUICK_POOL,
  setWriteQuickPool: (chars) => set({ writeQuickPool: chars }),
}));
