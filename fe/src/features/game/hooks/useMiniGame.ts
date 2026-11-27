import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useGameStore } from '@/features/game/stores/game.store';
import type { GameMode } from '@/features/game/types';
import { profileApi } from '@/features/profile/api/profile.api';
import { type EffectCoords, spawnConfetti, spawnFloatingXP } from '@/lib/fx-utils';
import { speakChinese } from '@/lib/speech-utils';
import { useToastStore } from '@/stores/toast.store';

export function useRecordGameReward() {
  const { syncProfile } = useApp();
  return useMutation({
    mutationFn: ({ xp }: { xp: number; label: string; coords?: EffectCoords }) =>
      profileApi.recordReview(xp, true),
    onMutate: ({ xp, label, coords }) => {
      syncProfile((prev) => {
        const nextReviews = prev.todayReviews + 1;
        const nextWeekly = [...prev.weeklyLog];
        nextWeekly[6] = nextReviews;
        return {
          ...prev,
          xp: prev.xp + xp,
          todayReviews: nextReviews,
          weeklyLog: nextWeekly,
          missionsDone: { ...prev.missionsDone, m1: nextReviews >= 5 || prev.missionsDone.m1, m4: true },
        };
      });
      spawnFloatingXP(xp, coords);
      if (xp >= 15) spawnConfetti(coords, 12);
      useToastStore.getState().showToast(`${label} (+${xp} XP)`, 'yellow');
    },
    onSuccess: (profile) => profile && syncProfile(profile),
    onError: () => {},
  });
}

export function useMiniGame(gameMode: GameMode) {
  const { vocab } = useApp();
  const levelFilter = useGameStore((s) => s.levelFilter);
  const { mutate: reward } = useRecordGameReward();
  const timers = useRef<{ round?: number; speak?: number }>({});

  const clearTimers = useCallback(() => {
    window.clearTimeout(timers.current.round);
    window.clearTimeout(timers.current.speak);
    timers.current = {};
  }, []);

  const startRound = useCallback(() => {
    clearTimers();
    const chosen = useGameStore.getState().startNewRound(gameMode, vocab);
    if (gameMode === 'listen' && chosen) {
      timers.current.speak = window.setTimeout(() => speakChinese(chosen.hanzi, 0.88), 250);
    }
  }, [clearTimers, gameMode, vocab]);

  useEffect(() => {
    startRound();
    return clearTimers;
  }, [startRound, levelFilter, clearTimers]);

  const scheduleNext = useCallback(
    (ms: number) => {
      window.clearTimeout(timers.current.round);
      timers.current.round = window.setTimeout(startRound, ms);
    },
    [startRound],
  );

  const handleAnswerQuiz = useCallback(
    (id: string, coords?: EffectCoords) => {
      const res = useGameStore.getState().answerQuiz(id);
      if (!res) return;
      if (res.correct) {
        reward({ xp: 15, label: `Chính xác! Combo ${res.combo}x`, coords });
      } else {
        useToastStore
          .getState()
          .showToast(`Chưa đúng! Đáp án: ${res.target.hanzi} (${res.target.meaning})`, 'pink');
      }
      scheduleNext(850);
    },
    [reward, scheduleNext],
  );

  const handleSelectMatch = useCallback(
    (side: 'left' | 'right', id: string, coords?: EffectCoords) => {
      const res = useGameStore.getState().selectMatchSide(side, id);
      if (res === 'pending') return;
      if (res === 'mismatch') {
        useToastStore.getState().showToast('Cặp thẻ chưa khớp, thử lại nhé!', 'pink');
        return;
      }
      if (res.word) speakChinese(res.word.hanzi, 0.95);
      if (res.completed) {
        reward({ xp: 25, label: 'Hoàn thành bảng ghép cặp thẻ!', coords });
        scheduleNext(900);
      }
    },
    [reward, scheduleNext],
  );

  const handleSpeakTarget = useCallback(() => {
    const target = useGameStore.getState().target;
    if (target) {
      speakChinese(target.hanzi, 0.88, (msg) => useToastStore.getState().showToast(msg, 'pink'));
    }
  }, []);

  return { hasEnoughVocab: vocab.length >= 4, startRound, handleAnswerQuiz, handleSelectMatch, handleSpeakTarget };
}
