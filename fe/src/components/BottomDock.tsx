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
import { NavLink } from 'react-router-dom';

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
  return (
    <div className="fixed bottom-3.5 inset-x-0 z-40 px-2.5 pointer-events-none">
      <nav
        aria-label="Thanh điều hướng nhanh"
        className="pointer-events-auto max-w-2xl mx-auto bg-[#111111]/95 text-[#D6D3D1] backdrop-blur-md border border-neutral-700 rounded-2xl px-1.5 py-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.34)]"
      >
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {DOCK_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `dock-btn flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[9px] sm:text-[10px] font-mono transition ${
                  isActive ? 'bg-[#EFE078] text-[#111111] font-bold' : ''
                }`
              }
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-full">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
