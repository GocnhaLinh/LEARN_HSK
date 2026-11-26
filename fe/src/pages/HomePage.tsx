import { Calendar, CheckCircle2, Clock, GraduationCap, Play, Sparkles, Target } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { COURSES_META } from '../data/defaults';
import { MissionsDone } from '../types';
import { getTodayISO } from '../utils/helpers';

const DAYS_VI = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
const SHORT_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKLY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'HN'];

function formatClock(now: Date) {
  const dateStr = `${DAYS_VI[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} THÁNG ${String(now.getMonth() + 1).padStart(2, '0')}, ${now.getFullYear()}`;
  const timeStr = now.toTimeString().slice(0, 8);
  return { dateStr, timeStr };
}

/** Isolated 1-second clock so HomePage never re-renders on every tick */
const LiveClockBadges: React.FC = React.memo(() => {
  const [clock, setClock] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <span className="px-2 sm:px-2.5 py-1 bg-[#111111] text-white font-semibold rounded-[4px] inline-flex items-center gap-1.5 whitespace-nowrap">
        <Calendar className="w-3.5 h-3.5 text-[#F4C2D7] shrink-0" />
        <span>{clock.dateStr}</span>
      </span>
      <span className="px-2 sm:px-2.5 py-1 bg-[#EFE078] text-[#111111] font-bold t-badge inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>{clock.timeStr}</span>
      </span>
    </>
  );
});
LiveClockBadges.displayName = 'LiveClockBadges';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    profile,
    vocab,
    apiConnected,
    performDailyCheckin,
    adjustDailyTarget,
    setFocusLevel,
    toggleMissionDone,
  } = useApp();

  const todayISO = getTodayISO();
  const checkedToday = profile.lastCheckinISO === todayISO;

  // Single O(N) pass over vocab instead of 12 separate .filter() passes
  const stats = useMemo(() => {
    const mastered: typeof vocab = [];
    const learning: typeof vocab = [];
    const review: typeof vocab = [];
    const fresh: typeof vocab = [];
    const fWords: typeof vocab = [];
    const fDone: typeof vocab = [];
    const primAll: typeof vocab = [];
    const primDone: typeof vocab = [];
    const interAll: typeof vocab = [];
    const interDone: typeof vocab = [];
    let customCount = 0;

    for (const w of vocab) {
      if (w.status === 'mastered') mastered.push(w);
      else if (w.status === 'learning') learning.push(w);
      else if (w.status === 'review') review.push(w);
      else fresh.push(w);

      if (w.level === profile.focusLevel) {
        fWords.push(w);
        if (w.status === 'mastered') fDone.push(w);
      }

      if (w.level <= 3) {
        primAll.push(w);
        if (w.status === 'mastered') primDone.push(w);
      } else {
        interAll.push(w);
        if (w.status === 'mastered') interDone.push(w);
      }

      if (w.custom) customCount++;
    }

    const fMeta = COURSES_META.find((c) => c.level === profile.focusLevel) || COURSES_META[4];
    const fPct = fWords.length ? Math.round((fDone.length / fWords.length) * 100) : 0;

    return {
      mastered,
      learning,
      review,
      fresh,
      fMeta,
      fWords,
      fDone,
      fPct,
      primAll,
      primDone,
      primPct: primAll.length ? Math.round((primDone.length / primAll.length) * 100) : 0,
      interAll,
      interDone,
      interPct: interAll.length ? Math.round((interDone.length / interAll.length) * 100) : 0,
      customCount,
    };
  }, [vocab, profile.focusLevel]);

  const streakDays = useMemo(() => {
    const today = new Date();
    const cells = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isToday = i === 0;
      const lit = isToday ? checkedToday : i <= Math.min(6, profile.streak - (checkedToday ? 1 : 0));
      cells.push({
        dayName: SHORT_DAYS[d.getDay()],
        dateText: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        lit,
      });
    }
    return cells;
  }, [checkedToday, profile.streak]);

  const xpLevel = Math.floor(profile.xp / 200) + 1;
  const inLevelXp = profile.xp % 200;
  const xpPct = Math.round((inLevelXp / 200) * 100);
  const dtPct = Math.min(100, Math.round((profile.todayReviews / profile.dailyTarget) * 100));
  const maxWeeklyVal = Math.max(15, ...profile.weeklyLog);

  const writeSample = stats.fWords.slice(0, 5);
  const missions: Array<{
    key: keyof MissionsDone;
    badge: string;
    badgeBg: string;
    title: string;
    desc: string;
    chips: string[];
    btnText: string;
    onAction: () => void;
  }> = [
    {
      key: 'm1',
      badge: 'ƯU TIÊN • HÔM NAY',
      badgeBg: 'bg-[#F4C2D7]',
      title: `Ôn tập nhóm từ "Cần chú ý" (${stats.review.length} từ)`,
      desc: 'Lật thẻ Digicam và nghe phát âm chậm để khắc phục các từ hay quên.',
      chips: stats.review.slice(0, 5).map((w) => w.hanzi),
      btnText: 'Bắt đầu ôn →',
      onAction: () => navigate('/flashcard/review'),
    },
    {
      key: 'm2',
      badge: 'KHÓA HỌC • PDF 1300 TỪ',
      badgeBg: 'bg-[#EFE078]',
      title: `Học khóa HSK ${profile.focusLevel} & tải giáo trình PDF/DOCX`,
      desc: 'Khám phá bài học Sơ cấp 1–3, Trung cấp 4–6 hoặc tải file bảng từ vựng để chia bài tự động.',
      chips: ['HSK 4', 'HSK 5 ★', 'HSK 6'],
      btnText: `Vào khóa HSK ${profile.focusLevel} →`,
      onAction: () => navigate(`/courses/${profile.focusLevel}`),
    },
    {
      key: 'm3',
      badge: 'LUYỆN NÉT • 米字格',
      badgeBg: 'bg-[#CBEAD8]',
      title: `Viết tay 5 chữ Hán trên lưới 米字格 (${Math.min(5, profile.writtenCountToday)}/5)`,
      desc: 'Đồ nét chuẩn thứ tự bút thuận bằng HanziWriter hoặc vẽ tự do vào sổ tay.',
      chips: writeSample.map((w) => Array.from(w.hanzi)[0]),
      btnText: 'Mở bảng viết →',
      onAction: () => navigate('/writing/hanzi'),
    },
    {
      key: 'm4',
      badge: 'MINI-GAME • +XP',
      badgeBg: 'bg-[#DCD2F5]',
      title: `Củng cố ${stats.learning.length} từ đang học qua Mini-Game`,
      desc: 'Chơi trắc nghiệm nhanh, nghe chọn chữ hoặc ghép cặp thẻ để tăng phản xạ.',
      chips: ['Trắc nghiệm', 'Nghe chọn', 'Ghép cặp'],
      btnText: 'Vào đấu trường →',
      onAction: () => navigate('/game/quiz'),
    },
  ];

  const missionsDoneCount = Object.values(profile.missionsDone).filter(Boolean).length;

  return (
    <section className="space-y-7">
      {/* Metadata Strip & Daily Check-in */}
      <div className="t-card-flat px-3.5 sm:px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
        <div className="flex items-center justify-between lg:justify-start gap-2 font-mono text-[10px] sm:text-xs min-w-0">
          <LiveClockBadges />
          <span className="hidden lg:inline-block px-2.5 py-1 bg-[#F4C2D7] text-[#111111] font-bold t-badge whitespace-nowrap shrink-0">
            ISSUE #3.0 ✨
          </span>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-2">
          <span className="lg:hidden px-2.5 py-1 bg-[#F4C2D7] text-[#111111] font-mono text-[10px] sm:text-xs font-bold t-badge whitespace-nowrap shrink-0">
            ISSUE #3.0 ✨
          </span>
          <button
            type="button"
            onClick={(e) => performDailyCheckin({ clientX: e.clientX, clientY: e.clientY })}
            className={`t-btn px-2.5 sm:px-3.5 py-1.5 text-[#111111] text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:bg-[#EFE078] ${
              checkedToday ? 'bg-[#CBEAD8]' : 'bg-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{checkedToday ? 'Đã điểm danh hôm nay ✓' : 'Điểm danh hôm nay (+15 XP)'}</span>
          </button>
        </div>
      </div>

      {/* 7-Day Streak Check-in Strip */}
      <div className="t-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-[#EFE078] text-[#111111] t-badge whitespace-nowrap shrink-0">
              DAILY STREAK CHECK-IN
            </span>
            <span className="text-sm sm:text-base font-bold">
              Tuyệt vời! Bạn đang giữ chuỗi {profile.streak} ngày Streak!
            </span>
          </div>
          <span className="font-mono text-[11px] opacity-70">LỊCH ĐIỂM DANH 7 NGÀY GẦN NHẤT</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {streakDays.map((cell) => (
            <div
              key={cell.dateText}
              className={`p-2 rounded-xl border-[1.5px] border-[#141414] flex flex-col items-center justify-center gap-0.5 font-mono text-[10px] ${
                cell.lit ? 'bg-[#EFE078] text-[#111111] font-bold' : 'bg-[#F8F6F1] opacity-75'
              }`}
            >
              <span>{cell.dayName}</span>
              <span className="text-sm leading-none">{cell.lit ? '🔥' : '○'}</span>
              <span>{cell.dateText}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editorial Hero: 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Hero Card */}
        <div className="lg:col-span-7 t-card p-5 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between sm:justify-start flex-nowrap gap-2 sm:gap-3 mb-3">
              <h1 className="font-serif font-extrabold text-[26px] sm:text-5xl tracking-tight leading-none whitespace-nowrap">
                HSK <span className="font-normal">(QUEST)</span>
              </h1>
              <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#F4C2D7] text-[#111111] border-2 border-[#141414] inline-flex flex-col items-center leading-tight shrink-0">
                <span className="font-serifcn text-sm sm:text-xl font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                  〔 汉 · 语 〕
                </span>
                <span className="font-mono text-[8px] sm:text-[10px] font-bold whitespace-nowrap">
                  CHUẨN 3.0 • 1–6
                </span>
              </div>
            </div>

            <p className="font-serif italic text-xl sm:text-2xl tracking-wide opacity-90 mb-4">
              PERSONAL MANDARIN ZINE
            </p>

            <p className="text-sm sm:text-[15px] leading-relaxed opacity-80 max-w-xl">
              Không gian tự học tiếng Trung chuẩn <strong>HSK 3.0 (Sơ cấp 1–3 &amp; Trung cấp 4–6)</strong> siêu dễ
              thương: học theo từng khóa học bài bản, tải giáo trình bảng 6 cột <strong>.PDF / .DOCX</strong> để tự
              động chia bài, lật thẻ Digicam &amp; luyện viết trên lưới 米字格.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 mt-6 sm:mt-7 pt-5 border-t border-dashed border-current/25">
            <button
              type="button"
              onClick={() => navigate(`/courses/${profile.focusLevel}`)}
              className="t-btn-black px-2.5 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-mono font-bold tracking-wide flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
            >
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>
                VÀO KHÓA HSK {profile.focusLevel}
                <span className="hidden sm:inline"> NGAY</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/flashcard/hsk${profile.focusLevel}`)}
              className="t-btn px-2.5 sm:px-5 py-2.5 sm:py-3 bg-[#EFE078] text-[#111111] text-[11px] sm:text-sm font-mono font-bold tracking-wide flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap hover:brightness-95"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0" />
              <span>
                HỌC FLASHCARD<span className="hidden sm:inline"> NGAY</span>
              </span>
            </button>
          </div>
        </div>

        {/* Right Hero Card: Interactive HSK 1-6 Focus Selector + Stamp */}
        <div className="lg:col-span-5 t-card p-6 flex flex-col justify-between relative">
          <div className="hidden sm:flex flex-col items-center justify-center w-20 h-20 rounded-full bg-[#EFE078] text-[#111111] stamp-sticker absolute -top-4 -right-3 rotate-12 select-none z-10">
            <span className="font-mono text-[9px] font-extrabold tracking-tight">HSK 3.0</span>
            <span className="font-mono text-[10px] font-extrabold">CẤP {profile.focusLevel}</span>
            <Sparkles className="w-3.5 h-3.5 mt-0.5" />
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider opacity-65">
              CURRENT LEVEL // CẤP ĐỘ ĐANG THEO ĐUỔI
            </p>
            <h2 className="font-serif font-bold text-2xl mt-1">
              {stats.fMeta.emoji} {stats.fMeta.title}
            </h2>
            <p className="text-xs opacity-75 mt-1 leading-relaxed">{stats.fMeta.subtitle}</p>

            {/* HSK 1 to 6 Quick Switcher */}
            <div className="grid grid-cols-6 gap-1.5 mt-3.5 font-mono text-[11px] font-bold">
              {[1, 2, 3, 4, 5, 6].map((lv) => {
                const active = lv === profile.focusLevel;
                return (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setFocusLevel(lv)}
                    className={`t-btn py-1.5 ${
                      active
                        ? 'bg-[#111111] text-[#EFE078]'
                        : 'bg-white text-[#111111] hover:bg-[#EFE078]'
                    }`}
                  >
                    H{lv}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 mt-5 pt-4 border-t border-dashed border-current/25">
            {/* Active Focus Level Bar */}
            <div>
              <div className="flex justify-between font-mono text-[11px] font-bold mb-1">
                <span>
                  Tiến độ HSK {profile.focusLevel} ({stats.fPct}%)
                </span>
                <span>
                  {stats.fDone.length} / {stats.fWords.length} từ đã thuộc
                </span>
              </div>
              <div className="h-3 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
                <div
                  className="h-full shimmer-bar transition-all duration-500"
                  style={{ width: `${stats.fPct}%`, backgroundColor: stats.fMeta.color }}
                />
              </div>
            </div>

            {/* Primary vs Intermediate Summary */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <div className="flex justify-between font-mono text-[10px] font-semibold mb-1">
                  <span>Sơ cấp (1–3)</span>
                  <span>
                    {stats.primDone.length}/{stats.primAll.length}
                  </span>
                </div>
                <div className="h-2 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EFE078] shimmer-bar transition-all duration-500"
                    style={{ width: `${stats.primPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-mono text-[10px] font-semibold mb-1">
                  <span>Trung cấp (4–6)</span>
                  <span>
                    {stats.interDone.length}/{stats.interAll.length}
                  </span>
                </div>
                <div className="h-2 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#CBEAD8] shimmer-bar transition-all duration-500"
                    style={{ width: `${stats.interPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1.5 font-mono text-[10px] sm:text-[11px]">
              <span className="whitespace-nowrap truncate">
                <span className="hidden sm:inline">Từ tải từ file / cá nhân</span>
                <span className="sm:hidden">Từ file / cá nhân</span>:{' '}
                <strong>{stats.customCount}</strong> từ
              </span>
              <span className="px-2 py-0.5 bg-[#EFE078] text-[#111111] font-bold t-badge text-[10px] whitespace-nowrap shrink-0">
                加油 • CỐ LÊN!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BLACK EDITORIAL BANNER 1: MY PROGRESS */}
      <div className="space-y-5">
        <div className="t-banner px-5 py-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="font-mono text-[11px] px-2 py-0.5 bg-white/15 rounded text-[#EFE078]">
              [01] KEEP-TRACK SYSTEM
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl tracking-tight mt-1">
              MY PROGRESS
            </h2>
          </div>
          <p className="font-mono text-xs opacity-75">
            {apiConnected
              ? 'Đã kết nối NestJS API • Đồng bộ trực tiếp với MongoDB'
              : 'Tự động lưu cục bộ • Sẵn sàng đồng bộ khi kết nối NestJS + MongoDB'}
          </p>
        </div>

        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="t-card t-card-hover p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold">ĐÃ THUỘC</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#111111] text-white rounded-[4px]">
                MASTERED
              </span>
            </div>
            <div className="font-serif font-extrabold text-4xl sm:text-5xl mt-3">
              {stats.mastered.length}
            </div>
            <p className="text-xs opacity-70 mt-1">Ghi nhớ vững vàng</p>
          </div>

          <div className="t-card t-card-hover p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold">ĐANG HỌC</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#EFE078] text-[#111111] t-badge">
                LEARNING
              </span>
            </div>
            <div className="font-serif font-extrabold text-4xl sm:text-5xl mt-3">
              {stats.learning.length}
            </div>
            <p className="text-xs opacity-70 mt-1">Đang trong lộ trình ôn</p>
          </div>

          <div className="t-card t-card-hover p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold">CẦN CHÚ Ý</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F4C2D7] text-[#111111] t-badge">
                REVIEW!
              </span>
            </div>
            <div className="font-serif font-extrabold text-4xl sm:text-5xl mt-3">
              {stats.review.length}
            </div>
            <p className="text-xs opacity-70 mt-1">Ưu tiên ôn tập ngay</p>
          </div>

          <div className="t-card t-card-hover p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold">TỪ MỚI</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#EFECE4] text-[#111111] t-badge">
                NEW
              </span>
            </div>
            <div className="font-serif font-extrabold text-4xl sm:text-5xl mt-3">
              {stats.fresh.length}
            </div>
            <p className="text-xs opacity-70 mt-1">Chưa mở khóa</p>
          </div>
        </div>

        {/* Daily Target + 7-Day Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          <div className="lg:col-span-6 t-card p-5 flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] uppercase opacity-65">
                    DAILY TARGET // MỤC TIÊU HÔM NAY
                  </p>
                  <p className="font-mono text-xl sm:text-2xl font-bold mt-1">
                    <span>{profile.todayReviews}</span> / <span>{profile.dailyTarget}</span> lượt ôn từ
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustDailyTarget(-5)}
                    className="t-btn w-9 h-8 bg-white text-[#111111] font-mono text-xs font-bold hover:bg-[#F4C2D7]"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustDailyTarget(5)}
                    className="t-btn w-9 h-8 bg-white text-[#111111] font-mono text-xs font-bold hover:bg-[#EFE078]"
                  >
                    +5
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-3 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#111111] shimmer-bar transition-all duration-500"
                    style={{ width: `${dtPct}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[11px] mt-1.5 opacity-75">
                  <span>Tiến độ ngày</span>
                  <span>{dtPct}%</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-current/25">
              <div className="flex items-center justify-between font-mono text-xs font-bold mb-1.5">
                <span>
                  Level {xpLevel} ({inLevelXp} / 200 XP)
                </span>
                <span className="px-2 py-0.5 bg-[#F4C2D7] text-[#111111] t-badge text-[10px]">
                  XP SYSTEM
                </span>
              </div>
              <div className="h-2.5 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F4C2D7] shimmer-bar transition-all duration-500"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 t-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs font-bold uppercase tracking-wide">
                NHẬT KÝ LƯỢT ÔN 7 NGÀY GẦN NHẤT
              </p>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#EFE078] text-[#111111] t-badge font-bold">
                7D LOG
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4">
              {profile.weeklyLog.map((val, idx) => {
                const hPct = Math.max(8, Math.round((val / maxWeeklyVal) * 100));
                const isToday = idx === 6;
                return (
                  <div
                    key={WEEKLY_LABELS[idx]}
                    className="flex flex-col items-center justify-end h-full gap-1 font-mono text-[10px]"
                  >
                    <span className="font-bold">{val}</span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t border-[1.5px] border-[#141414] transition-all duration-500 ${
                          isToday ? 'bg-[#F4C2D7]' : 'bg-[#EFE078]'
                        }`}
                        style={{ height: `${hPct}%` }}
                      />
                    </div>
                    <span className={isToday ? 'font-extrabold underline' : 'opacity-70'}>
                      {WEEKLY_LABELS[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BLACK EDITORIAL BANNER 2: UPCOMING MISSIONS */}
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
            const done = !!profile.missionsDone[m.key];
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
                        onChange={() => toggleMissionDone(m.key)}
                        className="w-3.5 h-3.5 accent-[#111111]"
                      />
                      <span>Đánh dấu xong</span>
                    </label>
                  </div>
                  <h3 className={`font-serif font-bold text-lg sm:text-xl ${done ? 'line-through' : ''}`}>
                    {m.title}
                  </h3>
                  <p className="text-xs sm:text-sm opacity-75 mt-1">{m.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {m.chips.length ? (
                      m.chips.map((c) => (
                        <span
                          key={c}
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
                    onClick={m.onAction}
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
    </section>
  );
};
