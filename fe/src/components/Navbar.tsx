import { Disc3, Flame, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { to: '/', label: '[01] Trang chủ', end: true },
  { to: '/courses', label: '[02] Khóa học', end: false },
  { to: '/flashcard', label: '[03] Flashcard', end: false },
  { to: '/writing', label: '[04] Luyện viết', end: false },
  { to: '/game', label: '[05] Mini-Game', end: false },
  { to: '/vocab', label: '[06] Kho từ', end: false },
  { to: '/notes', label: '[07] MindNotes', end: false },
];

export const Navbar: React.FC = () => {
  const { profile, toggleTheme, showToast } = useApp();
  const [cdPlaying, setCdPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const cdIntervalRef = useRef<number | null>(null);
  const notesIntervalRef = useRef<number | null>(null);
  const notesLayerRef = useRef<HTMLDivElement | null>(null);

  const level = Math.floor(profile.xp / 200) + 1;

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
    if (cdPlaying) {
      setCdPlaying(false);
      if (cdIntervalRef.current) window.clearInterval(cdIntervalRef.current);
      if (notesIntervalRef.current) window.clearInterval(notesIntervalRef.current);
      showToast('Đã tạm dừng Đĩa CD Lo-fi');
    } else {
      try {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 t-navbar">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 h-16 flex items-center justify-between gap-2">
        {/* Left: Brand + Live LV/XP + Streak */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-left shrink-0 hover:opacity-85 transition"
          >
            <span className="font-serif italic font-bold text-base sm:text-lg tracking-tight">
              HSK <span className="not-italic">(QUEST)</span>{' '}
              <span className="text-xs font-mono opacity-80">3.0</span>
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px]">
            <span
              className="px-2 py-0.5 rounded bg-[#EFE078] text-[#111111] font-bold border border-[#111111] flex items-center gap-1"
              title="Chuỗi ngày điểm danh liên tiếp"
            >
              <Flame className="w-3 h-3" />
              <span>{profile.streak}d</span>
            </span>
            <span
              className="px-2 py-0.5 rounded bg-[#F4C2D7] text-[#111111] font-bold border border-[#111111]"
              title="Cấp độ & Điểm kinh nghiệm"
            >
              LV.{level} • {profile.xp} XP
            </span>
          </div>
        </div>

        {/* Center: Desktop 7-Module Navigation */}
        <nav aria-label="Điều hướng chính" className="hidden xl:flex items-center gap-1 font-mono text-[11px]">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-tab-btn px-2.5 py-1.5 border transition ${isActive ? 'is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Theme Switcher & Spinning CD Audio Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="px-2.5 py-1.5 rounded border border-current/30 text-[11px] font-mono font-semibold flex items-center gap-1.5 hover:scale-105 active:scale-95 transition"
            title="Đổi giao diện Editorial Zine / Pastel Diary"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{profile.theme === 'zine' ? 'Zine' : 'Pastel'}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={toggleCDPlayer}
              className="px-2.5 py-1.5 rounded bg-[#EFE078] text-[#111111] border border-[#111111] text-[11px] font-mono font-bold flex items-center gap-1.5 hover:brightness-95 active:scale-95 transition"
              title="Bật/Tắt nhạc nền học tập Lo-fi Ngũ Cung"
            >
              <Disc3 className={`w-3.5 h-3.5 ${cdPlaying ? 'spin-cd' : ''}`} />
              <span className="hidden sm:inline">Đĩa CD</span>
            </button>
            <div ref={notesLayerRef} className="pointer-events-none absolute inset-0 overflow-visible" />
          </div>
        </div>
      </div>
    </header>
  );
};
