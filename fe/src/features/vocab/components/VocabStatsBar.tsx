import React from 'react';
import { Card, ProgressBar } from '@/components/ui';
import { VOCAB_STATUS_LABELS } from '@/data/defaults';
import type { VocabStatusStats } from '@/features/vocab/types';

interface VocabStatsBarProps {
  stats: VocabStatusStats;
  statusFilter: string;
  onSelectStatus: (status: string) => void;
}

const STAT_CONFIG: ReadonlyArray<{
  key: 'all' | 'mastered' | 'learning' | 'review' | 'new';
  label: string;
  statKey: keyof VocabStatusStats;
  bg: string;
}> = [
  { key: 'all', label: 'Tất cả', statKey: 'total', bg: 'bg-white' },
  { key: 'mastered', label: VOCAB_STATUS_LABELS.mastered, statKey: 'mastered', bg: 'bg-[#CBEAD8]' },
  { key: 'learning', label: VOCAB_STATUS_LABELS.learning, statKey: 'learning', bg: 'bg-[#EFE078]' },
  { key: 'review', label: VOCAB_STATUS_LABELS.review, statKey: 'review', bg: 'bg-[#F4C2D7]' },
  { key: 'new', label: VOCAB_STATUS_LABELS.new, statKey: 'new', bg: 'bg-[#F8F6F1]' },
];

export const VocabStatsBar: React.FC<VocabStatsBarProps> = React.memo(
  ({ stats, statusFilter, onSelectStatus }) => (
    <Card variant="flat" padding="none" className="p-3.5 sm:p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
        {STAT_CONFIG.map((st) => {
          const active = statusFilter === st.key;
          return (
            <button
              key={st.key}
              type="button"
              onClick={() => onSelectStatus(st.key)}
              className={`px-3 py-2 rounded-xl border-[1.5px] transition flex items-center justify-between gap-2 ${
                active
                  ? 'bg-[#111111] text-white border-[#111111] shadow-[2px_2px_0px_#EFE078]'
                  : `${st.bg} text-[#111111] border-[#141414]/35 hover:border-[#141414]`
              }`}
            >
              <span className="font-bold text-[11px] truncate">{st.label}</span>
              <span
                className={`font-serif font-extrabold text-base leading-none ${
                  active ? 'text-[#EFE078]' : 'text-[#111111]'
                }`}
              >
                {stats[st.statKey]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <ProgressBar
          percent={stats.masteredPct}
          trackClassName="flex-1 border-[#141414]/60"
        />
        <span className="font-mono text-[11px] font-bold opacity-75 whitespace-nowrap">
          Đã thuộc {stats.masteredPct}% ({stats.mastered}/{stats.total})
        </span>
      </div>
    </Card>
  ),
);

VocabStatsBar.displayName = 'VocabStatsBar';
