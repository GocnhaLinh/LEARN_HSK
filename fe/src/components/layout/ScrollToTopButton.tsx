import { ArrowUp } from 'lucide-react';
import React from 'react';
import { useScrollPast } from '@/hooks/useScrollPast';

export const ScrollToTopButton: React.FC = () => {
  const visible = useScrollPast(180);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      className={`t-btn fixed right-4 sm:right-6 bottom-24 xl:bottom-6 z-40 w-11 h-11 sm:w-12 sm:h-12 !rounded-full bg-[#EFE078] text-[#111111] flex items-center justify-center hover:bg-[#F4C2D7] transition-all duration-300 ${
        visible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-3 scale-90 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-5 h-5 stroke-[2.5]" />
    </button>
  );
};
