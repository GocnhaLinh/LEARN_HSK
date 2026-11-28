import React from 'react';
import type { StreakDayCell } from '@/features/profile/types';

interface StreakCalendarCardProps {
  streak: number;
  streakDays: StreakDayCell[];
}

export const StreakCalendarCard: React.FC<StreakCalendarCardProps> = React.memo(
  ({ streak, streakDays }) => (
    <div className="t-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-[#EFE078] text-[#111111] t-badge whitespace-nowrap shrink-0">
            DAILY STREAK CHECK-IN
          </span>
          <span className="text-sm sm:text-base font-bold">
            Tuyệt vời! Bạn đang giữ chuỗi {streak} ngày Streak!
          </span>
        </div>
        <span className="font-mono text-[11px] opacity-70">LỊCH ĐIỂM DANH 7 NGÀY GẦN NHẤT</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {streakDays.map((cell) => (
          <div
            key={cell.dateText}
            className={`p-2 rounded-xl border-[1.5px] border-[#141414] flex flex-col items-center justify-center gap-0.5 font-mono text-[10px] ${
              cell.lit ? 'bg-[#EFE078] text-[#111111] font-bold' : 'bg-[#F8F6F1] opacity-75'
            }`}
          >
            <span>{cell.dayName}</span>
            <span className="text-sm leading-none">{cell.lit ? '🔥' : '○'}</span>
            <span>{cell.dateText}</span>
          </div>
        ))}
      </div>
    </div>
  ),
);

StreakCalendarCard.displayName = 'StreakCalendarCard';
