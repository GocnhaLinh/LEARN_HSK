import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVocabUiStore } from '@/features/vocab/stores/vocab-ui.store';
import type { VocabSortOption } from '@/features/vocab/types';
import {
  buildPageNumbers,
  computeVocabStatusStats,
  filterAndSortVocab,
  indexVocab,
} from '@/features/vocab/utils/vocab-utils';
import type { Lesson, VocabWord } from '@/types';

export function useVocabFilter(vocab: VocabWord[], lessons: Lesson[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = useVocabUiStore((s) => s.page);
  const pageSize = useVocabUiStore((s) => s.pageSize);
  const setPage = useVocabUiStore((s) => s.setPage);
  const pruneSelection = useVocabUiStore((s) => s.pruneSelection);

  const urlQuery = searchParams.get('q') || '';
  const levelFilter = searchParams.get('level') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const lessonFilter = searchParams.get('lesson') || 'all';
  const sortBy = (searchParams.get('sort') as VocabSortOption) || 'default';

  const [searchInput, setSearchInput] = useState(urlQuery);
  const deferredSearch = useDeferredValue(searchInput);

  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  // Debounce URL query sync so rapid keystrokes never churn browser history
  useEffect(() => {
    if (searchInput === urlQuery) return;
    const t = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!searchInput.trim()) next.delete('q');
          else next.set('q', searchInput);
          return next;
        },
        { replace: true },
      );
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchInput, urlQuery, setSearchParams]);

  const updateParam = useCallback(
    (key: string, val: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!val || val === 'all' || val === 'default') next.delete(key);
          else next.set(key, val);
          if (key === 'level') next.delete('lesson');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const lessonTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lessons) map.set(l.id, l.title);
    return map;
  }, [lessons]);

  const availableLessons = useMemo(
    () => (levelFilter === 'all' ? lessons : lessons.filter((l) => String(l.level) === levelFilter)),
    [lessons, levelFilter],
  );

  const indexedVocab = useMemo(() => indexVocab(vocab), [vocab]);

  const statusStats = useMemo(
    () => computeVocabStatusStats(vocab, levelFilter, lessonFilter),
    [vocab, levelFilter, lessonFilter],
  );

  const filteredList = useMemo(
    () =>
      filterAndSortVocab(
        indexedVocab,
        deferredSearch,
        levelFilter,
        statusFilter,
        lessonFilter,
        sortBy,
      ),
    [indexedVocab, deferredSearch, levelFilter, statusFilter, lessonFilter, sortBy],
  );

  // Reset page to 1 only when filters actually change (preserves page when navigating away & back)
  const filterKey = `${deferredSearch}|${levelFilter}|${statusFilter}|${lessonFilter}|${sortBy}`;
  const prevFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKeyRef.current === filterKey) return;
    prevFilterKeyRef.current = filterKey;
    setPage(1);
  }, [filterKey, setPage]);

  useEffect(() => {
    if (!useVocabUiStore.getState().selectedIds.size) return;
    pruneSelection(new Set(vocab.map((w) => w.id)));
  }, [vocab, pruneSelection]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageItems = useMemo(
    () => filteredList.slice(startIdx, startIdx + pageSize),
    [filteredList, startIdx, pageSize],
  );
  const pageNumbers = useMemo(() => buildPageNumbers(safePage, totalPages), [safePage, totalPages]);

  const hasActiveFilter =
    Boolean(searchInput.trim()) ||
    levelFilter !== 'all' ||
    statusFilter !== 'all' ||
    lessonFilter !== 'all' ||
    sortBy !== 'default';

  return {
    searchInput,
    setSearchInput,
    levelFilter,
    statusFilter,
    lessonFilter,
    sortBy,
    updateParam,
    clearAllFilters,
    hasActiveFilter,
    lessonTitleMap,
    availableLessons,
    statusStats,
    filteredList,
    pageItems,
    pageNumbers,
    safePage,
    totalPages,
    startIdx,
    pageSize,
  };
}
