import type React from 'react';
import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmStore {
  options: ConfirmOptions | null;
  isPending: boolean;
  openConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
  confirm: () => Promise<void>;
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  options: null,
  isPending: false,

  openConfirm: (options) => set({ options, isPending: false }),

  closeConfirm: () => {
    if (get().isPending) return;
    set({ options: null });
  },

  confirm: async () => {
    const { options, isPending } = get();
    if (!options || isPending) return;
    set({ isPending: true });
    try {
      await options.onConfirm();
      set({ options: null, isPending: false });
    } catch {
      set({ isPending: false });
    }
  },
}));
