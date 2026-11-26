import {
  ExerciseItem,
  HandwritingItem,
  Lesson,
  LevelScoreSummary,
  MindNote,
  ScoreHistoryItem,
  ThemeMode,
  UserProfile,
  VocabStatus,
  VocabWord,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${errText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () =>
    request<{ status: string; service: string; mongodb: string; timestamp: string }>('/health'),

  // Profile & Progress
  getProfile: () => request<UserProfile>('/profile'),
  updateProfile: (payload: Partial<{ theme: ThemeMode; focusLevel: number; dailyTarget: number }>) =>
    request<UserProfile>('/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  dailyCheckin: () =>
    request<{ profile: UserProfile; alreadyCheckedIn: boolean }>('/profile/checkin', {
      method: 'POST',
    }),
  addXp: (amount: number) =>
    request<UserProfile>('/profile/xp', { method: 'POST', body: JSON.stringify({ amount }) }),
  recordReview: (xpAmount = 0, markMission4 = false) =>
    request<UserProfile>('/profile/review', {
      method: 'POST',
      body: JSON.stringify({ xpAmount, markMission4 }),
    }),
  recordWritten: (xpAmount = 10) =>
    request<UserProfile>('/profile/written', {
      method: 'POST',
      body: JSON.stringify({ xpAmount }),
    }),
  toggleMission: (key: string, done?: boolean) =>
    request<{ profile: UserProfile; completedNow: boolean }>(`/profile/missions/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ done }),
    }),

  // Lessons
  getLessons: (level?: number) =>
    request<Lesson[]>(level ? `/lessons?level=${level}` : '/lessons'),
  bulkImportLessons: (payload: {
    level: number;
    baseTitle: string;
    splitSize: number;
    autoGenerateExercises?: boolean;
    words: Array<{
      hanzi: string;
      pinyin?: string;
      english?: string;
      meaning?: string;
      exampleZh?: string;
      exampleVi?: string;
    }>;
    extractedExercises?: Array<{
      exerciseType?: 'quiz' | 'fill_blank' | 'listen' | 'translate';
      title: string;
      question: string;
      options: string[];
      correctAnswer: string;
      explanation?: string;
      xpReward?: number;
    }>;
  }) =>
    request<{
      lessons: Lesson[];
      words: VocabWord[];
      exercises: ExerciseItem[];
      totalChunks: number;
      totalWords: number;
      totalExercises: number;
      profile: UserProfile;
    }>('/lessons/import', { method: 'POST', body: JSON.stringify(payload) }),

  // Vocab
  getVocab: () => request<VocabWord[]>('/vocab'),
  createVocab: (payload: {
    hanzi: string;
    pinyin: string;
    hanviet?: string;
    meaning: string;
    pos?: string;
    level: number;
    exampleZh?: string;
    exampleVi?: string;
  }) =>
    request<{ word: VocabWord; profile: UserProfile }>('/vocab', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateVocabStatus: (id: string, status: VocabStatus, recordReview = false) =>
    request<{ word: VocabWord; profile: UserProfile | null }>(`/vocab/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, recordReview }),
    }),
  deleteVocab: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/vocab/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: () => request<MindNote[]>('/notes'),
  createNote: (payload: { title: string; tag: string; content: string }) =>
    request<{ note: MindNote; profile: UserProfile }>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateNote: (id: string, payload: { title: string; tag: string; content: string }) =>
    request<MindNote>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteNote: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/notes/${id}`, { method: 'DELETE' }),

  // Handwriting
  getHandwriting: () => request<HandwritingItem[]>('/handwriting'),
  createHandwriting: (payload: { img: string; caption?: string }) =>
    request<{ item: HandwritingItem; profile: UserProfile }>('/handwriting', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteHandwriting: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/handwriting/${id}`, { method: 'DELETE' }),

  // Exercises (stored inside HSK1..HSK6 collections)
  getExercises: (level?: number) =>
    request<ExerciseItem[]>(level ? `/exercises?level=${level}` : '/exercises'),
  submitExercise: (id: string, answer: string) =>
    request<{
      correct: boolean;
      correctAnswer: string;
      explanation: string;
      xpEarned: number;
      exercise: ExerciseItem;
      profile: UserProfile | null;
    }>(`/exercises/${id}/submit`, { method: 'POST', body: JSON.stringify({ answer }) }),

  // Scores & Điểm thi đua
  getScores: (level?: number) =>
    request<{ byLevel: LevelScoreSummary[]; history: ScoreHistoryItem[] }>(
      level ? `/scores?level=${level}` : '/scores',
    ),
  recordScore: (payload: {
    level: number;
    mode: 'quiz' | 'listen' | 'match' | 'exercise' | 'writing';
    score: number;
    combo?: number;
    xpEarned?: number;
    detail?: string;
  }) =>
    request<ScoreHistoryItem>('/scores', { method: 'POST', body: JSON.stringify(payload) }),

  // Backup
  exportBackup: () => request<any>('/backup/export'),
  importBackup: (payload: any) =>
    request<any>('/backup/import', { method: 'POST', body: JSON.stringify(payload) }),
};
