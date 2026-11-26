import { Loader2 } from 'lucide-react';
import React from 'react';

export const PageLoader: React.FC = () => {
  return (
    <div className="t-card p-10 sm:p-14 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-[#EFE078] border-2 border-[#141414] flex items-center justify-center shadow-[2px_2px_0px_#141414]">
        <Loader2 className="w-6 h-6 text-[#111111] animate-spin" />
      </div>
      <p className="font-mono text-xs font-bold tracking-wide uppercase">
        Đang tải mô-đun HSK (QUEST) 3.0...
      </p>
    </div>
  );
};
