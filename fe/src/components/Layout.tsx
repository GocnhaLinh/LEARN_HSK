import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomDock } from './BottomDock';
import { MascotWidget } from './MascotWidget';
import { Navbar } from './Navbar';
import { ToastContainer } from './ToastContainer';

export const Layout: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-5 sm:pt-8 pb-28 xl:pb-16">
        <div key={pathname} className="module-animate">
          <Outlet />
        </div>
      </main>
      <MascotWidget />
      <BottomDock />
      <ToastContainer />
    </>
  );
};
