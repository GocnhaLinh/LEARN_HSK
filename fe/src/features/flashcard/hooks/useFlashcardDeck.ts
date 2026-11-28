import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useCourses } from '@/features/courses/hooks/useCourses';
import { useFlashcardStore } from '@/features/flashcard/stores/flashcard.store';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import { vocabApi } from '@/features/vocab/api/vocab.api';
import { useVocab, vocabKeys } from '@/features/vocab/hooks/useVocab';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { type EffectCoords, spawnConfetti, spawnFloatingXP } from '@/lib/fx-utils';
import { speakChinese } from '@/lib/speech-utils';
import { useToastStore } from '@/stores/toast.store';
import type { VocabStatus, VocabWord } from '@/types';

const STATUS_FILTER_SET = new Set(['review', 'learning', 'new']);

const FLASHCARD_XP: Record<VocabStatus, number> = {
  review: 5,
  learning: 10,
  mastered: 20,
  new: 0,
};

const FLASHCARD_LABEL: Partial<Record<VocabStatus, (hanzi: string) => string>> = {
  review: (h) => `Đánh dấu "${h}" Cần chú ý`,
  learning: (h) => `Đánh dấu "${h}" Đang học`,
  mastered: (h) => `Tuyệt vời! Đã thuộc "${h}"`,
};

function filterDeck(vocab: VocabWord[], activeFilter: string, lessonId?: string): VocabWord[] {
  if (lessonId) return vocab.filter((w) => w.lessonId === lessonId);
  if (STATUS_FILTER_SET.has(activeFilter)) {
    return vocab.filter((w) => w.status === activeFilter);
  }
  const hskMatch = /^hsk([1-6])$/.exec(activeFilter);
  if (hskMatch) {
    const level = Number(hskMatch[1]);
    return vocab.filter((w) => w.level === level);
  }
  return vocab;
}

export function useRateFlashcardWord() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VocabStatus; ev?: EffectCoords }) =>
      vocabApi.updateVocabStatus(id, status, true),
    onMutate: async ({ id, status, ev }) => {
      await qc.cancelQueries({ queryKey: vocabKeys.list });
      const word = qc.getQueryData<VocabWord[]>(vocabKeys.list)?.find((w) => w.id === id);
      if (!word) return;

      const xpGain = FLASHCARD_XP[status] || 0;
      qc.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) =>
        prev.map((w) => (w.id === id ? { ...w, status } : w)),
      );
      useProfileStore.getState().syncProfile((prev) => {
        const nextReviews = prev.todayReviews + 1;
        const nextWeekly = [...prev.weeklyLog];
        nextWeekly[6] = nextReviews;
        return {
          ...prev,
          xp: prev.xp + xpGain,
          todayReviews: nextReviews,
          weeklyLog: nextWeekly,
          missionsDone:
            nextReviews >= 5 ? { ...prev.missionsDone, m1: true } : prev.missionsDone,
        };
      });

      spawnFloatingXP(xpGain, ev);
      if (xpGain >= 15) spawnConfetti(ev, 12);
      const label = FLASHCARD_LABEL[status]?.(word.hanzi);
      if (label) useToastStore.getState().showToast(`${label} (+${xpGain} XP)`, 'yellow');
    },
    onSuccess: (res) => {
      const { syncProfile, setApiConnected } = useProfileStore.getState();
      if (res?.profile) syncProfile(res.profile);
      setApiConnected(true);
    },
    onError: () => {
      // Offline optimistic state already applied
    },
  });
}

export function useFlashcardDeck(filterParam?: string, lessonParam?: string) {
  const focusLevel = useProfileStore((s) => s.profile.focusLevel);
  const { data: lessons = [] } = useCourses();
  const { data: vocab = [] } = useVocab();
  const { mutate: rateWord } = useRateFlashcardWord();

  const activeFilter = lessonParam ? 'lesson' : filterParam || `hsk${focusLevel}`;
  const deckKey = lessonParam ? `lesson:${lessonParam}` : activeFilter;

  const storedIndex = useFlashcardStore((s) => s.indexByFilter[deckKey] ?? 0);
  const autoRead = useFlashcardStore((s) => s.autoRead);
  const flipTimerRef = useRef<number | null>(null);

  const clearFlipTimer = useCallback(() => {
    if (flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
  }, []);

  // Reset face animation when switching deck/mounting, while preserving saved card position per deck
  useEffect(() => {
    clearFlipTimer();
    useFlashcardStore.getState().resetFace();
    return clearFlipTimer;
  }, [deckKey, clearFlipTimer]);

  const list = useMemo(
    () => filterDeck(vocab, activeFilter, lessonParam),
    [vocab, activeFilter, lessonParam],
  );
  const safeIndex = list.length ? ((storedIndex % list.length) + list.length) % list.length : 0;
  const word = list[safeIndex] ?? null;

  const activeLessonTitle = useMemo(() => {
    if (!lessonParam) return null;
    return lessons.find((l) => l.id === lessonParam)?.title ?? lessonParam;
  }, [lessons, lessonParam]);

  // Auto-read when switching cards
  const wordId = word?.id;
  const wordHanzi = word?.hanzi;
  useEffect(() => {
    if (autoRead && wordId && wordHanzi) speakChinese(wordHanzi, 0.95);
  }, [autoRead, wordId, wordHanzi]);

  const triggerFlip = useCallback(() => {
    clearFlipTimer();
    const { flipped, setCardAnim, completeFlip } = useFlashcardStore.getState();
    setCardAnim(flipped ? 'card-flip-out-back' : 'card-flip-out-fwd');
    flipTimerRef.current = window.setTimeout(() => {
      flipTimerRef.current = null;
      completeFlip();
    }, 160);
  }, [clearFlipTimer]);

  const navCard = useCallback(
    (dir: number) => {
      if (!list.length) return;
      clearFlipTimer();
      useFlashcardStore
        .getState()
        .goToCard(
          deckKey,
          (safeIndex + dir + list.length) % list.length,
          dir > 0 ? 'card-slide-next' : 'card-slide-prev',
        );
    },
    [clearFlipTimer, deckKey, list.length, safeIndex],
  );

  const handleRate = useCallback(
    (newStatus: VocabStatus, ev?: EffectCoords) => {
      if (!word) return;
      clearFlipTimer();
      rateWord({ id: word.id, status: newStatus, ev });
      const staysInDeck =
        Boolean(lessonParam) ||
        activeFilter === 'all' ||
        activeFilter.startsWith('hsk') ||
        activeFilter === newStatus;
      const nextIdx =
        list.length <= 1
          ? 0
          : staysInDeck
            ? (safeIndex + 1) % list.length
            : safeIndex % (list.length - 1);
      useFlashcardStore.getState().goToCard(deckKey, nextIdx, 'card-slide-next');
    },
    [word, clearFlipTimer, rateWord, lessonParam, activeFilter, list.length, safeIndex, deckKey],
  );

  const speak = useCallback((text: string, rate: number) => {
    speakChinese(text, rate, (m) => useToastStore.getState().showToast(m, 'pink'));
  }, []);

  useKeyboardShortcuts(
    {
      Space: (e) => {
        e.preventDefault();
        triggerFlip();
      },
      ArrowLeft: () => navCard(-1),
      ArrowRight: () => navCard(1),
      '1': () => handleRate('review'),
      '2': () => handleRate('learning'),
      '3': () => handleRate('mastered'),
    },
    Boolean(word),
  );

  return {
    activeFilter,
    activeLessonTitle,
    word,
    safeIndex,
    totalCount: list.length,
    triggerFlip,
    navCard,
    handleRate,
    speak,
  };
}
