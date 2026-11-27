import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ToastContainer } from '@/components/feedback/ToastContainer';
import { useExamLockStore } from '@/features/exercises/stores/exam-lock.store';
import { BottomDock } from './BottomDock';
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageKey]);

  return (
    <>
      {!isExamActive && <Navbar />}
      <main
        className={`flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-5 sm:pt-6 ${
          isExamActive ? 'pb-10' : 'pb-28 xl:pb-5'
        }`}
      >
        <div key={pageKey} className="module-animate">
          <Outlet />
        </div>
      </main>
      {!isExamActive && <ScrollToTopButton />}
      {!isExamActive && <BottomDock />}
      <ToastContainer />
    </>
  );
};
