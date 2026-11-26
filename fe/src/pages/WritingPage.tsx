import HanziWriter from 'hanzi-writer';
import { Eraser, Eye, Info, PencilLine, Play, Save, Trash2, Volume2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { speakChinese } from '../utils/helpers';

export const WritingPage: React.FC = () => {
  const { char: charParam } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    vocab,
    writeQuickPool,
    handwritingGallery,
    recordHanziQuizComplete,
    saveHandwritingSnapshot,
    deleteHandwritingItem,
    showToast,
  } = useApp();

  const isCanvasMode = pathname.startsWith('/writing/canvas');
  const activeChar = charParam ? Array.from(decodeURIComponent(charParam))[0] || '学' : '学';

  const [charInput, setCharInput] = useState('');
  const [statusText, setStatusText] = useState(
    'Nhấn "Xem nét mẫu" hoặc "Quiz (+10 XP)" để bắt đầu.',
  );
  const [showOutline, setShowOutline] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const writerBoxRef = useRef<HTMLDivElement | null>(null);
  const writerInstanceRef = useRef<HanziWriter | null>(null);

  // Freehand canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const [inkColor, setInkColor] = useState('#141414');
  const [brushSize, setBrushSize] = useState(8);
  const [caption, setCaption] = useState('');

  const matchedWord = vocab.find((v) => v.hanzi.includes(activeChar));

  // Initialize HanziWriter whenever activeChar changes in hanzi mode
  useEffect(() => {
    if (isCanvasMode) return;
    const target = writerBoxRef.current;
    if (!target) return;

    target.innerHTML = '';
    writerInstanceRef.current = null;
    setShowOutline(true);
    setLoadError(null);
    setStatusText(`Đang tải bút thuận chữ "${activeChar}"...`);

    try {
      const instance = HanziWriter.create(target, activeChar, {
        width: 280,
        height: 280,
        padding: 18,
        showOutline: true,
        strokeColor: '#141414',
        radicalColor: '#A62626',
        outlineColor: '#DDD8CE',
        drawingColor: '#141414',
        drawingWidth: 18,
        onLoadCharDataSuccess: () => {
          setStatusText(
            `Sẵn sàng luyện viết chữ "${activeChar}". Nhấn "Xem nét mẫu" hoặc "Quiz (+10 XP)".`,
          );
        },
        onLoadCharDataError: () => {
          writerInstanceRef.current = null;
          setLoadError(`Không tìm thấy nét vẽ cho "${activeChar}".`);
          setStatusText(`Ký tự "${activeChar}" không có trong kho nét viết.`);
        },
      });
      writerInstanceRef.current = instance;
    } catch {
      setStatusText('Lỗi khởi tạo HanziWriter.');
    }

    return () => {
      if (target) target.innerHTML = '';
      writerInstanceRef.current = null;
    };
  }, [activeChar, isCanvasMode]);

  const handleLoadChar = () => {
    const clean = charInput.trim();
    if (!clean) {
      showToast('Vui lòng nhập 1 chữ Hán hợp lệ.', 'pink');
      return;
    }
    const ch = Array.from(clean)[0];
    setCharInput('');
    navigate(`/writing/hanzi/${encodeURIComponent(ch)}`);
  };

  const handleAnimate = () => {
    const inst = writerInstanceRef.current;
    if (!inst) return;
    setStatusText(`Đang chiếu thứ tự nét chữ "${activeChar}"...`);
    inst.animateCharacter({
      onComplete: () => {
        setStatusText('Đã xong nét mẫu! Nhấn "Quiz (+10 XP)" để tự đồ nét.');
      },
    });
  };

  const handleQuiz = () => {
    const inst = writerInstanceRef.current;
    if (!inst) return;
    setStatusText(`Chế độ Quiz chữ "${activeChar}": Hãy viết từng nét theo đúng bút thuận.`);
    inst.quiz({
      showHintAfterMisses: 2,
      onMistake: (d) => {
        setStatusText(`Nét ${d.strokeNum + 1} chưa đúng hướng, thử lại nhé!`);
      },
      onCorrectStroke: (d) => {
        if (d.strokesRemaining > 0) {
          setStatusText(`Chính xác! Còn ${d.strokesRemaining} nét nữa.`);
        }
      },
      onComplete: (summary) => {
        setStatusText(`Hoàn thành chữ "${activeChar}" (nhầm ${summary.totalMistakes} nét)!`);
        recordHanziQuizComplete(activeChar);
      },
    });
  };

  const handleToggleOutline = () => {
    const inst = writerInstanceRef.current;
    if (!inst) return;
    const next = !showOutline;
    setShowOutline(next);
    if (next) inst.showOutline();
    else inst.hideOutline();
  };

  // Freehand Canvas resize + drawing handlers
  const resizeFreehandCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(280, rect.width) * dpr;
    canvas.height = Math.max(280, rect.height) * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  useEffect(() => {
    if (!isCanvasMode) return;
    resizeFreehandCanvas();
    window.addEventListener('resize', resizeFreehandCanvas);
    return () => window.removeEventListener('resize', resizeFreehandCanvas);
  }, [isCanvasMode, resizeFreehandCanvas]);

  useEffect(() => {
    if (!isCanvasMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPt = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawingRef.current = true;
      lastPtRef.current = getPt(e);
    };

    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawingRef.current || !lastPtRef.current) return;
      e.preventDefault();
      const pt = getPt(e);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = brushSize;
        ctx.beginPath();
        ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
      lastPtRef.current = pt;
    };

    const end = () => {
      drawingRef.current = false;
      lastPtRef.current = null;
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, [isCanvasMode, inkColor, brushSize]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSnapshot = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    await saveHandwritingSnapshot(dataUrl, caption, { clientX: e.clientX, clientY: e.clientY });
    setCaption('');
  };

  return (
    <section className="space-y-6">
      <div className="t-card-flat p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase opacity-65">[04] WRITING STUDIO // 米字格</p>
          <h2 className="font-serif font-bold text-2xl">Luyện viết Chữ Hán</h2>
        </div>

        <div className="inline-flex gap-1.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => navigate(`/writing/hanzi/${encodeURIComponent(activeChar)}`)}
            className={
              !isCanvasMode
                ? 't-btn px-3.5 py-2 bg-[#111111] text-white font-bold'
                : 't-btn px-3.5 py-2 bg-white text-[#111111] font-bold'
            }
          >
            Đồ nét chuẩn (HanziWriter)
          </button>
          <button
            type="button"
            onClick={() => navigate('/writing/canvas')}
            className={
              isCanvasMode
                ? 't-btn px-3.5 py-2 bg-[#111111] text-white font-bold'
                : 't-btn px-3.5 py-2 bg-white text-[#111111] font-bold'
            }
          >
            Viết tay tự do (Canvas)
          </button>
        </div>
      </div>

      {/* SUB-TAB A: HANZIWRITER */}
      {!isCanvasMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="t-card p-5 space-y-3">
              <label htmlFor="write-char-input" className="font-mono text-xs font-bold uppercase block">
                Nhập chữ Hán bất kỳ để đồ nét
              </label>
              <div className="flex gap-2">
                <input
                  id="write-char-input"
                  type="text"
                  maxLength={2}
                  value={charInput}
                  onChange={(e) => setCharInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLoadChar();
                  }}
                  placeholder="VD: 学, 爱, 茶, 汉..."
                  className="flex-1 px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded font-serifcn text-lg outline-none"
                />
                <button
                  type="button"
                  onClick={handleLoadChar}
                  className="t-btn-black px-4 py-2 font-mono text-xs font-bold"
                >
                  Tải chữ
                </button>
              </div>
            </div>

            <div className="t-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs font-bold uppercase">Chọn nhanh chữ luyện viết</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {writeQuickPool.map((ch) => {
                  const active = ch === activeChar;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => navigate(`/writing/hanzi/${encodeURIComponent(ch)}`)}
                      className={
                        active
                          ? 't-btn py-2 bg-[#111111] text-white font-serifcn text-xl font-bold'
                          : 't-btn py-2 bg-[#F8F6F1] text-[#111111] font-serifcn text-xl font-bold hover:bg-[#EFE078]'
                      }
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="t-card p-5 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-serifcn text-4xl font-bold">{activeChar}</span>
                  <span className="font-mono text-sm font-semibold text-[#A62626]">
                    {matchedWord ? matchedWord.pinyin : 'Chữ tùy chỉnh'}
                  </span>
                </div>
                <p className="text-sm font-medium mt-1">
                  {matchedWord
                    ? `${matchedWord.hanzi}: ${matchedWord.meaning}`
                    : 'Dữ liệu nét viết từ HanziWriter'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => speakChinese(activeChar, 0.85, (m) => showToast(m, 'pink'))}
                className="t-btn-black w-10 h-10 flex items-center justify-center shrink-0"
                title="Phát âm"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 t-card p-6 flex flex-col items-center">
            <div className="w-full mb-5 px-4 py-2.5 bg-[#F8F6F1] border border-[#141414] rounded-lg font-mono text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{statusText}</span>
            </div>

            <div className="mizige-grid flex items-center justify-center">
              {loadError ? (
                <div className="relative z-10 w-[280px] h-[280px] flex items-center justify-center p-4 text-center font-mono text-xs text-red-700">
                  {loadError}
                </div>
              ) : (
                <div ref={writerBoxRef} className="relative z-10 w-[280px] h-[280px]" />
              )}
            </div>

            <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 font-mono text-xs font-bold">
              <button
                type="button"
                onClick={handleAnimate}
                className="t-btn-black py-2.5 px-3 flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Xem nét mẫu</span>
              </button>
              <button
                type="button"
                onClick={handleQuiz}
                className="t-btn py-2.5 px-3 bg-[#EFE078] text-[#111111] flex items-center justify-center gap-1.5 hover:brightness-95"
              >
                <PencilLine className="w-3.5 h-3.5" />
                <span>Quiz (+10 XP)</span>
              </button>
              <button
                type="button"
                onClick={handleToggleOutline}
                className="t-btn py-2.5 px-3 bg-white text-[#111111] flex items-center justify-center gap-1.5 hover:bg-[#F4C2D7]"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showOutline ? 'Ẩn khung mờ' : 'Hiện khung mờ'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* SUB-TAB B: FREEHAND CANVAS */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 t-card p-5 space-y-4">
              <h3 className="font-serif font-bold text-lg">Bảng màu &amp; Bút viết tay</h3>
              <div>
                <p className="font-mono text-xs font-bold mb-2">Màu mực</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInkColor('#141414');
                      showToast('Đã đổi màu mực viết');
                    }}
                    className="t-btn px-3 py-1.5 bg-[#141414] text-white font-mono text-xs font-bold"
                  >
                    Mực đen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInkColor('#A62626');
                      showToast('Đã đổi màu mực viết');
                    }}
                    className="t-btn px-3 py-1.5 bg-[#A62626] text-white font-mono text-xs font-bold"
                  >
                    Đỏ chu sa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInkColor('#1D4ED8');
                      showToast('Đã đổi màu mực viết');
                    }}
                    className="t-btn px-3 py-1.5 bg-[#1D4ED8] text-white font-mono text-xs font-bold"
                  >
                    Xanh lam
                  </button>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-mono text-xs font-bold mb-1.5">
                  <label htmlFor="brush-size-slider">Độ dày nét bút</label>
                  <span>{brushSize} px</span>
                </div>
                <input
                  id="brush-size-slider"
                  type="range"
                  min={3}
                  max={20}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-[#111111]"
                />
              </div>
              <div>
                <label htmlFor="canvas-caption-input" className="font-mono text-xs font-bold block mb-1.5">
                  Ghi chú cho ảnh lưu (tuỳ chọn)
                </label>
                <input
                  id="canvas-caption-input"
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="VD: Tập viết chữ 爱..."
                  className="w-full px-3 py-2 bg-[#F8F6F1] border-[1.5px] border-[#141414] rounded text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="t-btn py-2.5 px-3 bg-white text-[#111111] font-mono text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#F4C2D7]"
                >
                  <Eraser className="w-4 h-4" />
                  <span>Xóa bảng</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveSnapshot}
                  className="t-btn-black py-2.5 px-3 font-mono text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu sổ tay</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 t-card p-6 flex flex-col items-center">
              <p className="font-mono text-xs opacity-70 mb-4">
                Vẽ bằng chuột, ngón tay hoặc bút cảm ứng lên lưới 米字格
              </p>
              <div className="mizige-grid">
                <canvas ref={canvasRef} className="relative z-10 w-full h-full cursor-crosshair" />
              </div>
            </div>
          </div>

          <div className="t-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg">Sổ tay chữ viết đã lưu</h3>
              <span className="font-mono text-xs px-2.5 py-0.5 bg-[#EFE078] text-[#111111] t-badge font-bold">
                {handwritingGallery.length} ảnh
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {!handwritingGallery.length ? (
                <p className="col-span-full text-xs opacity-65 py-4 text-center font-mono">
                  Chưa có bài viết tay nào được lưu.
                </p>
              ) : (
                handwritingGallery.map((item) => (
                  <div
                    key={item.id}
                    className="border-[1.5px] border-[#141414] rounded-xl bg-[#FFFEFA] p-2 flex flex-col gap-1.5"
                  >
                    <img
                      src={item.img}
                      alt={item.caption}
                      className="w-full aspect-square object-contain border border-dashed border-stone-300 bg-white rounded"
                    />
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium truncate">{item.caption}</span>
                      <button
                        type="button"
                        onClick={() => deleteHandwritingItem(item.id)}
                        className="text-red-700 hover:opacity-70 shrink-0"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
