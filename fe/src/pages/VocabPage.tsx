import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FilterX,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { VocabRow } from '../components/vocab/VocabRow';
import { VocabWordModal } from '../components/vocab/VocabWordModal';
import { useApp, VocabFormInput } from '../context/AppContext';
import { VocabStatus, VocabWord } from '../types';
import { getTodayISO, normalizeSearch, speakChinese } from '../utils/helpers';

type SortOption = 'default' | 'pinyin-asc' | 'level-asc' | 'level-desc' | 'status';

const STATUS_SORT_ORDER: Record<VocabStatus, number> = {
  review: 0,
  learning: 1,
  new: 2,
  mastered: 3,
};

function buildPageNumbers(current: number, total: number): Array<number | '...'> {
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
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const VocabPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    profile,
    lessons,
    vocab,
    changeWordStatus,
    batchChangeWordStatus,
    addCustomWord,
    updateWord,
    deleteCustomWord,
    batchDeleteWords,
    exportDataJSON,
    importDataJSON,
    showToast,
  } = useApp();

  const urlQuery = searchParams.get('q') || '';
  const levelFilter = searchParams.get('level') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const lessonFilter = searchParams.get('lesson') || 'all';
  const sortBy = (searchParams.get('sort') as SortOption) || 'default';

  // Local immediate search input + deferred filtering keeps typing at 60fps across 1,300+ words
  const [searchInput, setSearchInput] = useState(urlQuery);
  const deferredSearch = useDeferredValue(searchInput);

  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  // Debounce URL query param sync so keystrokes don't trigger history churn
  useEffect(() => {
    if (searchInput === urlQuery) return;
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (!searchInput.trim()) next.delete('q');
      else next.set('q', searchInput);
      setSearchParams(next, { replace: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchInput, urlQuery, searchParams, setSearchParams]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);

  const listTopRef = useRef<HTMLDivElement | null>(null);

  const updateParam = useCallback(
    (key: string, val: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!val || val === 'all' || val === 'default') next.delete(key);
          else next.set(key, val);
          // Reset lesson filter if switching level so no stale lesson remains selected
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

  // Fast O(1) lesson lookup map + lessons filtered by current level
  const lessonTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lessons) map.set(l.id, l.title);
    return map;
  }, [lessons]);

  const availableLessons = useMemo(() => {
    if (levelFilter === 'all') return lessons;
    return lessons.filter((l) => String(l.level) === levelFilter);
  }, [lessons, levelFilter]);

  // Pre-compute normalized search haystack ONCE per vocab update (eliminates 5,000+ NFD regex runs per keystroke)
  const indexedVocab = useMemo(
    () =>
      vocab.map((w) => ({
        word: w,
        normPinyin: normalizeSearch(w.pinyin),
        haystack: normalizeSearch(
          `${w.hanzi} ${w.pinyin} ${w.hanviet} ${w.meaning} ${w.english || ''} ${w.exampleZh || ''} ${w.exampleVi || ''}`,
        ),
      })),
    [vocab],
  );

  // Scoped stats (by level & lesson, independent of statusFilter so user can click between statuses freely)
  const statusStats = useMemo(() => {
    let total = 0;
    let mastered = 0;
    let learning = 0;
    let review = 0;
    let fresh = 0;

    for (const w of vocab) {
      if (levelFilter !== 'all' && String(w.level) !== levelFilter) continue;
      if (lessonFilter !== 'all' && w.lessonId !== lessonFilter) continue;
      total++;
      if (w.status === 'mastered') mastered++;
      else if (w.status === 'learning') learning++;
      else if (w.status === 'review') review++;
      else fresh++;
    }
    const masteredPct = total ? Math.round((mastered / total) * 100) : 0;
    return { total, mastered, learning, review, fresh, masteredPct };
  }, [vocab, levelFilter, lessonFilter]);

  // Filter + Sort
  const filteredList = useMemo(() => {
    const q = normalizeSearch(deferredSearch.trim());
    const matched: Array<{ word: VocabWord; normPinyin: string }> = [];

    for (const entry of indexedVocab) {
      const w = entry.word;
      if (levelFilter !== 'all' && String(w.level) !== levelFilter) continue;
      if (statusFilter !== 'all' && w.status !== statusFilter) continue;
      if (lessonFilter !== 'all' && w.lessonId !== lessonFilter) continue;
      if (q && !entry.haystack.includes(q)) continue;
      matched.push({ word: w, normPinyin: entry.normPinyin });
    }

    if (sortBy === 'pinyin-asc') {
      matched.sort((a, b) => a.normPinyin.localeCompare(b.normPinyin));
    } else if (sortBy === 'level-asc') {
      matched.sort((a, b) => a.word.level - b.word.level);
    } else if (sortBy === 'level-desc') {
      matched.sort((a, b) => b.word.level - a.word.level);
    } else if (sortBy === 'status') {
      matched.sort((a, b) => STATUS_SORT_ORDER[a.word.status] - STATUS_SORT_ORDER[b.word.status]);
    }

    return matched.map((m) => m.word);
  }, [indexedVocab, deferredSearch, levelFilter, statusFilter, lessonFilter, sortBy]);

  // Reset page when filters or page size change
  useEffect(() => {
    setPage(1);
  }, [deferredSearch, levelFilter, statusFilter, lessonFilter, sortBy, pageSize]);

  // Clean up selected IDs that no longer exist in vocab
  useEffect(() => {
    setSelectedIds((prev) => {
      if (!prev.size) return prev;
      const validIds = new Set(vocab.map((w) => w.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [vocab]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageItems = useMemo(
    () => filteredList.slice(startIdx, startIdx + pageSize),
    [filteredList, startIdx, pageSize],
  );

  const pageNumbers = useMemo(() => buildPageNumbers(safePage, totalPages), [safePage, totalPages]);

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((w) => selectedIds.has(w.id));

  const hasActiveFilter =
    Boolean(searchInput.trim()) ||
    levelFilter !== 'all' ||
    statusFilter !== 'all' ||
    lessonFilter !== 'all' ||
    sortBy !== 'default';

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    setPage(clamped);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Stable row handlers (keeps React.memo on VocabRow 100% effective)
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSpeak = useCallback(
    (text: string, rate = 0.92) => {
      speakChinese(text, rate, (m) => showToast(m, 'pink'));
    },
    [showToast],
  );

  const handlePracticeChar = useCallback(
    (ch: string) => {
      navigate(`/writing/hanzi/${encodeURIComponent(ch)}`);
    },
    [navigate],
  );

  const handleOpenLessonFlashcard = useCallback(
    (lessonId: string) => {
      navigate(`/flashcard/lesson/${encodeURIComponent(lessonId)}`);
    },
    [navigate],
  );

  const handleOpenEditModal = useCallback((word: VocabWord) => {
    setEditingWord(word);
    setModalOpen(true);
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setEditingWord(null);
    setModalOpen(true);
  }, []);

  const handleSaveWordModal = useCallback(
    async (data: VocabFormInput, editingId?: string) => {
      if (editingId) {
        await updateWord(editingId, data);
      } else {
        await addCustomWord(data);
      }
    },
    [addCustomWord, updateWord],
  );

  const handleTogglePageSelect = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageItems.forEach((w) => next.delete(w.id));
      } else {
        pageItems.forEach((w) => next.add(w.id));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filteredList.map((w) => w.id)));
  };

  const handleBulkStatus = async (status: VocabStatus) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await batchChangeWordStatus(ids, status);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await batchDeleteWords(ids);
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  };

  const handleExportCsv = () => {
    if (!filteredList.length) {
      showToast('Không có từ vựng nào để xuất CSV.', 'pink');
      return;
    }
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
    const rows = filteredList.map((w, i) =>
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
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hsk-vocab-${levelFilter === 'all' ? 'all' : `hsk${levelFilter}`}-${getTodayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${filteredList.length} từ ra file CSV!`, 'yellow');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      importDataJSON(String(ev.target?.result || ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const STAT_PILLS: Array<{
    key: string;
    label: string;
    count: number;
    bg: string;
  }> = [
    { key: 'all', label: 'Tất cả', count: statusStats.total, bg: 'bg-white' },
    { key: 'mastered', label: 'Đã thuộc', count: statusStats.mastered, bg: 'bg-[#CBEAD8]' },
    { key: 'learning', label: 'Đang học', count: statusStats.learning, bg: 'bg-[#EFE078]' },
    { key: 'review', label: 'Cần chú ý', count: statusStats.review, bg: 'bg-[#F4C2D7]' },
    { key: 'new', label: 'Từ mới', count: statusStats.fresh, bg: 'bg-[#F8F6F1]' },
  ];

  const defaultModalLevel =
    levelFilter !== 'all' ? Number(levelFilter) || profile.focusLevel : profile.focusLevel;

  return (
    <section className="space-y-4 sm:space-y-5">
      {/* HEADER BAR */}
      <div className="t-card-flat p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase opacity-65">
            [06] VOCABULARY ARCHIVE &amp; BACKUP
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-serif font-bold text-2xl">Kho từ HSK 3.0</h2>
            <span className="px-2 py-0.5 bg-[#EFE078] text-[#111111] font-mono text-xs font-bold t-badge">
              {vocab.length.toLocaleString('vi-VN')} từ
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 font-mono text-[11px] sm:text-xs font-bold">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="t-btn-black px-3 py-2 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Thêm từ</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="t-btn px-3 py-2 bg-[#CBEAD8] text-[#111111] flex items-center justify-center gap-1.5 whitespace-nowrap hover:brightness-95"
            title="Xuất danh sách đang lọc sang Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Xuất CSV</span>
          </button>
          <button
            type="button"
            onClick={exportDataJSON}
            className="t-btn px-3 py-2 bg-[#EFE078] text-[#111111] flex items-center justify-center gap-1.5 whitespace-nowrap hover:brightness-95"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Backup JSON</span>
          </button>
          <label className="t-btn px-3 py-2 bg-white text-[#111111] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap hover:bg-[#F4C2D7]">
            <Upload className="w-4 h-4 shrink-0" />
            <span>Khôi phục JSON</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportJsonFile} />
          </label>
        </div>
      </div>

      {/* CLICKABLE STATUS SUMMARY + MASTERY BAR */}
      <div className="t-card-flat p-3.5 sm:p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
          {STAT_PILLS.map((st) => {
            const active = statusFilter === st.key;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() => updateParam('status', st.key)}
                className={`px-3 py-2 rounded-xl border-[1.5px] transition flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-[#111111] text-white border-[#111111] shadow-[2px_2px_0px_#EFE078]'
                    : `${st.bg} text-[#111111] border-[#141414]/35 hover:border-[#141414]`
                }`}
              >
                <span className="font-bold text-[11px] truncate">{st.label}</span>
                <span
                  className={`font-serif font-extrabold text-base leading-none ${
                    active ? 'text-[#EFE078]' : 'text-[#111111]'
                  }`}
                >
                  {st.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 bg-[#EFECE4] border border-[#141414]/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#CBEAD8] shimmer-bar transition-all duration-500"
              style={{ width: `${statusStats.masteredPct}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-bold opacity-75 whitespace-nowrap">
            Đã thuộc {statusStats.masteredPct}% ({statusStats.mastered}/{statusStats.total})
          </span>
        </div>
      </div>

      {/* SEARCH, FILTER & SORT CONTROLS */}
      <div className="t-card p-3.5 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 opacity-50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm Chữ Hán, Pinyin, Tiếng Anh, nghĩa Việt, ví dụ..."
              className="w-full pl-9 pr-8 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-sm outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-55 hover:opacity-100"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* HSK Level */}
          <div className="md:col-span-2">
            <select
              value={levelFilter}
              onChange={(e) => updateParam('level', e.target.value)}
              className="w-full px-2.5 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none"
            >
              <option value="all">Tất cả HSK (1–6)</option>
              <option value="1">HSK 1</option>
              <option value="2">HSK 2</option>
              <option value="3">HSK 3</option>
              <option value="4">HSK 4</option>
              <option value="5">HSK 5</option>
              <option value="6">HSK 6</option>
            </select>
          </div>

          {/* Lesson Filter */}
          <div className="md:col-span-3">
            <select
              value={lessonFilter}
              onChange={(e) => updateParam('lesson', e.target.value)}
              className="w-full px-2.5 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none truncate"
            >
              <option value="all">Tất cả bài học ({availableLessons.length})</option>
              {availableLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  HSK {l.level} • {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="w-full px-2.5 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none"
            >
              <option value="default">Thứ tự giáo trình</option>
              <option value="pinyin-asc">Pinyin A → Z</option>
              <option value="status">Ưu tiên cần ôn</option>
              <option value="level-asc">HSK thấp → cao</option>
              <option value="level-desc">HSK cao → thấp</option>
            </select>
          </div>
        </div>

        {/* Result meta + PDF import shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dashed border-current/15 font-mono text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="opacity-75">
              Tìm thấy <strong>{filteredList.length.toLocaleString('vi-VN')}</strong> từ
              {filteredList.length > 0 && (
                <>
                  {' '}
                  • Trang <strong>{safePage}</strong>/{totalPages}
                </>
              )}
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2 py-0.5 bg-[#F4C2D7] text-[#111111] border border-[#141414] rounded font-bold inline-flex items-center gap-1 hover:brightness-95"
              >
                <FilterX className="w-3 h-3" />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="opacity-65 hidden sm:inline">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-0.5 bg-white border border-[#141414] rounded font-mono text-[11px] font-bold outline-none"
            >
              <option value={30}>30 / trang</option>
              <option value={50}>50 / trang</option>
              <option value={100}>100 / trang</option>
            </select>
            <button
              type="button"
              onClick={() => navigate(`/courses/${defaultModalLevel}`)}
              className="px-2.5 py-0.5 bg-[#EFE078]/70 text-[#111111] border border-[#141414] rounded font-bold hover:bg-[#EFE078] whitespace-nowrap"
            >
              📄 Nhập PDF/DOCX →
            </button>
          </div>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="t-card p-3 bg-[#111111] text-white flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 bg-[#EFE078] text-[#111111] rounded font-bold">
              Đã chọn {selectedIds.size} từ
            </span>
            {selectedIds.size < filteredList.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="underline text-[#EFE078] hover:opacity-80"
              >
                Chọn tất cả {filteredList.length} kết quả lọc
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleBulkStatus('mastered')}
              className="px-2.5 py-1 bg-[#CBEAD8] text-[#111111] rounded font-bold hover:brightness-95"
            >
              ✓ Đã thuộc
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus('learning')}
              className="px-2.5 py-1 bg-[#EFE078] text-[#111111] rounded font-bold hover:brightness-95"
            >
              Đang học
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus('review')}
              className="px-2.5 py-1 bg-[#F4C2D7] text-[#111111] rounded font-bold hover:brightness-95"
            >
              Cần chú ý
            </button>
            {confirmBulkDelete ? (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-2.5 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700"
              >
                Xác nhận xóa {selectedIds.size} từ?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(true)}
                className="px-2.5 py-1 bg-red-500/20 text-red-200 border border-red-400/50 rounded font-bold inline-flex items-center gap-1 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedIds(new Set());
                setConfirmBulkDelete(false);
              }}
              className="px-2 py-1 bg-white/15 rounded hover:bg-white/25"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* VOCAB LIST TABLE / CARDS */}
      <div ref={listTopRef} className="t-card overflow-hidden">
        {/* Table Selection Header */}
        {pageItems.length > 0 && (
          <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8F6F1] border-b border-[#141414]/15 flex items-center justify-between gap-2 font-mono text-[11px]">
            <label className="inline-flex items-center gap-2 cursor-pointer font-bold select-none">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={handleTogglePageSelect}
                className="w-4 h-4 accent-[#111111] cursor-pointer"
              />
              <span>
                Chọn trang này ({startIdx + 1}–{Math.min(startIdx + pageSize, filteredList.length)} /{' '}
                {filteredList.length})
              </span>
            </label>
            <span className="opacity-60 hidden sm:inline">
              Bấm vào từ để xem câu ví dụ song ngữ &amp; mẹo nhớ
            </span>
          </div>
        )}

        <div className="divide-y divide-current/15">
          {!pageItems.length ? (
            <div className="p-10 text-center space-y-3">
              <p className="font-serif font-bold text-lg">
                {vocab.length === 0
                  ? 'Kho từ đang trống'
                  : 'Không tìm thấy từ vựng phù hợp với bộ lọc'}
              </p>
              <p className="font-mono text-xs opacity-65 max-w-md mx-auto">
                {vocab.length === 0
                  ? 'Hãy thêm từ thủ công hoặc mở Khóa học HSK để tải file giáo trình .PDF / .DOCX tự động trích xuất từ vựng.'
                  : 'Thử đổi từ khóa tìm kiếm hoặc bấm "Xóa bộ lọc" để xem lại toàn bộ từ vựng.'}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {hasActiveFilter ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="t-btn-black px-4 py-2 font-mono text-xs font-bold"
                  >
                    Xóa toàn bộ bộ lọc
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="t-btn-black px-4 py-2 font-mono text-xs font-bold"
                    >
                      + Thêm từ đầu tiên
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/courses/5')}
                      className="t-btn px-4 py-2 bg-[#EFE078] text-[#111111] font-mono text-xs font-bold"
                    >
                      Tải file PDF / DOCX →
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            pageItems.map((w) => (
              <VocabRow
                key={w.id}
                word={w}
                lessonTitle={lessonTitleMap.get(w.lessonId)}
                selected={selectedIds.has(w.id)}
                expanded={expandedId === w.id}
                onToggleSelect={handleToggleSelect}
                onToggleExpand={handleToggleExpand}
                onSpeak={handleSpeak}
                onPracticeChar={handlePracticeChar}
                onOpenLessonFlashcard={handleOpenLessonFlashcard}
                onChangeStatus={changeWordStatus}
                onEdit={handleOpenEditModal}
                onDelete={deleteCustomWord}
              />
            ))
          )}
        </div>

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="px-3.5 sm:px-4 py-3 bg-[#F8F6F1] border-t border-[#141414]/15 flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono text-xs">
            <span className="opacity-70 text-[11px]">
              Hiển thị <strong>{startIdx + 1}</strong>–
              <strong>{Math.min(startIdx + pageSize, filteredList.length)}</strong> trên{' '}
              <strong>{filteredList.length.toLocaleString('vi-VN')}</strong> từ
            </span>

            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => goToPage(safePage - 1)}
                className="t-btn w-8 h-8 bg-white text-[#111111] flex items-center justify-center disabled:opacity-40"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {pageNumbers.map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} className="px-1.5 opacity-55">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p)}
                    className={`t-btn min-w-[32px] h-8 px-2 font-bold ${
                      p === safePage
                        ? 'bg-[#111111] text-white'
                        : 'bg-white text-[#111111] hover:bg-[#EFE078]'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => goToPage(safePage + 1)}
                className="t-btn w-8 h-8 bg-white text-[#111111] flex items-center justify-center disabled:opacity-40"
                aria-label="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <VocabWordModal
        open={modalOpen}
        editingWord={editingWord}
        defaultLevel={defaultModalLevel}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveWordModal}
      />
    </section>
  );
};
