import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ConfirmModal } from '@/components/feedback/ConfirmModal';
import { ToastContainer } from '@/components/feedback/ToastContainer';
import { useExamLockStore } from '@/features/exercises/stores/exam-lock.store';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { BottomDock } from './BottomDock';
import { Footer } from './Footer';
import { MarginDecor } from './MarginDecor';
import { Navbar } from './Navbar';
import { ScrollToTopButton } from './ScrollToTopButton';

function getPageTransitionKey(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname === '/courses') return 'courses';
  if (pathname.startsWith('/courses/')) return pathname;
  return pathname.split('/')[1] || 'home';
}

export const Layout: React.FC = () => {
  const { pathname } = useLocation();
  const pageKey = getPageTransitionKey(pathname);
  const isExamActive = useExamLockStore((s) => s.isExamActive);
  const showMarginDecor = !isExamActive && !pathname.endsWith('/exercises');
  const revealContainerRef = useRef<HTMLDivElement | null>(null);

  useScrollReveal(revealContainerRef, pageKey);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageKey]);

  return (
    <>
      {!isExamActive && <Navbar />}
      {showMarginDecor && <MarginDecor pageKey={pageKey} />}
      <div ref={revealContainerRef} className="flex-1 flex flex-col">
        <main
          className={`flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-5 ${
            isExamActive ? 'pb-10' : 'pb-4 xl:pb-6'
          }`}
        >
          <div key={pageKey} className="module-animate">
            <Outlet />
          </div>
        </main>
        {!isExamActive && <Footer key={pageKey} />}
      </div>
      {!isExamActive && <ScrollToTopButton />}
      {!isExamActive && <BottomDock />}
      <ToastContainer />
      <ConfirmModal />
    </>
  );
};
