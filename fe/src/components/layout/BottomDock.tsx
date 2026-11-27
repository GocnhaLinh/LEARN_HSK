import {
  BookOpen,
  Gamepad2,
  GraduationCap,
  Home,
  Layers,
  NotebookPen,
  PenTool,
} from 'lucide-react';
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useExamImporterStore } from '@/features/exams/stores/exam-importer.store';
import { preloadRoute } from '@/routes/lazyPages';

const DOCK_ITEMS = [
  { to: '/', label: 'Trang chủ', Icon: Home, end: true },
  { to: '/courses', label: 'Khóa học', Icon: GraduationCap, end: false },
  { to: '/flashcard', label: 'Thẻ', Icon: Layers, end: false },
  { to: '/writing', label: 'Viết', Icon: PenTool, end: false },
  { to: '/game', label: 'Game', Icon: Gamepad2, end: false },
  { to: '/vocab', label: 'Kho từ', Icon: BookOpen, end: false },
  { to: '/notes', label: 'Nhật ký', Icon: NotebookPen, end: false },
];

export const BottomDock: React.FC = () => {
  const { pathname } = useLocation();
  const isUploading = useExamImporterStore((s) => s.busyStage !== 'idle');
  const activeIdx = Math.max(
    0,
    DOCK_ITEMS.findIndex((item) =>
      item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
    ),
  );

  return (
    <div className="xl:hidden fixed bottom-3.5 inset-x-0 z-40 px-2.5 pointer-events-none">
      <nav
        aria-label="Thanh điều hướng nhanh"
        className="pointer-events-auto max-w-2xl mx-auto bg-[#111111]/95 text-[#D6D3D1] backdrop-blur-md border border-neutral-700 rounded-2xl p-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.34)]"
      >
        <div className="relative grid grid-cols-7">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 left-0 rounded-xl bg-[#EFE078] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              width: `${100 / DOCK_ITEMS.length}%`,
              transform: `translateX(${activeIdx * 100}%)`,
            }}
          />

          {DOCK_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-disabled={isUploading}
              title={isUploading ? 'Đang tải đề lên, vui lòng chờ hoàn tất...' : label}
              aria-label={label}
              onClick={(e) => {
                if (isUploading) e.preventDefault();
              }}
              onTouchStart={() => {
                if (!isUploading) preloadRoute(to);
              }}
              onMouseEnter={() => {
                if (!isUploading) preloadRoute(to);
              }}
              className={({ isActive }) =>
                `dock-btn relative z-10 flex flex-col items-center justify-center py-2.5 sm:py-1.5 px-0.5 rounded-xl text-[10px] font-mono transition-colors duration-200 ${
                  isActive ? 'text-[#111111] font-bold' : 'text-[#D6D3D1]'
                } ${isUploading ? 'opacity-45 cursor-not-allowed' : ''}`
              }
            >
              <Icon className="w-5 h-5 sm:w-4 sm:h-4 sm:mb-0.5" />
              <span className="hidden sm:block truncate max-w-full">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
