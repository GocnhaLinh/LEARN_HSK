import { FilterX, Search, X } from 'lucide-react';
import React from 'react';
import { Card, Input, Select } from '@/components/ui';
import { HSK_LEVELS } from '@/data/defaults';
import { useVocabUiStore } from '@/features/vocab/stores/vocab-ui.store';
import type { VocabSortOption } from '@/features/vocab/types';
import type { Lesson } from '@/types';

const PAGE_SIZES = [30, 50, 100] as const;
const SORT_OPTIONS: ReadonlyArray<[VocabSortOption, string]> = [
  ['default', 'Thứ tự giáo trình'],
  ['pinyin-asc', 'Pinyin A → Z'],
  ['status', 'Ưu tiên cần ôn'],
  ['level-asc', 'HSK thấp → cao'],
  ['level-desc', 'HSK cao → thấp'],
];

interface VocabFilterToolbarProps {
  searchInput: string;
  onSearchChange: (val: string) => void;
  levelFilter: string;
  lessonFilter: string;
  sortBy: VocabSortOption;
  availableLessons: Lesson[];
  filteredCount: number;
  safePage: number;
  totalPages: number;
  hasActiveFilter: boolean;
  onUpdateParam: (key: string, val: string) => void;
  onClearAllFilters: () => void;
  onOpenImportCourse: () => void;
}

export const VocabFilterToolbar: React.FC<VocabFilterToolbarProps> = ({
  searchInput,
  onSearchChange,
  levelFilter,
  lessonFilter,
  sortBy,
  availableLessons,
  filteredCount,
  safePage,
  totalPages,
  hasActiveFilter,
  onUpdateParam,
  onClearAllFilters,
  onOpenImportCourse,
}) => {
  const pageSize = useVocabUiStore((s) => s.pageSize);
  const setPageSize = useVocabUiStore((s) => s.setPageSize);

  return (
    <Card padding="none" className="p-3.5 sm:p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        <div className="md:col-span-5">
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm Chữ Hán, Pinyin, Tiếng Anh, nghĩa Việt, ví dụ..."
            leftIcon={<Search className="w-4 h-4" />}
            rightSlot={
              searchInput ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="opacity-55 hover:opacity-100"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        <div className="md:col-span-2">
          <Select
            value={levelFilter}
            onChange={(e) => onUpdateParam('level', e.target.value)}
            className="w-full px-2.5 py-2"
          >
            <option value="all">Tất cả HSK (1–6)</option>
            {HSK_LEVELS.map((lv) => (
              <option key={lv} value={String(lv)}>
                HSK {lv}
              </option>
            ))}
          </Select>
        </div>

        <div className="md:col-span-3">
          <Select
            value={lessonFilter}
            onChange={(e) => onUpdateParam('lesson', e.target.value)}
            className="w-full px-2.5 py-2 truncate"
          >
            <option value="all">Tất cả bài học ({availableLessons.length})</option>
            {availableLessons.map((l) => (
              <option key={l.id} value={l.id}>
                HSK {l.level} • {l.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="md:col-span-2">
          <Select
            value={sortBy}
            onChange={(e) => onUpdateParam('sort', e.target.value)}
            className="w-full px-2.5 py-2"
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dashed border-current/15 font-mono text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="opacity-75">
            Tìm thấy <strong>{filteredCount.toLocaleString('vi-VN')}</strong> từ
            {filteredCount > 0 && (
              <>
                {' '}
                • Trang <strong>{safePage}</strong>/{totalPages}
              </>
            )}
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="px-2 py-0.5 bg-[#F4C2D7] text-[#111111] border border-[#141414] rounded font-bold inline-flex items-center gap-1 hover:brightness-95"
            >
              <FilterX className="w-3 h-3" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="opacity-65 hidden sm:inline">Hiển thị:</span>
          <Select
            selectSize="xs"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-white py-0.5 border"
          >
            {PAGE_SIZES.map((sz) => (
              <option key={sz} value={sz}>
                {sz} / trang
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={onOpenImportCourse}
            className="px-2.5 py-0.5 bg-[#EFE078]/70 text-[#111111] border border-[#141414] rounded font-bold hover:bg-[#EFE078] whitespace-nowrap"
          >
            📄 Nhập PDF/DOCX →
          </button>
        </div>
      </div>
    </Card>
  );
};
