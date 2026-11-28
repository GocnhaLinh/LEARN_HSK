import { Volume2 } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui';
import { choiceBgClass, useGameStore } from '@/features/game/stores/game.store';
import type { EffectCoords } from '@/lib/fx-utils';

export const ListenArena: React.FC<{
  onAnswer: (id: string, coords: EffectCoords) => void;
  onSpeak: () => void;
}> = ({ onAnswer, onSpeak }) => {
  const target = useGameStore((s) => s.target);
  const choices = useGameStore((s) => s.choices);
  const pickedResult = useGameStore((s) => s.pickedResult);
  if (!target) return null;

  return (
    <div className="max-w-xl mx-auto text-center space-y-4">
      <Badge variant="pink" className="text-xs">NGHE &amp; CHỌN CHỮ</Badge>
      <div className="py-1.5 flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={onSpeak}
          aria-label="Nghe phát âm tiếng Trung"
          className="t-btn-black w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 transition"
        >
          <Volume2 className="w-7 h-7" />
        </button>
        <p className="font-mono text-xs opacity-70">
          Bấm vào loa để nghe phát âm tiếng Trung (ZH-CN)
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={(e) => onAnswer(c.id, { clientX: e.clientX, clientY: e.clientY })}
            className={`t-btn p-3.5 sm:p-4 text-[#111111] flex flex-col items-center justify-center text-center ${choiceBgClass(c.id, target.id, pickedResult, 'bg-white hover:bg-[#EFE078]')}`}
          >
            <div className="font-serifcn text-3xl sm:text-4xl font-bold">{c.hanzi}</div>
            <div className="text-xs opacity-65 mt-1">{c.meaning}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
