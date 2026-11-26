import { create } from 'zustand';
import { DEFAULT_WRITE_QUICK_POOL } from '@/data/defaults';

interface WritingStoreState {
  writeQuickPool: string[];
  setWriteQuickPool: (chars: string[]) => void;
}

export const useWritingStore = create<WritingStoreState>((set) => ({
  writeQuickPool: DEFAULT_WRITE_QUICK_POOL,
  setWriteQuickPool: (chars) => set({ writeQuickPool: chars }),
}));
