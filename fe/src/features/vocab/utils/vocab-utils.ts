import type {
  IndexedVocabEntry,
  VocabSortOption,
  VocabStatusStats,
} from '@/features/vocab/types';
import { getTodayISO } from '@/lib/date-utils';
import { normalizeSearch } from '@/lib/search-utils';
import type { VocabStatus, VocabWord } from '@/types';

const STATUS_SORT_ORDER: Record<VocabStatus, number> = {
  review: 0,
  learning: 1,
  new: 2,
  mastered: 3,
};

const SORT_COMPARATORS: Partial<
  Record<VocabSortOption, (a: IndexedVocabEntry, b: IndexedVocabEntry) => number>
> = {
  'pinyin-asc': (a, b) => a.normPinyin.localeCompare(b.normPinyin),
  'level-asc': (a, b) => a.word.level - b.word.level,
  'level-desc': (a, b) => b.word.level - a.word.level,
  status: (a, b) => STATUS_SORT_ORDER[a.word.status] - STATUS_SORT_ORDER[b.word.status],
};

/** Pre-compute normalized search haystack once per vocab update */
export function indexVocab(vocab: VocabWord[]): IndexedVocabEntry[] {
  return vocab.map((word) => ({
    word,
    normPinyin: normalizeSearch(word.pinyin),
    haystack: normalizeSearch(
      `${word.hanzi} ${word.pinyin} ${word.hanviet} ${word.meaning} ${word.english || ''} ${word.exampleZh || ''} ${word.exampleVi || ''}`,
    ),
  }));
}

/** Single-pass O(N) status stats scoped by level & lesson */
export function computeVocabStatusStats(
  vocab: VocabWord[],
  levelFilter: string,
  lessonFilter: string,
): VocabStatusStats {
  const counts: Record<VocabStatus, number> = { mastered: 0, learning: 0, review: 0, new: 0 };
  let total = 0;

  for (const w of vocab) {
    if (levelFilter !== 'all' && String(w.level) !== levelFilter) continue;
    if (lessonFilter !== 'all' && w.lessonId !== lessonFilter) continue;
    total++;
    counts[w.status in counts ? w.status : 'new']++;
  }

  return {
    total,
    ...counts,
    masteredPct: total ? Math.round((counts.mastered / total) * 100) : 0,
  };
}

/** Filter and sort indexed vocab entries */
export function filterAndSortVocab(
  indexed: IndexedVocabEntry[],
  search: string,
  levelFilter: string,
  statusFilter: string,
  lessonFilter: string,
  sortBy: VocabSortOption,
): VocabWord[] {
  const q = normalizeSearch(search.trim());
  const matched: IndexedVocabEntry[] = [];

  for (const entry of indexed) {
    const w = entry.word;
    if (levelFilter !== 'all' && String(w.level) !== levelFilter) continue;
    if (statusFilter !== 'all' && w.status !== statusFilter) continue;
    if (lessonFilter !== 'all' && w.lessonId !== lessonFilter) continue;
    if (q && !entry.haystack.includes(q)) continue;
    matched.push(entry);
  }

  const comparator = SORT_COMPARATORS[sortBy];
  if (comparator) matched.sort(comparator);
  return matched.map((m) => m.word);
}

export function buildPageNumbers(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '...'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('...');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

function escapeCsvCell(val: string | number | undefined): string {
  const s = String(val ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Trigger a browser file download from an in-memory Blob */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export filtered vocab list to UTF-8 BOM CSV compatible with Excel */
export function exportVocabCsv(words: VocabWord[], levelFilter: string): void {
  const headers = [
    'STT',
    'HSK',
    'Chữ Hán',
    'Pinyin',
    'Hán Việt',
    'Tiếng Anh',
    'Nghĩa tiếng Việt',
    'Từ loại',
    'Trạng thái',
    'Ví dụ (ZH)',
    'Ví dụ (VI)',
  ];
  const rows = words.map((w, i) =>
    [
      i + 1,
      `HSK ${w.level}`,
      w.hanzi,
      w.pinyin,
      w.hanviet,
      w.english || '',
      w.meaning,
      w.pos,
      w.status,
      w.exampleZh,
      w.exampleVi,
    ]
      .map(escapeCsvCell)
      .join(','),
  );
  const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  downloadBlob(
    blob,
    `hsk-vocab-${levelFilter === 'all' ? 'all' : `hsk${levelFilter}`}-${getTodayISO()}.csv`,
  );
}
