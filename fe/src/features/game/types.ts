import type { VocabWord } from '@/types';

export type GameMode = 'quiz' | 'listen' | 'match';
export type GameLevelFilter = 'all' | '5' | '4' | '6' | 'primary';

export interface PickedResult {
  id: string;
  correct: boolean;
}

export interface GameStore {
  levelFilter: GameLevelFilter;
  score: number;
  combo: number;
  choices: VocabWord[];
  target: VocabWord | null;
  pickedResult: PickedResult | null;
  matchPairs: VocabWord[];
  solvedIds: string[];
  selLeft: string | null;
  selRight: string | null;
  setLevelFilter: (filter: GameLevelFilter) => void;
  startNewRound: (mode: GameMode, vocab: VocabWord[]) => VocabWord | null;
  answerQuiz: (id: string) => { correct: boolean; target: VocabWord; combo: number } | null;
  selectMatchSide: (
    side: 'left' | 'right',
    id: string,
  ) => 'pending' | 'mismatch' | { word?: VocabWord; completed: boolean };
  resetScore: () => void;
}
