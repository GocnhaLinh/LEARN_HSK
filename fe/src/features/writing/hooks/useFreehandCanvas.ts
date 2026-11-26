import { useCallback, useEffect, useRef, useState } from 'react';
import { useToastStore } from '@/stores/toast.store';

export const INK_COLORS = [
  { label: 'Mực đen', value: '#141414' },
  { label: 'Đỏ chu sa', value: '#A62626' },
  { label: 'Xanh lam', value: '#1D4ED8' },
] as const;

export function useFreehandCanvas(enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  const [inkColor, setInkColorState] = useState('#141414');
  const [brushSize, setBrushSize] = useState(8);
  const [caption, setCaption] = useState('');

  const setInkColor = useCallback((color: string) => {
    setInkColorState(color);
    useToastStore.getState().showToast('Đã đổi màu mực viết');
  }, []);

  const resizeCanvas = useCallback(() => {
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
    if (!enabled) return;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [enabled, resizeCanvas]);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, inkColor, brushSize]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const captureSnapshot = useCallback((): { img: string; caption: string } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const finalCaption =
      caption.trim() ||
      `Bài viết ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const img = canvas.toDataURL('image/png');
    setCaption('');
    return { img, caption: finalCaption };
  }, [caption]);

  return {
    canvasRef,
    inkColor,
    setInkColor,
    brushSize,
    setBrushSize,
    caption,
    setCaption,
    clearCanvas,
    captureSnapshot,
  };
}
