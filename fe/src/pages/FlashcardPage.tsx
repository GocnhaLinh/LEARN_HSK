import { Inbox, MessageSquareQuote, PenTool, Pointer, Turtle, Volume2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { VocabStatus } from '../types';
import { speakChinese } from '../utils/helpers';

const FILTER_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'review', label: 'Cần chú ý' },
  { key: 'learning', label: 'Đang học' },
  { key: 'new', label: 'Từ mới' },
  { key: 'hsk1', label: 'HSK 1' },
  { key: 'hsk2', label: 'HSK 2' },
  { key: 'hsk3', label: 'HSK 3' },
  { key: 'hsk4', label: 'HSK 4' },
  { key: 'hsk5', label: 'HSK 5' },
  { key: 'hsk6', label: 'HSK 6' },
];

const STATUS_LABELS: Record<VocabStatus, string> = {
  mastered: 'Đã thuộc',
  learning: 'Đang học',
  review: 'Cần chú ý',
  new: 'Từ mới',
};

export const FlashcardPage: React.FC = () => {
  const { filter: filterParam, lessonId: lessonParam } = useParams();
  const navigate = useNavigate();
  const { profile, lessons, vocab, rateFlashcardWord, showToast } = useApp();

  const activeFilter = lessonParam ? 'lesson' : filterParam || `hsk${profile.focusLevel}`;

  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [autoRead, setAutoRead] = useState(false);

  // Reset card index & flip when route filter or lesson changes
  useEffect(() => {
    setFcIndex(0);
    setFcFlipped(false);
  }, [activeFilter, lessonParam]);

  const list = useMemo(() => {
    if (lessonParam) {
      return vocab.filter((w) => w.lessonId === lessonParam);
    }
    switch (activeFilter) {
      case 'review':
        return vocab.filter((w) => w.status === 'review');
      case 'learning':
        return vocab.filter((w) => w.status === 'learning');
      case 'new':
        return vocab.filter((w) => w.status === 'new');
      case 'hsk1':
        return vocab.filter((w) => w.level === 1);
      case 'hsk2':
        return vocab.filter((w) => w.level === 2);
      case 'hsk3':
        return vocab.filter((w) => w.level === 3);
      case 'hsk4':
        return vocab.filter((w) => w.level === 4);
      case 'hsk5':
        return vocab.filter((w) => w.level === 5);
      case 'hsk6':
        return vocab.filter((w) => w.level === 6);
      default:
        return vocab;
    }
  }, [vocab, activeFilter, lessonParam]);

  const safeIndex = list.length ? ((fcIndex % list.length) + list.length) % list.length : 0;
  const word = list[safeIndex] || null;

  const activeLessonObj = useMemo(
    () => (lessonParam ? lessons.find((l) => l.id === lessonParam) : null),
    [lessons, lessonParam],
  );

  // Auto-read when switching cards
  useEffect(() => {
    if (autoRead && word) {
      speakChinese(word.hanzi, 0.95);
    }
  }, [autoRead, word?.id]);

  const navCard = useCallback(
    (dir: number) => {
      if (!list.length) return;
      setFcFlipped(false);
      setFcIndex((prev) => (prev + dir + list.length) % list.length);
    },
    [list.length],
  );

  const handleRate = useCallback(
    async (newStatus: VocabStatus, ev?: { clientX?: number; clientY?: number }) => {
      if (!word) return;
      await rateFlashcardWord(word.id, newStatus, ev);
      setFcFlipped(false);
      setFcIndex((prev) => (list.length > 1 ? (prev + 1) % list.length : 0));
    },
    [word, rateFlashcardWord, list.length],
  );

  // Keyboard shortcuts (Space, ArrowLeft, ArrowRight, 1, 2, 3)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFcFlipped((f) => !f);
      } else if (e.key === 'ArrowLeft') {
        navCard(-1);
      } else if (e.key === 'ArrowRight') {
        navCard(1);
      } else if (e.key === '1') {
        handleRate('review');
      } else if (e.key === '2') {
        handleRate('learning');
      } else if (e.key === '3') {
        handleRate('mastered');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navCard, handleRate]);

  return (
    <section className="space-y-6">
      <div className="t-card-flat p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase opacity-65">[03] SMART FLASHCARD SYSTEM</p>
          <h2 className="font-serif font-bold text-2xl">Y2K Digicam &amp; Flip-TTS</h2>
          {lessonParam && (
            <p className="font-mono text-xs font-bold text-[#A62626] mt-1">
              Đang ôn bài học: {activeLessonObj ? activeLessonObj.title : lessonParam}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 font-mono text-xs">
          {FILTER_OPTIONS.map((opt) => {
            const active = activeFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => navigate(`/flashcard/${opt.key}`)}
                className={
                  active
                    ? 't-btn px-2.5 py-1.5 bg-[#111111] text-white font-bold'
                    : 't-btn px-2.5 py-1.5 bg-white text-[#111111] hover:bg-[#EFE078]'
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {!word ? (
        <div className="t-card p-10 text-center space-y-3">
          <Inbox className="w-10 h-10 mx-auto opacity-40" />
          <h3 className="font-serif font-bold text-xl">Không có thẻ nào trong bộ lọc này</h3>
          <p className="text-sm opacity-75">Hãy chọn bộ lọc khác hoặc quay lại danh sách tất cả từ vựng.</p>
          <button
            type="button"
            onClick={() => navigate('/flashcard/all')}
            className="t-btn-black px-5 py-2.5 text-xs font-mono font-bold"
          >
            XEM TẤT CẢ THẺ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Y2K DIGICAM BEZEL */}
          <div className="lg:col-span-8 t-card bg-[#E6E3DC] p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-[#141414]" />
                <span className="font-bold tracking-wider text-[#141414]">
                  Y2K DIGICAM // HANZI LENS 3.0x
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 bg-white text-[#141414] border border-[#141414] rounded-[3px] font-bold">
                  FLASH: AUTO
                </span>
                <button
                  type="button"
                  onClick={() => setFcFlipped((f) => !f)}
                  className="px-2.5 py-0.5 bg-[#111111] text-white border border-[#111111] rounded-[3px] font-bold hover:bg-neutral-800"
                >
                  LẬT THẺ [SPACE]
                </button>
              </div>
            </div>

            {/* Digicam LCD Screen */}
            <div className="perspective-1200">
              <div
                onClick={() => setFcFlipped((f) => !f)}
                className={`flip-inner min-h-[340px] sm:min-h-[360px] cursor-pointer ${
                  fcFlipped ? 'is-flipped' : ''
                }`}
              >
                {/* FRONT FACE */}
                <div className="flip-face absolute inset-0 bg-[#F9F7F2] border-2 border-[#141414] rounded-xl p-5 sm:p-7 flex flex-col justify-between shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-[#111111] text-white font-mono text-xs font-bold rounded-[4px]">
                      HSK {word.level}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-[#F4C2D7] text-[#111111] border border-[#141414] font-mono text-[11px] font-bold rounded-[4px]">
                        {STATUS_LABELS[word.status] || 'Mới'}
                      </span>
                      <span className="px-2.5 py-1 bg-[#EFE078] text-[#111111] border border-[#141414] font-mono text-xs font-bold rounded-[4px]">
                        {word.pos || 'Từ vựng'}
                      </span>
                    </div>
                  </div>

                  <div className="my-auto text-center py-6">
                    <div className="font-serifcn text-6xl sm:text-8xl font-bold text-[#141414] tracking-wider select-none">
                      {word.hanzi}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-dashed border-[#141414]/30 flex items-center justify-between font-mono text-[11px] text-[#57534E]">
                    <span className="flex items-center gap-1.5">
                      <Pointer className="w-3.5 h-3.5" />
                      Bấm vào màn hình hoặc nhấn Space để lật xem nghĩa
                    </span>
                    <span className="font-serifcn text-sm text-[#141414]">〔 汉 〕</span>
                  </div>
                </div>

                {/* BACK FACE */}
                <div className="flip-face flip-back absolute inset-0 bg-[#FFFDF9] border-2 border-[#141414] rounded-xl p-5 sm:p-7 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-dashed border-[#141414]/30">
                      <div>
                        <div className="flex items-baseline flex-wrap gap-2.5">
                          <span className="font-serifcn text-3xl sm:text-4xl font-bold text-[#141414]">
                            {word.hanzi}
                          </span>
                          <span className="font-mono text-base sm:text-lg font-semibold text-[#A62626]">
                            {word.pinyin}
                          </span>
                        </div>
                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#EFE078] text-[#111111] border border-[#141414] font-mono text-[11px] font-bold rounded-[4px]">
                          HÁN VIỆT: {word.hanviet || '—'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const firstChar = Array.from(word.hanzi)[0];
                          navigate(`/writing/hanzi/${encodeURIComponent(firstChar)}`);
                        }}
                        className="t-btn px-2.5 py-1.5 bg-white text-[#111111] font-mono text-[11px] font-bold flex items-center gap-1 hover:bg-[#F4C2D7]"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Tập viết</span>
                      </button>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase text-[#57534E]">Nghĩa tiếng Việt</p>
                      <p className="text-lg sm:text-xl font-bold text-[#141414] mt-0.5">{word.meaning}</p>
                      {word.english && (
                        <p className="font-mono text-xs text-[#57534E] mt-0.5">EN: {word.english}</p>
                      )}
                    </div>

                    <div className="p-2.5 bg-[#F8F6F1] border-l-4 border-[#141414] text-xs text-[#292524]">
                      <span className="font-mono font-bold uppercase text-[10px] block mb-0.5">
                        Chiết tự &amp; Mẹo nhớ
                      </span>
                      <span>
                        {word.note || 'Ghi nhớ qua ví dụ thực tế và luyện phát âm nhiều lần.'}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-[#141414] rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold uppercase text-[#57534E]">
                          Ví dụ ngữ cảnh
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakChinese(word.exampleZh || word.hanzi, 0.92, (m) => showToast(m, 'pink'));
                          }}
                          className="px-2 py-0.5 bg-[#111111] text-white font-mono text-[10px] rounded flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" /> Nghe câu
                        </button>
                      </div>
                      <p className="font-serifcn text-base sm:text-lg text-[#141414]">
                        {word.exampleZh || word.hanzi}
                      </p>
                      <p className="text-xs sm:text-sm text-[#57534E] mt-0.5">
                        {word.exampleVi || word.meaning}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 SRS Rating Buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={(e) => handleRate('review', { clientX: e.clientX, clientY: e.clientY })}
                className="t-btn py-3 px-2 bg-[#F4C2D7] text-[#111111] flex flex-col items-center justify-center hover:brightness-95"
              >
                <span className="text-xs sm:text-sm font-bold">Cần chú ý</span>
                <span className="font-mono text-[10px] font-semibold opacity-80">+5 XP • Phím 1</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleRate('learning', { clientX: e.clientX, clientY: e.clientY })}
                className="t-btn py-3 px-2 bg-[#EFE078] text-[#111111] flex flex-col items-center justify-center hover:brightness-95"
              >
                <span className="text-xs sm:text-sm font-bold">Đang học</span>
                <span className="font-mono text-[10px] font-semibold opacity-80">+10 XP • Phím 2</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleRate('mastered', { clientX: e.clientX, clientY: e.clientY })}
                className="t-btn-black py-3 px-2 flex flex-col items-center justify-center"
              >
                <span className="text-xs sm:text-sm font-bold">Đã thuộc ✓</span>
                <span className="font-mono text-[10px] text-[#EFE078]">+20 XP • Phím 3</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => navCard(-1)}
                className="t-btn px-3.5 py-2 bg-white text-[#111111] font-mono text-xs font-bold hover:bg-[#EFE078]"
              >
                ← Thẻ trước
              </button>
              <div className="text-center">
                <span className="font-mono text-xs font-bold text-[#141414]">
                  {safeIndex + 1} / {list.length}
                </span>
                <p className="font-mono text-[10px] text-[#57534E] hidden sm:block">
                  Space: lật • ←/→: chuyển thẻ
                </p>
              </div>
              <button
                type="button"
                onClick={() => navCard(1)}
                className="t-btn px-3.5 py-2 bg-white text-[#111111] font-mono text-xs font-bold hover:bg-[#EFE078]"
              >
                Thẻ tiếp →
              </button>
            </div>
          </div>

          {/* RIGHT: FLIP-TTS RETRO AUDIO PLAYER */}
          <aside className="lg:col-span-4 t-card bg-[#F4C2D7] p-5 space-y-4">
            <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#141414]">
              <span>FLIP-TTS // ZH-CN</span>
              <span className="px-2 py-0.5 bg-[#111111] text-[#EFE078] rounded-[4px] text-[10px]">
                BẮC KINH
              </span>
            </div>

            <div className="bg-[#111111] text-[#F8F6F1] border-2 border-[#141414] rounded-xl p-5 text-center space-y-1.5 shadow-inner">
              <p className="font-mono text-[10px] tracking-widest text-[#F4C2D7] uppercase">
                AUDIO PLAYER • LIVE
              </p>
              <div className="font-serifcn text-4xl font-bold tracking-wider py-1">{word.hanzi}</div>
              <div className="font-mono text-sm text-[#EFE078]">{word.pinyin}</div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => speakChinese(word.hanzi, 1.0, (m) => showToast(m, 'pink'))}
                className="t-btn w-full py-2.5 px-4 bg-[#EFE078] text-[#111111] font-mono text-xs font-bold flex items-center justify-center gap-2 hover:brightness-95"
              >
                <Volume2 className="w-4 h-4" />
                <span>Đọc chuẩn (1.0x)</span>
              </button>
              <button
                type="button"
                onClick={() => speakChinese(word.hanzi, 0.65, (m) => showToast(m, 'pink'))}
                className="t-btn w-full py-2.5 px-4 bg-white text-[#111111] font-mono text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#F8F6F1]"
              >
                <Turtle className="w-4 h-4" />
                <span>Đọc chậm luyện nghe (0.65x)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  speakChinese(word.exampleZh || word.hanzi, 0.9, (m) => showToast(m, 'pink'))
                }
                className="t-btn-black w-full py-2.5 px-4 font-mono text-xs font-bold flex items-center justify-center gap-2"
              >
                <MessageSquareQuote className="w-4 h-4" />
                <span>Đọc câu ví dụ</span>
              </button>
            </div>

            <label className="flex items-center justify-between p-3 bg-white/85 border border-[#141414] rounded-lg cursor-pointer select-none">
              <span className="font-mono text-xs font-bold text-[#141414]">Tự động đọc khi qua thẻ</span>
              <input
                type="checkbox"
                checked={autoRead}
                onChange={(e) => setAutoRead(e.target.checked)}
                className="w-4 h-4 accent-[#111111]"
              />
            </label>
          </aside>
        </div>
      )}
    </section>
  );
};
