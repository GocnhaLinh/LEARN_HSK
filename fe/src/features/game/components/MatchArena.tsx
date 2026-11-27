import React, { useMemo } from 'react';
import { Badge, Button } from '@/components/ui';
import { useGameStore } from '@/features/game/stores/game.store';
import type { EffectCoords } from '@/lib/fx-utils';

export const MatchArena: React.FC<{
  onSelectSide: (side: 'left' | 'right', id: string, coords: EffectCoords) => void;
  onShuffle: () => void;
}> = ({ onSelectSide, onShuffle }) => {
  const matchPairs = useGameStore((s) => s.matchPairs);
  const solvedIds = useGameStore((s) => s.solvedIds);
  const selLeft = useGameStore((s) => s.selLeft);
  const selRight = useGameStore((s) => s.selRight);

  const rightList = useMemo(
    () => [...matchPairs].sort((a, b) => a.meaning.localeCompare(b.meaning)),
    [matchPairs],
  );

  const columns = [
    { side: 'left' as const, items: matchPairs, selectedId: selLeft, textClass: 'font-serifcn text-2xl font-bold', hoverClass: 'hover:bg-[#EFE078]' },
    { side: 'right' as const, items: rightList, selectedId: selRight, textClass: 'text-sm font-semibold', hoverClass: 'hover:bg-[#F4C2D7]' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="lavender" className="text-xs">GHÉP CẶP 5 THẺ (+25 XP)</Badge>
        <Button variant="default" size="xs" onClick={onShuffle}>Đổi bộ thẻ</Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {columns.map(({ side, items, selectedId, textClass, hoverClass }) => (
          <div key={side} className="space-y-2.5">
            {items.map((w) => {
              const solved = solvedIds.includes(w.id);
              const tone = solved
                ? 'bg-[#CBEAD8] text-[#111111] opacity-50 line-through'
                : selectedId === w.id
                  ? 'bg-[#111111] text-white'
                  : `bg-white text-[#111111] ${hoverClass}`;
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={solved}
                  onClick={(e) => onSelectSide(side, w.id, { clientX: e.clientX, clientY: e.clientY })}
                  className={`t-btn w-full py-3.5 px-3 flex items-center justify-center text-center ${textClass} ${tone}`}
                >
                  {side === 'left' ? w.hanzi : w.meaning}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
