import { COURSES_META, DEFAULT_PROFILE } from '@/data/defaults';
import type { HomeStats, StreakDayCell, XpLevelInfo } from '@/features/profile/types';
import { SHORT_DAYS } from '@/lib/date-utils';
import type { UserProfile, VocabWord } from '@/types';

const XP_PER_LEVEL = 200;

export function normalizeProfile(raw?: Partial<UserProfile> | null): UserProfile {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PROFILE };
  const md = raw.missionsDone;
  return {
    theme: raw.theme === 'diary' ? 'diary' : 'zine',
    focusLevel: typeof raw.focusLevel === 'number' ? raw.focusLevel : DEFAULT_PROFILE.focusLevel,
    xp: typeof raw.xp === 'number' ? raw.xp : DEFAULT_PROFILE.xp,
    streak: typeof raw.streak === 'number' ? raw.streak : DEFAULT_PROFILE.streak,
    lastCheckinISO: typeof raw.lastCheckinISO === 'string' ? raw.lastCheckinISO : null,
    dailyTarget: typeof raw.dailyTarget === 'number' ? raw.dailyTarget : DEFAULT_PROFILE.dailyTarget,
    todayReviews:
      typeof raw.todayReviews === 'number' ? raw.todayReviews : DEFAULT_PROFILE.todayReviews,
    writtenCountToday:
      typeof raw.writtenCountToday === 'number'
        ? raw.writtenCountToday
        : DEFAULT_PROFILE.writtenCountToday,
    weeklyLog:
      Array.isArray(raw.weeklyLog) && raw.weeklyLog.length === 7
        ? raw.weeklyLog
        : [...DEFAULT_PROFILE.weeklyLog],
    missionsDone: {
      m1: Boolean(md?.m1),
      m2: Boolean(md?.m2),
      m3: Boolean(md?.m3),
      m4: Boolean(md?.m4),
    },
  };
}

/** Single O(N) pass over vocab to compute all HomePage KPIs, tier progress bars & mission chips */
export function computeHomeStats(vocab: VocabWord[], focusLevel: number): HomeStats {
  let masteredCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let freshCount = 0;
  let focusTotal = 0;
  let focusMastered = 0;
  let primaryTotal = 0;
  let primaryMastered = 0;
  let interTotal = 0;
  let interMastered = 0;
  let customCount = 0;
  const reviewChips: string[] = [];
  const writeSampleChars: string[] = [];

  for (const w of vocab) {
    if (w.status === 'mastered') masteredCount++;
    else if (w.status === 'learning') learningCount++;
    else if (w.status === 'review') {
      reviewCount++;
      if (reviewChips.length < 5) reviewChips.push(w.hanzi);
    } else {
      freshCount++;
    }

    if (w.level === focusLevel) {
      focusTotal++;
      if (w.status === 'mastered') focusMastered++;
      if (writeSampleChars.length < 5) {
        const ch = Array.from(w.hanzi)[0];
        if (ch) writeSampleChars.push(ch);
      }
    }

    if (w.level <= 3) {
      primaryTotal++;
      if (w.status === 'mastered') primaryMastered++;
    } else {
      interTotal++;
      if (w.status === 'mastered') interMastered++;
    }

    if (w.custom) customCount++;
  }

  const focusMeta = COURSES_META.find((c) => c.level === focusLevel) || COURSES_META[4];
  const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

  return {
    masteredCount,
    learningCount,
    reviewCount,
    freshCount,
    reviewChips,
    writeSampleChars,
    focusMeta,
    focusTotal,
    focusMastered,
    focusPct: pct(focusMastered, focusTotal),
    primaryTotal,
    primaryMastered,
    primaryPct: pct(primaryMastered, primaryTotal),
    interTotal,
    interMastered,
    interPct: pct(interMastered, interTotal),
    customCount,
  };
}

/** Build the 7-day rolling streak strip ending today */
export function buildStreakDays(
  streak: number,
  checkedToday: boolean,
  today: Date = new Date(),
): StreakDayCell[] {
  const cells: StreakDayCell[] = [];
  const pastStreakLimit = Math.min(6, Math.max(0, streak - (checkedToday ? 1 : 0)));

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const isToday = i === 0;
    cells.push({
      dayName: SHORT_DAYS[d.getDay()],
      dateText: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      lit: isToday ? checkedToday : i <= pastStreakLimit,
    });
  }
  return cells;
}

/** Compute user level (200 XP per level) and progress within the current level */
export function computeXpLevel(xp: number): XpLevelInfo {
  const safeXp = Math.max(0, xp);
  const xpLevel = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const inLevelXp = safeXp % XP_PER_LEVEL;
  const xpPct = Math.round((inLevelXp / XP_PER_LEVEL) * 100);
  return { xpLevel, inLevelXp, xpPct };
}
