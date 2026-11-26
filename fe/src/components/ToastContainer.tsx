import React from 'react';
import { useApp } from '../context/AppContext';

const VARIANT_STYLES = {
  dark: 'bg-[#111111] text-white border-[#111111]',
  yellow: 'bg-[#EFE078] text-[#111111] border-[#141414]',
  pink: 'bg-[#F4C2D7] text-[#111111] border-[#141414]',
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in pointer-events-auto px-4 py-2.5 rounded-xl border-[1.5px] shadow-[3px_3px_0px_#141414] font-mono text-xs font-bold max-w-xs ${
            VARIANT_STYLES[t.variant] || VARIANT_STYLES.dark
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
};
