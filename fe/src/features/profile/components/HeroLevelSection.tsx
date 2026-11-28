import { GraduationCap, Play, Sparkles } from 'lucide-react';
import React from 'react';
import { HSK_LEVELS } from '@/data/defaults';
import type { HomeStats } from '@/features/profile/types';

interface HeroLevelSectionProps {
  focusLevel: number;
  stats: HomeStats;
  onSelectFocusLevel: (lv: number) => void;
  onNavigate: (to: string) => void;
}

export const HeroLevelSection: React.FC<HeroLevelSectionProps> = React.memo(
  ({ focusLevel, stats, onSelectFocusLevel, onNavigate }) => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Hero Card */}
      <div className="lg:col-span-7 t-card p-5 sm:p-8 flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between sm:justify-start flex-nowrap gap-2 sm:gap-3 mb-3">
            <h1 className="font-serif font-extrabold text-[26px] sm:text-5xl tracking-tight leading-none whitespace-nowrap">
              HSK <span className="font-normal">(QUEST)</span>
            </h1>
            <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#F4C2D7] text-[#111111] border-2 border-[#141414] inline-flex flex-col items-center leading-tight shrink-0">
              <span className="font-serifcn text-sm sm:text-xl font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                〔 汉 · 语 〕
              </span>
              <span className="font-mono text-[8px] sm:text-[10px] font-bold whitespace-nowrap">
                CHUẨN 3.0 • 1–6
              </span>
            </div>
          </div>

          <p className="font-serif italic text-xl sm:text-2xl tracking-wide opacity-90 mb-4">
            PERSONAL MANDARIN ZINE
          </p>

          <p className="text-sm sm:text-[15px] leading-relaxed opacity-80 max-w-xl">
            Không gian tự học tiếng Trung chuẩn <strong>HSK 3.0 (Sơ cấp 1–3 &amp; Trung cấp 4–6)</strong>{' '}
            siêu dễ thương: học theo từng khóa học bài bản, tải giáo trình bảng 6 cột{' '}
            <strong>.PDF / .DOCX</strong> để tự động chia bài, lật thẻ Digicam &amp; luyện viết trên lưới
            米字格.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 mt-6 sm:mt-7 pt-5 border-t border-dashed border-current/25">
          <button
            type="button"
            onClick={() => onNavigate(`/courses/${focusLevel}`)}
            className="t-btn-black px-2.5 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-mono font-bold tracking-wide flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
          >
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>
              VÀO KHÓA HSK {focusLevel}
              <span className="hidden sm:inline"> NGAY</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/flashcard/hsk${focusLevel}`)}
            className="t-btn px-2.5 sm:px-5 py-2.5 sm:py-3 bg-[#EFE078] text-[#111111] text-[11px] sm:text-sm font-mono font-bold tracking-wide flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap hover:brightness-95"
          >
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0" />
            <span>
              HỌC FLASHCARD<span className="hidden sm:inline"> NGAY</span>
            </span>
          </button>
        </div>
      </div>

      {/* Right Hero Card: Interactive HSK 1-6 Focus Selector + Stamp */}
      <div className="lg:col-span-5 t-card p-6 flex flex-col justify-between relative">
        <div className="hidden sm:flex flex-col items-center justify-center w-20 h-20 rounded-full bg-[#EFE078] text-[#111111] stamp-sticker absolute -top-4 -right-3 rotate-12 select-none z-10">
          <span className="font-mono text-[9px] font-extrabold tracking-tight">HSK 3.0</span>
          <span className="font-mono text-[10px] font-extrabold">CẤP {focusLevel}</span>
          <Sparkles className="w-3.5 h-3.5 mt-0.5" />
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider opacity-65">
            CURRENT LEVEL // CẤP ĐỘ ĐANG THEO ĐUỔI
          </p>
          <h2 className="font-serif font-bold text-2xl mt-1">
            {stats.focusMeta.emoji} {stats.focusMeta.title}
          </h2>
          <p className="text-xs opacity-75 mt-1 leading-relaxed">{stats.focusMeta.subtitle}</p>

          <div className="grid grid-cols-6 gap-1.5 mt-3.5 font-mono text-[11px] font-bold">
            {HSK_LEVELS.map((lv) => {
              const active = lv === focusLevel;
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => onSelectFocusLevel(lv)}
                  className={`t-btn py-1.5 ${
                    active ? 'bg-[#111111] text-[#EFE078]' : 'bg-white text-[#111111] hover:bg-[#EFE078]'
                  }`}
                >
                  H{lv}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 mt-5 pt-4 border-t border-dashed border-current/25">
          <div>
            <div className="flex justify-between font-mono text-[11px] font-bold mb-1">
              <span>
                Tiến độ HSK {focusLevel} ({stats.focusPct}%)
              </span>
              <span>
                {stats.focusMastered} / {stats.focusTotal} từ đã thuộc
              </span>
            </div>
            <div className="h-3 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
              <div
                className="h-full shimmer-bar transition-all duration-500"
                style={{ width: `${stats.focusPct}%`, backgroundColor: stats.focusMeta.color }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <div className="flex justify-between font-mono text-[10px] font-semibold mb-1">
                <span>Sơ cấp (1–3)</span>
                <span>
                  {stats.primaryMastered}/{stats.primaryTotal}
                </span>
              </div>
              <div className="h-2 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EFE078] shimmer-bar transition-all duration-500"
                  style={{ width: `${stats.primaryPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-mono text-[10px] font-semibold mb-1">
                <span>Trung cấp (4–6)</span>
                <span>
                  {stats.interMastered}/{stats.interTotal}
                </span>
              </div>
              <div className="h-2 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#CBEAD8] shimmer-bar transition-all duration-500"
                  style={{ width: `${stats.interPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1.5 font-mono text-[10px] sm:text-[11px]">
            <span className="whitespace-nowrap truncate">
              <span className="hidden sm:inline">Từ tải từ file / cá nhân</span>
              <span className="sm:hidden">Từ file / cá nhân</span>:{' '}
              <strong>{stats.customCount}</strong> từ
            </span>
            <span className="px-2 py-0.5 bg-[#EFE078] text-[#111111] font-bold t-badge text-[10px] whitespace-nowrap shrink-0">
              加油 • CỐ LÊN!
            </span>
          </div>
        </div>
      </div>
    </div>
  ),
);

HeroLevelSection.displayName = 'HeroLevelSection';
