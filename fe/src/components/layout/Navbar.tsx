import { Disc3, Flame, Loader2, Sparkles } from 'lucide-react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useExamImporterStore } from '@/features/exams/stores/exam-importer.store';
import { useToggleTheme } from '@/features/profile/hooks/useProfile';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import { computeXpLevel } from '@/features/profile/utils/profile-stats';
import { preloadRoute } from '@/routes/lazyPages';
import { useToastStore } from '@/stores/toast.store';

const NAV_ITEMS = [
  { to: '/', num: '[01]', label: 'Trang chủ', end: true },
  { to: '/courses', num: '[02]', label: 'Khóa học', end: false },
  { to: '/flashcard', num: '[03]', label: 'Flashcard', end: false },
  { to: '/writing', num: '[04]', label: 'Luyện viết', end: false },
  { to: '/game', num: '[05]', label: 'Mini-Game', end: false },
  { to: '/vocab', num: '[06]', label: 'Kho từ', end: false },
  { to: '/notes', num: '[07]', label: 'MindNotes', end: false },
];

export const Navbar: React.FC = () => {
  const theme = useProfileStore((s) => s.profile.theme);
  const xp = useProfileStore((s) => s.profile.xp);
  const streak = useProfileStore((s) => s.profile.streak);
  const toggleTheme = useToggleTheme();
  const { pathname } = useLocation();
  const isUploading = useExamImporterStore((s) => s.busyStage !== 'idle');
  const [cdPlaying, setCdPlaying] = useState(false);

  const navRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [sliderStyle, setSliderStyle] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const activeNavIdx = NAV_ITEMS.findIndex((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );

  useLayoutEffect(() => {
    const updateSlider = () => {
      const idx = activeNavIdx >= 0 ? activeNavIdx : 0;
      const el = tabRefs.current[idx];
      if (!el) return;
      setSliderStyle({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    };
    updateSlider();
    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [activeNavIdx, theme]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const cdIntervalRef = useRef<number | null>(null);
  const notesIntervalRef = useRef<number | null>(null);
  const notesLayerRef = useRef<HTMLDivElement | null>(null);

  const { xpLevel: level } = computeXpLevel(xp);

  const playPentatonicNote = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    const freq = scale[Math.floor(Math.random() * scale.length)];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.55);
  };

  const spawnCdMusicNote = () => {
    const layer = notesLayerRef.current;
    if (!layer) return;
    const note = document.createElement('span');
    note.className = 'music-note';
    note.textContent = Math.random() > 0.5 ? '♪' : '♫';
    note.style.left = `${20 + Math.random() * 55}%`;
    note.style.top = '0px';
    note.style.setProperty('--nx', `${Math.round((Math.random() - 0.5) * 28)}px`);
    layer.appendChild(note);
    setTimeout(() => note.remove(), 1850);
  };

  const toggleCDPlayer = () => {
    const { showToast } = useToastStore.getState();
    if (cdPlaying) {
      setCdPlaying(false);
      if (cdIntervalRef.current) window.clearInterval(cdIntervalRef.current);
      if (notesIntervalRef.current) window.clearInterval(notesIntervalRef.current);
      showToast('Đã tạm dừng Đĩa CD Lo-fi');
    } else {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        setCdPlaying(true);
        playPentatonicNote();
        spawnCdMusicNote();
        cdIntervalRef.current = window.setInterval(playPentatonicNote, 1350);
        notesIntervalRef.current = window.setInterval(spawnCdMusicNote, 900);
        showToast('Đang phát Đĩa CD Ngũ Cung thư giãn ♪', 'yellow');
      } catch {
        showToast('Không thể khởi tạo âm thanh trên trình duyệt.', 'pink');
      }
    }
  };

  useEffect(() => {
    return () => {
      if (cdIntervalRef.current) window.clearInterval(cdIntervalRef.current);
      if (notesIntervalRef.current) window.clearInterval(notesIntervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 t-navbar">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <Link
            to="/"
            onClick={(e) => {
              if (isUploading) e.preventDefault();
            }}
            aria-disabled={isUploading}
            className={`flex items-center gap-1.5 text-left shrink-0 whitespace-nowrap transition ${
              isUploading ? 'opacity-55 cursor-not-allowed' : 'hover:opacity-85'
            }`}
          >
            <span className="font-serif italic font-bold text-base sm:text-lg tracking-tight">
              HSK <span className="not-italic">(QUEST)</span>{' '}
              <span className="text-xs font-mono opacity-80">3.0</span>
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] shrink-0">
            <span
              className="px-2 py-0.5 rounded bg-[#EFE078] text-[#111111] font-bold border border-[#111111] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              title="Chuỗi ngày điểm danh liên tiếp"
            >
              <Flame className="w-3 h-3 shrink-0" />
              <span>{streak}d</span>
            </span>
            <span
              className="px-2 py-0.5 rounded bg-[#F4C2D7] text-[#111111] font-bold border border-[#111111] whitespace-nowrap shrink-0"
              title="Cấp độ & Điểm kinh nghiệm"
            >
              LV.{level} • {xp} XP
            </span>
          </div>
        </div>

        <nav
          ref={navRef}
          aria-label="Điều hướng chính"
          className="relative hidden xl:flex items-center justify-center gap-1 2xl:gap-1.5 font-mono text-[11px] min-w-0 p-1 rounded-lg"
        >
          {sliderStyle.ready && (
            <span
              aria-hidden="true"
              className="nav-slider-pill pointer-events-none absolute top-1 bottom-1 left-0 z-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                width: `${sliderStyle.width}px`,
                transform: `translateX(${sliderStyle.left}px)`,
              }}
            />
          )}
          {NAV_ITEMS.map((item, idx) => (
            <NavLink
              key={item.to}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              to={item.to}
              end={item.end}
              aria-disabled={isUploading}
              title={isUploading ? 'Đang tải đề lên, tạm khóa chuyển trang...' : undefined}
              onClick={(e) => {
                if (isUploading) e.preventDefault();
              }}
              onMouseEnter={() => {
                if (!isUploading) preloadRoute(item.to);
              }}
              onFocus={() => {
                if (!isUploading) preloadRoute(item.to);
              }}
              className={({ isActive }) =>
                `nav-tab-btn relative z-10 px-2.5 py-1.5 border transition-colors duration-200 whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
                  isActive ? 'is-active' : ''
                } ${isUploading ? 'opacity-45 cursor-not-allowed' : ''}`
              }
            >
              <span className="hidden 2xl:inline opacity-75">{item.num}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {isUploading && (
            <span className="px-2 py-1 rounded bg-[#EFE078] text-[#111111] border border-[#111111] font-mono text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap">
              <Loader2 className="w-3 h-3 animate-spin" />
              Đang tải lên...
            </span>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="px-2.5 py-1.5 rounded border border-current/30 text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:scale-105 active:scale-95 transition"
            title="Đổi giao diện Editorial Zine / Pastel Diary"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{theme === 'zine' ? 'Zine' : 'Pastel'}</span>
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={toggleCDPlayer}
              className="px-2.5 py-1.5 rounded bg-[#EFE078] text-[#111111] border border-[#111111] text-[11px] font-mono font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:brightness-95 active:scale-95 transition"
              title="Bật/Tắt nhạc nền học tập Lo-fi Ngũ Cung"
            >
              <Disc3 className={`w-3.5 h-3.5 shrink-0 ${cdPlaying ? 'spin-cd' : ''}`} />
              <span className="hidden sm:inline">Đĩa CD</span>
            </button>
            <div ref={notesLayerRef} className="pointer-events-none absolute inset-0 overflow-visible" />
          </div>
        </div>
      </div>
    </header>
  );
};
