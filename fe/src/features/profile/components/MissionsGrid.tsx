import { Target } from 'lucide-react';
import React, { useMemo } from 'react';
import type { HomeMissionItem, HomeStats } from '@/features/profile/types';
import type { MissionsDone } from '@/types';

interface MissionsGridProps {
  focusLevel: number;
  writtenCountToday: number;
  missionsDone: MissionsDone;
  stats: HomeStats;
  onToggleMission: (key: keyof MissionsDone) => void;
  onNavigate: (to: string) => void;
}

export const MissionsGrid: React.FC<MissionsGridProps> = React.memo(
  ({ focusLevel, writtenCountToday, missionsDone, stats, onToggleMission, onNavigate }) => {
    const missions = useMemo<HomeMissionItem[]>(
      () => [
        {
          key: 'm1',
          badge: 'ƯU TIÊN • HÔM NAY',
          badgeBg: 'bg-[#F4C2D7]',
          title: `Ôn tập nhóm từ "Cần chú ý" (${stats.reviewCount} từ)`,
          desc: 'Lật thẻ Digicam và nghe phát âm chậm để khắc phục các từ hay quên.',
          chips: stats.reviewChips,
          btnText: 'Bắt đầu ôn →',
          route: '/flashcard/review',
        },
        {
          key: 'm2',
          badge: 'KHÓA HỌC • PDF 1300 TỪ',
          badgeBg: 'bg-[#EFE078]',
          title: `Học khóa HSK ${focusLevel} & tải giáo trình PDF/DOCX`,
          desc: 'Khám phá bài học Sơ cấp 1–3, Trung cấp 4–6 hoặc tải file bảng từ vựng để chia bài tự động.',
          chips: ['HSK 4', 'HSK 5 ★', 'HSK 6'],
          btnText: `Vào khóa HSK ${focusLevel} →`,
          route: `/courses/${focusLevel}`,
        },
        {
          key: 'm3',
          badge: 'LUYỆN NÉT • 米字格',
          badgeBg: 'bg-[#CBEAD8]',
          title: `Viết tay 5 chữ Hán trên lưới 米字格 (${Math.min(5, writtenCountToday)}/5)`,
          desc: 'Đồ nét chuẩn thứ tự bút thuận bằng HanziWriter hoặc vẽ tự do vào sổ tay.',
          chips: stats.writeSampleChars,
          btnText: 'Mở bảng viết →',
          route: '/writing/hanzi',
        },
        {
          key: 'm4',
          badge: 'MINI-GAME • +XP',
          badgeBg: 'bg-[#DCD2F5]',
          title: `Củng cố ${stats.learningCount} từ đang học qua Mini-Game`,
          desc: 'Chơi trắc nghiệm nhanh, nghe chọn chữ hoặc ghép cặp thẻ để tăng phản xạ.',
          chips: ['Trắc nghiệm', 'Nghe chọn', 'Ghép cặp'],
          btnText: 'Vào đấu trường →',
          route: '/game/quiz',
        },
      ],
      [
        focusLevel,
        writtenCountToday,
        stats.learningCount,
        stats.reviewChips,
        stats.reviewCount,
        stats.writeSampleChars,
      ],
    );

    const missionsDoneCount = missions.filter((m) => missionsDone[m.key]).length;

    return (
      <div className="space-y-5 pt-2">
        <div className="t-banner px-5 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-white/15 rounded text-[#F4C2D7]">
              UPCOMING REVIEW QUEUE &amp; DAILY TASKS
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl tracking-tight mt-1">
              UPCOMING MISSIONS
            </h2>
            <p className="text-xs sm:text-sm opacity-80 mt-1">
              Nhiệm vụ ôn tập sắp tới của bạn — tự động cập nhật theo trạng thái từ vựng thực tế.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded bg-[#F4C2D7] text-[#111111] font-mono text-xs font-bold">
              <Target className="w-3.5 h-3.5" />
              <span>{missionsDoneCount} / 4 nhiệm vụ hoàn thành</span>
            </div>
          </div>

          <div className="text-left md:text-right shrink-0">
            <p className="font-serif italic text-xl sm:text-2xl leading-tight">
              Less perfect.
              <br />
              More fluency.
            </p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full border border-white/40 font-serifcn text-xs tracking-widest">
              〔 温 · 故 〕 ÔN TẬP ĐỊNH KỲ
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {missions.map((m) => {
            const done = !!missionsDone[m.key];
            return (
              <div
                key={m.key}
                className={`t-card t-card-hover p-5 flex flex-col justify-between gap-4 ${
                  done ? 'opacity-75' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] font-bold text-[#111111] t-badge ${m.badgeBg}`}
                    >
                      {m.badge}
                    </span>
                    <label className="inline-flex items-center gap-1.5 font-mono text-[11px] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => onToggleMission(m.key)}
                        className="w-3.5 h-3.5 accent-[#111111]"
                      />
                      <span>Đánh dấu xong</span>
                    </label>
                  </div>
                  <h3
                    className={`font-serif font-bold text-lg sm:text-xl ${done ? 'line-through' : ''}`}
                  >
                    {m.title}
                  </h3>
                  <p className="text-xs sm:text-sm opacity-75 mt-1">{m.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {m.chips.length ? (
                      m.chips.map((c, chipIdx) => (
                        <span
                          key={`${c}-${chipIdx}`}
                          className="px-2 py-0.5 bg-[#F8F6F1] border border-[#141414] rounded-[4px] font-serifcn text-sm font-semibold text-[#141414]"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="font-mono text-xs opacity-60">
                        Tuyệt vời! Không còn từ tồn đọng.
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-dashed border-current/20">
                  <button
                    type="button"
                    onClick={() => onNavigate(m.route)}
                    className="t-btn-black px-4 py-2 font-mono text-xs font-bold"
                  >
                    {m.btnText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

MissionsGrid.displayName = 'MissionsGrid';
