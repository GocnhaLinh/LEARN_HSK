import { Calendar, Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { formatClock } from '@/lib/date-utils';

/** Isolated 1-second clock so HomePage never re-renders on every tick */
export const LiveClockBadges: React.FC = React.memo(() => {
  const [clock, setClock] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <span className="px-2 sm:px-2.5 py-1 bg-[#111111] text-white font-semibold rounded-[4px] inline-flex items-center gap-1.5 whitespace-nowrap">
        <Calendar className="w-3.5 h-3.5 text-[#F4C2D7] shrink-0" />
        <span>{clock.dateStr}</span>
      </span>
      <span className="px-2 sm:px-2.5 py-1 bg-[#EFE078] text-[#111111] font-bold t-badge inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>{clock.timeStr}</span>
      </span>
    </>
  );
});

LiveClockBadges.displayName = 'LiveClockBadges';
