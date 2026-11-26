import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { MASCOT_QUOTES } from '../data/defaults';
import { spawnConfetti } from '../utils/helpers';

export const MascotWidget: React.FC = () => {
  const { mascotSay, setMascotSay } = useApp();
  const quoteIdxRef = useRef(0);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      quoteIdxRef.current = (quoteIdxRef.current + 1) % MASCOT_QUOTES.length;
      setMascotSay(MASCOT_QUOTES[quoteIdxRef.current]);
    }, 16000);
    return () => window.clearInterval(timer);
  }, [setMascotSay]);

  const petMascot = (e: React.MouseEvent<HTMLButtonElement>) => {
    setPopping(false);
    window.requestAnimationFrame(() => setPopping(true));
    quoteIdxRef.current = (quoteIdxRef.current + 1) % MASCOT_QUOTES.length;
    setMascotSay(MASCOT_QUOTES[quoteIdxRef.current]);
    spawnConfetti({ clientX: e.clientX, clientY: e.clientY }, 10);
  };

  return (
    <div className="hidden md:flex fixed bottom-24 xl:bottom-5 right-3 sm:right-5 z-40 flex-col items-end gap-1.5 pointer-events-none">
      <div className="pointer-events-auto max-w-[205px] px-3 py-2 bg-white text-[#141414] border-[1.5px] border-[#141414] rounded-2xl rounded-br-sm shadow-[3px_3px_0px_#141414] text-[11px] sm:text-xs font-semibold leading-snug transition-all duration-300">
        {mascotSay}
      </div>
      <button
        type="button"
        onClick={petMascot}
        onAnimationEnd={() => setPopping(false)}
        className={`pointer-events-auto animate-float-y w-14 h-14 rounded-full bg-[#EFE078] border-2 border-[#141414] shadow-[3px_3px_0px_#141414] flex items-center justify-center text-3xl select-none cursor-pointer hover:bg-[#F4C2D7] transition-colors ${
          popping ? 'jelly-pop' : ''
        }`}
        title="Bấm vào bé Gấu Trúc để nhận năng lượng dễ thương!"
      >
        🐼
      </button>
    </div>
  );
};
