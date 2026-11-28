import type { VocabStatus, VocabWord } from '@/types';

export type VocabSortOption = 'default' | 'pinyin-asc' | 'level-asc' | 'level-desc' | 'status';

export interface VocabFormInput {
  hanzi: string;
  pinyin: string;
  hanviet?: string;
  english?: string;
  meaning: string;
  pos?: string;
  level: number;
  lessonId?: string;
  status?: VocabStatus;
  note?: string;
  exampleZh?: string;
  exampleVi?: string;
}

export type CreateVocabPayload = VocabFormInput;
export type UpdateVocabPayload = Partial<Omit<VocabFormInput, 'lessonId'>>;

export interface IndexedVocabEntry {
  word: VocabWord;
  normPinyin: string;
  haystack: string;
}

export interface VocabStatusStats {
  total: number;
  mastered: number;
  learning: number;
  review: number;
  new: number;
  masteredPct: number;
}

export interface VocabUiStore {
  selectedIds: Set<string>;
  expandedId: string | null;
  modalOpen: boolean;
  editingWord: VocabWord | null;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  toggleSelect: (id: string) => void;
  toggleSelectPage: (pageWordIds: string[], allSelected: boolean) => void;
  selectAllIds: (ids: string[]) => void;
  clearSelection: () => void;
  pruneSelection: (validIds: Set<string>) => void;
  toggleExpand: (id: string) => void;
  openAddModal: () => void;
  openEditModal: (word: VocabWord) => void;
  closeModal: () => void;
}
