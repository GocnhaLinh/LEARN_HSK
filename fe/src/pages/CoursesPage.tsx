import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { COURSES_META } from '../data/defaults';
import { CourseMeta } from '../types';

export const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { lessons, vocab } = useApp();

  const renderCard = (course: CourseMeta) => {
    const courseLessons = lessons.filter((l) => l.level === course.level);
    const courseWords = vocab.filter((w) => w.level === course.level);
    const masteredCount = courseWords.filter((w) => w.status === 'mastered').length;
    const pct = courseWords.length ? Math.round((masteredCount / courseWords.length) * 100) : 0;

    return (
      <div
        key={course.level}
        className={`t-card t-card-hover p-6 flex flex-col justify-between gap-5 relative ${
          course.featured ? 'ring-2 ring-[#141414] bg-[#FFFBF2]' : ''
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <span
              className="px-2.5 py-1 font-mono text-[11px] font-bold text-[#111111] t-badge"
              style={{ backgroundColor: course.color }}
            >
              {course.badge}
            </span>
            <span className="text-2xl select-none">{course.emoji}</span>
          </div>
          <h3 className="font-serif font-bold text-2xl">{course.title}</h3>
          <p className="text-xs sm:text-sm opacity-75 mt-1.5 leading-relaxed">{course.subtitle}</p>

          <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-[#F8F6F1] border border-[#141414]/20">
              <div className="opacity-65 text-[10px]">SỐ BÀI HỌC</div>
              <div className="font-bold text-base mt-0.5">{courseLessons.length} bài</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F8F6F1] border border-[#141414]/20">
              <div className="opacity-65 text-[10px]">TỪ VỰNG</div>
              <div className="font-bold text-base mt-0.5">{courseWords.length} từ</div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-dashed border-current/20">
          <div>
            <div className="flex justify-between font-mono text-[11px] font-bold mb-1">
              <span>
                Hoàn thành ({masteredCount}/{courseWords.length})
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-2.5 w-full bg-[#EFECE4] border border-[#141414] rounded-full overflow-hidden">
              <div
                className="h-full shimmer-bar transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: course.color }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/courses/${course.level}`)}
            className="t-btn-black w-full py-2.5 font-mono text-xs font-bold flex items-center justify-center gap-2"
          >
            <span>Vào khóa học {course.code} →</span>
          </button>
        </div>
      </div>
    );
  };

  const interCourses = COURSES_META.filter((c) => c.tier === 'intermediate');
  const primCourses = COURSES_META.filter((c) => c.tier === 'primary');

  return (
    <section className="space-y-7">
      <div className="t-banner px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] px-2 py-0.5 bg-white/15 rounded text-[#EFE078]">
            [02] HSK 3.0 CURRICULUM (1–6) &amp; SMART PDF/DOCX IMPORTER
          </span>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl tracking-tight mt-1">
            Khóa học theo HSK
          </h2>
          <p className="text-xs sm:text-sm opacity-80 mt-1">
            Chia rõ lộ trình <strong>Sơ cấp (HSK 1–3)</strong> và <strong>Trung cấp (HSK 4–6)</strong>. Vào trong từng
            khóa học để mở trình đọc file <strong>.PDF / .DOCX</strong> tách bảng từ vựng tự động!
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/25 font-mono text-xs shrink-0">
          <span className="text-[#F4C2D7] font-bold">Smart Importer:</span> Tải file PDF / DOCX tự động chia bài, tách từ vựng &amp; tạo bài tập!
        </div>
      </div>

      {/* Group 1: Trung cấp (HSK 4-6) */}
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="px-2.5 py-1 bg-[#111111] text-[#EFE078] font-mono text-xs font-bold rounded-[4px] whitespace-nowrap shrink-0">
              TRUNG CẤP
            </span>
            <h3 className="font-serif font-bold text-xl sm:text-2xl leading-tight">
              Khóa học Trung cấp (HSK 4 – HSK 6)
            </h3>
          </div>
          <span className="font-mono text-xs opacity-70">Trọng tâm: HSK 5 (NEW HSK 3.0)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{interCourses.map(renderCard)}</div>
      </div>

      {/* Group 2: Sơ cấp (HSK 1-3) */}
      <div className="space-y-3.5 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="px-2.5 py-1 bg-[#F4C2D7] text-[#111111] font-mono text-xs font-bold t-badge whitespace-nowrap shrink-0">
              SƠ CẤP
            </span>
            <h3 className="font-serif font-bold text-xl sm:text-2xl leading-tight">
              Khóa học Sơ cấp (HSK 1 – HSK 3)
            </h3>
          </div>
          <span className="font-mono text-xs opacity-70">Nền tảng giao tiếp &amp; từ vựng cốt lõi</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{primCourses.map(renderCard)}</div>
      </div>
    </section>
  );
};
