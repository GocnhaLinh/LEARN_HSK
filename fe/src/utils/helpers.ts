// Temporary compatibility facade — re-exports pure utilities from @/lib/*
// Will be removed in Phase 8 once all features import from @/lib/* directly.
export { DAYS_VI, formatClock, getTodayISO, SHORT_DAYS, WEEKLY_LABELS } from '@/lib/date-utils';
export { spawnConfetti, spawnFloatingXP } from '@/lib/fx-utils';
export { normalizeSearch } from '@/lib/search-utils';
export { speakChinese } from '@/lib/speech-utils';
