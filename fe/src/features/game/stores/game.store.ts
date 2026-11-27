import { create } from 'zustand';
import type { GameLevelFilter, GameStore, PickedResult } from '@/features/game/types';
import type { VocabWord } from '@/types';

export const GAME_LEVEL_OPTIONS: ReadonlyArray<[GameLevelFilter, string]> = [
  ['all', 'Tất cả HSK (1–6)'],
  ['5', 'HSK 5 (Đang học)'],
  ['4', 'HSK 4'],
  ['6', 'HSK 6'],
  ['primary', 'Sơ cấp (HSK 1–3)'],
];

export function choiceBgClass(
  id: string,
  targetId: string,
  picked: PickedResult | null,
  idleClass: string,
): string {
  if (!picked) return idleClass;
  if (picked.id === id) return picked.correct ? 'bg-[#CBEAD8]' : 'bg-[#F4C2D7]';
  return !picked.correct && id === targetId ? 'bg-[#CBEAD8]' : 'bg-white';
}

function pickRandomWords(vocab: VocabWord[], filter: GameLevelFilter, count: number): VocabWord[] {
  let base =
    filter === 'primary'
      ? vocab.filter((w) => w.level <= 3)
      : filter !== 'all'
        ? vocab.filter((w) => String(w.level) === filter)
        : vocab;
  if (base.length < count) base = vocab;
  const pool = [...base];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export const useGameStore = create<GameStore>((set, get) => ({
  levelFilter: '5',
  score: 0,
  combo: 0,
  choices: [],
  target: null,
  pickedResult: null,
  matchPairs: [],
  solvedIds: [],
  selLeft: null,
  selRight: null,

  setLevelFilter: (levelFilter) => set({ levelFilter }),
  resetScore: () => set({ score: 0, combo: 0 }),

  startNewRound: (mode, vocab) => {
    const { levelFilter, target: prevTarget } = get();
    if (vocab.length < 4) {
      set({ pickedResult: null, choices: [], target: null, matchPairs: [], solvedIds: [], selLeft: null, selRight: null });
      return null;
    }
    if (mode === 'match') {
      set({ pickedResult: null, matchPairs: pickRandomWords(vocab, levelFilter, 5), solvedIds: [], selLeft: null, selRight: null });
      return null;
    }
    const picked = pickRandomWords(vocab, levelFilter, 4);
    const pool = picked.length > 1 && prevTarget ? picked.filter((w) => w.id !== prevTarget.id) : picked;
    const target = pool[Math.floor(Math.random() * pool.length)] ?? picked[0] ?? null;
    set({ pickedResult: null, choices: picked, target });
    return target;
  },

  answerQuiz: (id) => {
    const { pickedResult, target, score, combo } = get();
    if (pickedResult || !target) return null;
    const correct = id === target.id;
    const nextCombo = correct ? combo + 1 : 0;
    set({ pickedResult: { id, correct }, score: correct ? score + 15 : score, combo: nextCombo });
    return { correct, target, combo: nextCombo };
  },

  selectMatchSide: (side, id) => {
    const { solvedIds, selLeft, selRight, matchPairs, score, combo } = get();
    if (solvedIds.includes(id)) return 'pending';
    const nextLeft = side === 'left' ? (selLeft === id && !selRight ? null : id) : selLeft;
    const nextRight = side === 'right' ? (selRight === id && !selLeft ? null : id) : selRight;
    if (!nextLeft || !nextRight) {
      set({ selLeft: nextLeft, selRight: nextRight });
      return 'pending';
    }
    if (nextLeft === nextRight) {
      const nextSolved = [...solvedIds, nextLeft];
      set({ solvedIds: nextSolved, score: score + 10, combo: combo + 1, selLeft: null, selRight: null });
      return {
        word: matchPairs.find((w) => w.id === nextLeft),
        completed: matchPairs.length > 0 && nextSolved.length === matchPairs.length,
      };
    }
    set({ combo: 0, selLeft: null, selRight: null });
    return 'mismatch';
  },
}));
