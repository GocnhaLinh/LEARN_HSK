import { CheckCircle2 } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroLevelSection } from '@/features/profile/components/HeroLevelSection';
import { LiveClockBadges } from '@/features/profile/components/LiveClockBadges';
import { MissionsGrid } from '@/features/profile/components/MissionsGrid';
import { StreakCalendarCard } from '@/features/profile/components/StreakCalendarCard';
import { WeeklyProgressCard } from '@/features/profile/components/WeeklyProgressCard';
import {
  useAdjustDailyTarget,
  useDailyCheckin,
  useSetFocusLevel,
  useToggleMission,
} from '@/features/profile/hooks/useProfile';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import {
  buildStreakDays,
  computeHomeStats,
  computeXpLevel,
} from '@/features/profile/utils/profile-stats';
import { useVocab } from '@/features/vocab/hooks/useVocab';
import { getTodayISO } from '@/lib/date-utils';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const profile = useProfileStore((s) => s.profile);
  const apiConnected = useProfileStore((s) => s.apiConnected);
  const { data: vocab = [] } = useVocab();

  const performDailyCheckin = useDailyCheckin();
  const adjustDailyTarget = useAdjustDailyTarget();
  const setFocusLevel = useSetFocusLevel();
  const toggleMissionDone = useToggleMission();

  const handleNavigate = useCallback((to: string) => navigate(to), [navigate]);

  const checkedToday = profile.lastCheckinISO === getTodayISO();
  const stats = useMemo(
    () => computeHomeStats(vocab, profile.focusLevel),
    [vocab, profile.focusLevel],
  );
  const streakDays = useMemo(
    () => buildStreakDays(profile.streak, checkedToday),
    [profile.streak, checkedToday],
  );
  const xpInfo = useMemo(() => computeXpLevel(profile.xp), [profile.xp]);

  return (
    <section className="space-y-7">
      {/* Metadata Strip & Daily Check-in */}
      <div className="t-card-flat px-3.5 sm:px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
        <div className="flex items-center justify-between lg:justify-start gap-2 font-mono text-[10px] sm:text-xs min-w-0">
          <LiveClockBadges />
          <span className="hidden lg:inline-block px-2.5 py-1 bg-[#F4C2D7] text-[#111111] font-bold t-badge whitespace-nowrap shrink-0">
            ISSUE #3.0 ✨
          </span>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-2">
          <span className="lg:hidden px-2.5 py-1 bg-[#F4C2D7] text-[#111111] font-mono text-[10px] sm:text-xs font-bold t-badge whitespace-nowrap shrink-0">
            ISSUE #3.0 ✨
          </span>
          <button
            type="button"
            onClick={(e) => void performDailyCheckin({ clientX: e.clientX, clientY: e.clientY })}
            className={`t-btn px-2.5 sm:px-3.5 py-1.5 text-[#111111] text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:bg-[#EFE078] ${
              checkedToday ? 'bg-[#CBEAD8]' : 'bg-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{checkedToday ? 'Đã điểm danh hôm nay ✓' : 'Điểm danh hôm nay (+15 XP)'}</span>
          </button>
        </div>
      </div>

      <StreakCalendarCard streak={profile.streak} streakDays={streakDays} />

      <HeroLevelSection
        focusLevel={profile.focusLevel}
        stats={stats}
        onSelectFocusLevel={setFocusLevel}
        onNavigate={handleNavigate}
      />

      <WeeklyProgressCard
        apiConnected={apiConnected}
        stats={stats}
        todayReviews={profile.todayReviews}
        dailyTarget={profile.dailyTarget}
        weeklyLog={profile.weeklyLog}
        xpInfo={xpInfo}
        onAdjustDailyTarget={adjustDailyTarget}
      />

      <MissionsGrid
        focusLevel={profile.focusLevel}
        writtenCountToday={profile.writtenCountToday}
        missionsDone={profile.missionsDone}
        stats={stats}
        onToggleMission={toggleMissionDone}
        onNavigate={handleNavigate}
      />
    </section>
  );
};
