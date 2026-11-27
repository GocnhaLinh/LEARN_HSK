export type ThemeMode = 'zine' | 'diary';
export type VocabStatus = 'mastered' | 'learning' | 'review' | 'new';
export type ToastVariant = 'dark' | 'yellow' | 'pink';

export interface CourseMeta {
  level: number;
  tier: 'primary' | 'intermediate';
  code: string;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  emoji: string;
  featured?: boolean;
}

export interface Lesson {
  id: string;
  level: number;
  title: string;
  desc: string;
  fromFile: boolean;
}

export interface VocabWord {
  id: string;
  lessonId: string;
  hanzi: string;
  pinyin: string;
  hanviet: string;
  english?: string;
  meaning: string;
  pos: string;
  level: number;
  status: VocabStatus;
  custom?: boolean;
  note: string;
  exampleZh: string;
  exampleVi: string;
}

export interface MindNote {
  id: string;
  title: string;
  tag: string;
  date: string;
  content: string;
}

export interface HandwritingItem {
  id: string;
  img: string;
  caption: string;
  date: string;
}

export interface MissionsDone {
  m1: boolean;
  m2: boolean;
  m3: boolean;
  m4: boolean;
}

export interface UserProfile {
  theme: ThemeMode;
  focusLevel: number;
  xp: number;
  streak: number;
  lastCheckinISO: string | null;
  dailyTarget: number;
  todayReviews: number;
  writtenCountToday: number;
  weeklyLog: number[];
  missionsDone: MissionsDone;
}

export interface ExtractedVocabRow {
  selected: boolean;
  hanzi: string;
  pinyin: string;
  english: string;
  meaning: string;
  exampleZh: string;
  exampleVi: string;
}

export interface ExtractedExerciseRow {
  exerciseType: 'quiz' | 'fill_blank' | 'listen' | 'translate';
  title: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  xpReward?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ExerciseItem {
  id: string;
  level: number;
  lessonId: string;
  exerciseType: 'quiz' | 'fill_blank' | 'listen' | 'translate';
  title: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  xpReward: number;
  completed?: boolean;
}

