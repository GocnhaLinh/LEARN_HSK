import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card } from '@/components/ui';
import { COURSES_META } from '@/data/defaults';
import { CourseCard } from '@/features/courses/components/CourseCard';
import { useCourseLevelStats } from '@/features/courses/hooks/useCourseLevelStats';
import { useCourses } from '@/features/courses/hooks/useCourses';
import type { CourseLevelStats } from '@/features/courses/types';
import { useVocab } from '@/features/vocab/hooks/useVocab';

const EMPTY_STATS: CourseLevelStats = { lessons: 0, words: 0, mastered: 0 };
const COURSE_GROUPS = [
  {
    key: 'intermediate',
    badge: 'TRUNG CẤP',
    badgeVariant: 'dark' as const,
    heading: 'Khóa học Trung cấp (HSK 4 – HSK 6)',
    note: 'Trọng tâm: HSK 5 (NEW HSK 3.0)',
    courses: COURSES_META.filter((c) => c.tier === 'intermediate'),
  },
  {
    key: 'primary',
    badge: 'SƠ CẤP',
    badgeVariant: 'pink' as const,
    heading: 'Khóa học Sơ cấp (HSK 1 – HSK 3)',
    note: 'Nền tảng giao tiếp & từ vựng cốt lõi',
    courses: COURSES_META.filter((c) => c.tier === 'primary'),
  },
];

export const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: lessons = [] } = useCourses();
  const { data: vocab = [] } = useVocab();
  const levelStats = useCourseLevelStats(lessons, vocab);

  const handleEnterCourse = useCallback(
    (level: number) => navigate(`/courses/${level}`),
    [navigate],
  );

  return (
    <section className="space-y-7">
      <Card
        variant="banner"
        padding="none"
        className="px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <span className="font-mono text-[10px] px-2 py-0.5 bg-white/15 rounded text-[#EFE078]">
            [02] HSK 3.0 CURRICULUM (1–6) &amp; SMART PDF/DOCX IMPORTER
          </span>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl tracking-tight mt-1">
            Khóa học theo HSK
          </h2>
          <p className="text-xs sm:text-sm opacity-80 mt-1">
            Chia rõ lộ trình <strong>Sơ cấp (HSK 1–3)</strong> và <strong>Trung cấp (HSK 4–6)</strong>
            . Vào trong từng khóa học để mở trình đọc file <strong>.PDF / .DOCX</strong> tách bảng
            từ vựng tự động!
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/25 font-mono text-xs shrink-0">
          <span className="text-[#F4C2D7] font-bold">Smart Importer:</span> Tải file PDF / DOCX tự
          động chia bài, tách từ vựng &amp; tạo bài tập!
        </div>
      </Card>

      {COURSE_GROUPS.map((group) => (
        <div key={group.key} className={`space-y-3.5 ${group.key === 'primary' ? 'pt-2' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <Badge variant={group.badgeVariant} className="text-xs">
                {group.badge}
              </Badge>
              <h3 className="font-serif font-bold text-xl sm:text-2xl leading-tight">
                {group.heading}
              </h3>
            </div>
            <span className="font-mono text-xs opacity-70">{group.note}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {group.courses.map((course) => (
              <CourseCard
                key={course.level}
                course={course}
                stats={levelStats.get(course.level) ?? EMPTY_STATS}
                onEnter={handleEnterCourse}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
};
