import { create } from 'zustand';
import type { ToastItem, ToastVariant } from '@/types';

const MAX_TOASTS = 2;
const TOAST_TTL_MS = 2200;

const toastTimers = new Map<string, number>();

function getToastGroupKey(msg: string): string {
  if (msg.startsWith('Đã chuyển sang giao diện')) return 'theme';
  if (msg.includes('Đĩa CD')) return 'cd';
  if (msg.startsWith('Đã đổi màu mực')) return 'ink';
  if (msg.startsWith('Bạn đã điểm danh')) return 'checkin';
  return msg;
}

function clearToastTimer(id: string): void {
  const timer = toastTimers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    toastTimers.delete(id);
  }
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  dismissToast: (id) => {
    clearToastTimer(id);
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    toastTimers.forEach((timerId) => window.clearTimeout(timerId));
    toastTimers.clear();
    set({ toasts: [] });
  },

  showToast: (message, variant = 'dark') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const groupKey = getToastGroupKey(message);

    set((state) => {
      const filtered = state.toasts.filter((t) => {
        const sameGroup = getToastGroupKey(t.message) === groupKey;
        if (sameGroup) clearToastTimer(t.id);
        return !sameGroup;
      });

      const next = [...filtered, { id, message, variant }];
      while (next.length > MAX_TOASTS) {
        const evicted = next.shift();
        if (evicted) clearToastTimer(evicted.id);
      }
      return { toasts: next };
    });

    const timerId = window.setTimeout(() => {
      toastTimers.delete(id);
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, TOAST_TTL_MS);

    toastTimers.set(id, timerId);
  },
}));
