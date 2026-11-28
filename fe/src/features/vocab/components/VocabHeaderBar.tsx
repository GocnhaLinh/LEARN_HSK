import { Download, FileSpreadsheet, Plus, SlidersHorizontal, Upload } from 'lucide-react';
import React from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { useVocabUiStore } from '@/features/vocab/stores/vocab-ui.store';

interface VocabHeaderBarProps {
  totalVocabCount: number;
  filtersOpen: boolean;
  hasActiveFilter: boolean;
  onToggleFilters: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: (rawJson: string) => void | Promise<void>;
}

export const VocabHeaderBar: React.FC<VocabHeaderBarProps> = React.memo(
  ({
    totalVocabCount,
    filtersOpen,
    hasActiveFilter,
    onToggleFilters,
    onExportCsv,
    onExportJson,
    onImportJson,
  }) => {
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => onImportJson(String(ev.target?.result || ''));
      reader.readAsText(file);
      e.target.value = '';
    };

    const filterTooltip = filtersOpen ? 'Ẩn bộ lọc & thống kê' : 'Hiện bộ lọc & thống kê';

    return (
      <Card
        variant="flat"
        padding="none"
        className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      >
        <div className="flex items-center justify-between lg:justify-start gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase opacity-65">
              [06] VOCABULARY ARCHIVE &amp; BACKUP
            </p>
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-serif font-bold text-2xl">Kho từ HSK 3.0</h2>
              <Badge variant="yellow" className="px-2 py-0.5 text-xs">
                {totalVocabCount.toLocaleString('vi-VN')} từ
              </Badge>
            </div>
          </div>

          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={onToggleFilters}
              aria-expanded={filtersOpen}
              aria-label={filterTooltip}
              className={`t-btn w-9 h-9 flex items-center justify-center relative transition-colors ${
                filtersOpen
                  ? 'bg-[#111111] text-[#EFE078]'
                  : 'bg-white text-[#111111] hover:bg-[#EFE078]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilter && !filtersOpen && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F4C2D7] border border-[#141414]"
                />
              )}
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute right-0 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 top-full mt-2 z-30 px-2.5 py-1 rounded-md bg-[#111111] text-[#EFE078] border border-[#141414] shadow-[2px_2px_0px_#141414] font-mono text-[11px] font-bold whitespace-nowrap opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-150"
            >
              {filterTooltip}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 font-mono text-[11px] sm:text-xs font-bold">
          <Button
            variant="primary"
            className="px-3 py-2 whitespace-nowrap"
            leftIcon={<Plus className="w-4 h-4 shrink-0" />}
            onClick={() => useVocabUiStore.getState().openAddModal()}
          >
            Thêm từ
          </Button>
          <Button
            variant="mint"
            className="px-3 py-2 whitespace-nowrap"
            leftIcon={<FileSpreadsheet className="w-4 h-4 shrink-0" />}
            title="Xuất danh sách đang lọc sang Excel/CSV"
            onClick={onExportCsv}
          >
            Xuất CSV
          </Button>
          <Button
            variant="yellow"
            className="px-3 py-2 whitespace-nowrap"
            leftIcon={<Download className="w-4 h-4 shrink-0" />}
            onClick={onExportJson}
          >
            Backup JSON
          </Button>
          <label className="t-btn px-3 py-2 bg-white text-[#111111] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap hover:bg-[#F4C2D7]">
            <Upload className="w-4 h-4 shrink-0" />
            <span>Khôi phục JSON</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </label>
        </div>
      </Card>
    );
  },
);

VocabHeaderBar.displayName = 'VocabHeaderBar';
