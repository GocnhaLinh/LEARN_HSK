import { X } from 'lucide-react';
import React from 'react';
import { useToasts } from '../context/AppContext';

const VARIANT_STYLES = {
  dark: 'bg-[#111111] text-white border-[#111111]',
  yellow: 'bg-[#EFE078] text-[#111111] border-[#141414]',
  pink: 'bg-[#F4C2D7] text-[#111111] border-[#141414]',
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToasts();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-[72px] inset-x-3 sm:inset-x-auto sm:right-4 z-50 flex flex-col items-center sm:items-end gap-2 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          title="Nhấn để đóng"
          className={`toast-in pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-[1.5px] shadow-[3px_3px_0px_#141414] font-mono text-[11px] sm:text-xs font-bold max-w-full sm:max-w-xs text-left cursor-pointer ${
            VARIANT_STYLES[t.variant] || VARIANT_STYLES.dark
          }`}
        >
          <span className="leading-snug">{t.message}</span>
          <X className="w-3.5 h-3.5 shrink-0 opacity-70" />
        </button>
      ))}
    </div>
  );
};
