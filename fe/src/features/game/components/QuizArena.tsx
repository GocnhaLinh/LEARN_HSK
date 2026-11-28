import React from 'react';
import { Badge } from '@/components/ui';
import { choiceBgClass, useGameStore } from '@/features/game/stores/game.store';
import type { EffectCoords } from '@/lib/fx-utils';

export const QuizArena: React.FC<{ onAnswer: (id: string, coords: EffectCoords) => void }> = ({
  onAnswer,
}) => {
  const target = useGameStore((s) => s.target);
  const choices = useGameStore((s) => s.choices);
  const pickedResult = useGameStore((s) => s.pickedResult);
  if (!target) return null;

  return (
    <div className="max-w-xl mx-auto text-center space-y-4">
      <Badge variant="yellow" className="text-xs">TRẮC NGHIỆM NHANH</Badge>
      <div className="py-2">
        <div className="font-serifcn text-5xl sm:text-6xl font-bold">{target.hanzi}</div>
        <p className="font-mono text-xs opacity-65 mt-1.5">
          Chọn đúng nghĩa tiếng Việt &amp; Pinyin tương ứng
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={(e) => onAnswer(c.id, { clientX: e.clientX, clientY: e.clientY })}
            className={`t-btn p-3.5 px-5 text-[#111111] flex flex-col items-center justify-center text-center ${choiceBgClass(c.id, target.id, pickedResult, 'bg-white hover:bg-[#F8F6F1]')}`}
          >
            <div className="font-bold text-sm sm:text-base">{c.meaning}</div>
            <div className="font-mono text-xs opacity-65 mt-0.5">{c.pinyin}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
