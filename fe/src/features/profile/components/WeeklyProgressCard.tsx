import React from 'react';
import type { HomeStats, XpLevelInfo } from '@/features/profile/types';
import { WEEKLY_LABELS } from '@/lib/date-utils';

interface WeeklyProgressCardProps {
  apiConnected: boolean;
  stats: HomeStats;
  todayReviews: number;
  dailyTarget: number;
  weeklyLog: number[];
  xpInfo: XpLevelInfo;
  onAdjustDailyTarget: (delta: number) => void;
}

const KPI_CARDS = [
  {
    key: 'masteredCount',
    label: 'ĐÃ THUỘC',
    badge: 'MASTERED',
    badgeClass: 'bg-[#111111] text-white rounded-[4px]',
    subtitle: 'Ghi nhớ vững vàng',
  },
  {
    key: 'learningCount',
    label: 'ĐANG HỌC',
    badge: 'LEARNING',
    badgeClass: 'bg-[#EFE078] text-[#111111] t-badge',
    subtitle: 'Đang trong lộ trình ôn',
  },
  {
    key: 'reviewCount',
    label: 'CẦN CHÚ Ý',
    badge: 'REVIEW!',
    badgeClass: 'bg-[#F4C2D7] text-[#111111] t-badge',
    subtitle: 'Ưu tiên ôn tập ngay',
  },
  {
    key: 'freshCount',
    label: 'TỪ MỚI',
    badge: 'NEW',
    badgeClass: 'bg-[#EFECE4] text-[#111111] t-badge',
    subtitle: 'Chưa mở khóa',
  },
] as const;

export const WeeklyProgressCard: React.FC<WeeklyProgressCardProps> = React.memo(
  ({
    apiConnected,
    stats,
    todayReviews,
    dailyTarget,
    weeklyLog,
    xpInfo,
    onAdjustDailyTarget,
  }) => {
    const dtPct =
      dailyTarget > 0 ? Math.min(100, Math.round((todayReviews / dailyTarget) * 100)) : 0;
    const maxWeeklyVal = Math.max(15, ...weeklyLog);

    return (
      <div className="space-y-5">
        <div className="t-banner px-5 py-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="font-mono text-[11px] px-2 py-0.5 bg-white/15 rounded text-[#EFE078]">
              [01] KEEP-TRACK SYSTEM
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl tracking-tight mt-1">
              MY PROGRESS
            </h2>
          </div>
          <p className="font-mono text-xs opacity-75">
            {apiConnected
              ? 'Đã kết nối NestJS API • Đồng bộ trực tiếp với MongoDB'
              : 'Tự động lưu cục bộ • Sẵn sàng đồng bộ khi kết nối NestJS + MongoDB'}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {KPI_CARDS.map((card) => (
            <div
              key={card.key}
              className="t-card t-card-hover p-4 sm:p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold">{card.label}</span>
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold ${card.badgeClass}`}>
                  {card.badge}
                </span>
              </div>
              <div className="font-serif font-extrabold text-4xl sm:text-5xl mt-3">
                {stats[card.key]}
              </div>
              <p className="text-xs opacity-70 mt-1">{card.subtitle}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          <div className="lg:col-span-6 t-card p-5 flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] uppercase opacity-65">
                    DAILY TARGET // MỤC TIÊU HÔM NAY
                  </p>
                  <p className="font-mono text-xl sm:text-2xl font-bold mt-1">
                    <span>{todayReviews}</span> / <span>{dailyTarget}</span> lượt ôn từ
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAdjustDailyTarget(-5)}
                    className="t-btn w-9 h-8 bg-white text-[#111111] font-mono text-xs font-bold hover:bg-[#F4C2D7]"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustDailyTarget(5)}
                    className="t-btn w-9 h-8 bg-white text-[#111111] font-mono text-xs font-bold hover:bg-[#EFE078]"
                  >
                    +5
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-3 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#111111] shimmer-bar transition-all duration-500"
                    style={{ width: `${dtPct}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[11px] mt-1.5 opacity-75">
                  <span>Tiến độ ngày</span>
                  <span>{dtPct}%</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-current/25">
              <div className="flex items-center justify-between font-mono text-xs font-bold mb-1.5">
                <span>
                  Level {xpInfo.xpLevel} ({xpInfo.inLevelXp} / 200 XP)
                </span>
                <span className="px-2 py-0.5 bg-[#F4C2D7] text-[#111111] t-badge text-[10px]">
                  XP SYSTEM
                </span>
              </div>
              <div className="h-2.5 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F4C2D7] shimmer-bar transition-all duration-500"
                  style={{ width: `${xpInfo.xpPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 t-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs font-bold uppercase tracking-wide">
                NHẬT KÝ LƯỢT ÔN 7 NGÀY GẦN NHẤT
              </p>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#EFE078] text-[#111111] t-badge font-bold">
                7D LOG
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4">
              {weeklyLog.map((val, idx) => {
                const hPct = Math.max(8, Math.round((val / maxWeeklyVal) * 100));
                const isToday = idx === 6;
                return (
                  <div
                    key={WEEKLY_LABELS[idx]}
                    className="flex flex-col items-center justify-end h-full gap-1 font-mono text-[10px]"
                  >
                    <span className="font-bold">{val}</span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t border-[1.5px] border-[#141414] transition-all duration-500 ${
                          isToday ? 'bg-[#F4C2D7]' : 'bg-[#EFE078]'
                        }`}
                        style={{ height: `${hPct}%` }}
                      />
                    </div>
                    <span className={isToday ? 'font-extrabold underline' : 'opacity-70'}>
                      {WEEKLY_LABELS[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

WeeklyProgressCard.displayName = 'WeeklyProgressCard';
