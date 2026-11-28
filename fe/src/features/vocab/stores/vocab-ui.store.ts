import { create } from 'zustand';
import type { VocabUiStore } from '@/features/vocab/types';

export const useVocabUiStore = create<VocabUiStore>((set) => ({
  selectedIds: new Set(),
  expandedId: null,
  modalOpen: false,
  editingWord: null,
  page: 1,
  pageSize: 30,

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),

  toggleSelectPage: (pageWordIds, allSelected) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      for (const id of pageWordIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return { selectedIds: next };
    }),

  selectAllIds: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),

  pruneSelection: (validIds) =>
    set((s) => {
      if (!s.selectedIds.size) return s;
      const next = new Set<string>();
      s.selectedIds.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next.size === s.selectedIds.size ? s : { selectedIds: next };
    }),

  toggleExpand: (id) => set((s) => ({ expandedId: s.expandedId === id ? null : id })),
  openAddModal: () => set({ editingWord: null, modalOpen: true }),
  openEditModal: (editingWord) => set({ editingWord, modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
}));
