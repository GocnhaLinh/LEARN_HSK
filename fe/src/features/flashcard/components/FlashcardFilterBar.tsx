import React from "react";
import { Card } from "@/components/ui";

interface FilterOption {
  key: string;
  label: string;
  shortLabel: string;
}

const STATUS_FILTERS: ReadonlyArray<FilterOption> = [
  { key: "all", label: "Tất cả", shortLabel: "Tất cả" },
  { key: "review", label: "Cần chú ý", shortLabel: "Chú ý" },
  { key: "learning", label: "Đang học", shortLabel: "Đang học" },
  { key: "new", label: "Từ mới", shortLabel: "Từ mới" },
];

const LEVEL_FILTERS: ReadonlyArray<FilterOption> = [
  { key: "hsk1", label: "HSK 1", shortLabel: "H1" },
  { key: "hsk2", label: "HSK 2", shortLabel: "H2" },
  { key: "hsk3", label: "HSK 3", shortLabel: "H3" },
  { key: "hsk4", label: "HSK 4", shortLabel: "H4" },
  { key: "hsk5", label: "HSK 5", shortLabel: "H5" },
  { key: "hsk6", label: "HSK 6", shortLabel: "H6" },
];

interface FlashcardFilterBarProps {
  activeFilter: string;
  activeLessonTitle: string | null;
  onSelectFilter: (key: string) => void;
}

const FilterGroup: React.FC<{
  options: ReadonlyArray<FilterOption>;
  activeFilter: string;
  gridClass: string;
  btnPadClass: string;
  onSelect: (key: string) => void;
}> = ({ options, activeFilter, gridClass, btnPadClass, onSelect }) => (
  <div className={`${gridClass} sm:flex sm:flex-wrap gap-1.5`}>
    {options.map((opt) => (
      <button
        key={opt.key}
        type="button"
        onClick={() => onSelect(opt.key)}
        className={`t-btn ${btnPadClass} py-1.5 whitespace-nowrap text-center ${
          activeFilter === opt.key
            ? "bg-[#111111] text-white font-bold"
            : "bg-white text-[#111111] hover:bg-[#EFE078]"
        }`}
      >
        <span className="sm:hidden">{opt.shortLabel}</span>
        <span className="hidden sm:inline">{opt.label}</span>
      </button>
    ))}
  </div>
);

export const FlashcardFilterBar: React.FC<FlashcardFilterBarProps> = React.memo(
  ({ activeFilter, activeLessonTitle, onSelectFilter }) => (
    <Card
      variant="flat"
      padding="none"
      className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3"
    >
      <div className="shrink-0">
        <p className="font-mono text-[10px] sm:text-[11px] uppercase opacity-65">
          [03] SMART FLASHCARD SYSTEM
        </p>
        <h2 className="font-serif font-bold text-xl sm:text-2xl">
          Y2K Digicam &amp; Flip-TTS
        </h2>
        {activeLessonTitle && (
          <p className="font-mono text-xs font-bold text-[#A62626] mt-1">
            Đang ôn bài học: {activeLessonTitle}
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:flex-wrap lg:justify-end gap-1.5 font-mono text-[11px] sm:text-xs">
        <FilterGroup
          options={STATUS_FILTERS}
          activeFilter={activeFilter}
          gridClass="grid grid-cols-4"
          btnPadClass="px-1.5 sm:px-2.5"
          onSelect={onSelectFilter}
        />
        <FilterGroup
          options={LEVEL_FILTERS}
          activeFilter={activeFilter}
          gridClass="grid grid-cols-6"
          btnPadClass="px-1 sm:px-2.5"
          onSelect={onSelectFilter}
        />
      </div>
    </Card>
  ),
);

FlashcardFilterBar.displayName = "FlashcardFilterBar";
