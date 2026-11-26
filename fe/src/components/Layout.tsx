import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomDock } from './BottomDock';
import { MascotWidget } from './MascotWidget';
import { Navbar } from './Navbar';
import { ToastContainer } from './ToastContainer';

function getPageTransitionKey(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname === '/courses') return 'courses';
  if (pathname.startsWith('/courses/')) return pathname;
  return pathname.split('/')[1] || 'home';
}

export const Layout: React.FC = () => {
  const { pathname } = useLocation();
  const pageKey = getPageTransitionKey(pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageKey]);

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-5 sm:pt-6 pb-28 xl:pb-5">
        <div key={pageKey} className="module-animate">
          <Outlet />
        </div>
      </main>
      <MascotWidget />
      <BottomDock />
      <ToastContainer />
    </>
  );
};
