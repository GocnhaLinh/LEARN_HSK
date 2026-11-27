import { create } from 'zustand';
import type { ExamLockState } from '@/features/exercises/types';

/**
 * Global UI-only lock flag for Mock Exam Focus Mode.
 * When `isExamActive` is true, Layout hides Navbar, BottomDock, and ScrollToTopButton
 * so the learner cannot accidentally navigate away mid-exam.
 */
export const useExamLockStore = create<ExamLockState>((set) => ({
  isExamActive: false,
  setExamActive: (active) => set({ isExamActive: active }),
}));
