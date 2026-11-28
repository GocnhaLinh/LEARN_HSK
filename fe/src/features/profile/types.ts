import type {
  CourseMeta,
  ExerciseItem,
  HandwritingItem,
  Lesson,
  MindNote,
  MissionsDone,
  ThemeMode,
  UserProfile,
  VocabWord,
} from '@/types';

export interface HealthResponse {
  status: string;
  service: string;
  mongodb: string;
  timestamp: string;
}

export interface BootstrapResponse {
  profile: UserProfile;
  lessons: Lesson[];
  vocab: VocabWord[];
  exercises: ExerciseItem[];
  notes: MindNote[];
  handwriting: HandwritingItem[];
}

export type UpdateProfilePayload = Partial<{
  theme: ThemeMode;
  focusLevel: number;
  dailyTarget: number;
}>;

export interface ProfileStore {
  profile: UserProfile;
  apiConnected: boolean;
  syncProfile: (next: Partial<UserProfile> | ((prev: UserProfile) => UserProfile)) => void;
  setApiConnected: (connected: boolean) => void;
}

export interface HomeStats {
  masteredCount: number;
  learningCount: number;
  reviewCount: number;
  freshCount: number;
  reviewChips: string[];
  writeSampleChars: string[];
  focusMeta: CourseMeta;
  focusTotal: number;
  focusMastered: number;
  focusPct: number;
  primaryTotal: number;
  primaryMastered: number;
  primaryPct: number;
  interTotal: number;
  interMastered: number;
  interPct: number;
  customCount: number;
}

export interface StreakDayCell {
  dayName: string;
  dateText: string;
  lit: boolean;
}

export interface XpLevelInfo {
  xpLevel: number;
  inLevelXp: number;
  xpPct: number;
}

export interface HomeMissionItem {
  key: keyof MissionsDone;
  badge: string;
  badgeBg: string;
  title: string;
  desc: string;
  chips: string[];
  btnText: string;
  route: string;
}
