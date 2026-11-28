import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ConfirmModal } from '@/components/feedback/ConfirmModal';
import { ToastContainer } from '@/components/feedback/ToastContainer';
import { useExamLockStore } from '@/features/exercises/stores/exam-lock.store';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { BottomDock } from './BottomDock';
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
  const mainRef = useRef<HTMLElement | null>(null);

  useScrollReveal(mainRef, pageKey);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageKey]);

  return (
    <>
      {!isExamActive && <Navbar />}
      {showMarginDecor && <MarginDecor pageKey={pageKey} />}
      <main
        ref={mainRef}
        className={`flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-5 ${
          isExamActive ? 'pb-10' : 'pb-28 xl:pb-4'
        }`}
      >
        <div key={pageKey} className="module-animate">
          <Outlet />
        </div>
      </main>
      {!isExamActive && <ScrollToTopButton />}
      {!isExamActive && <BottomDock />}
      <ToastContainer />
      <ConfirmModal />
    </>
  );
};
