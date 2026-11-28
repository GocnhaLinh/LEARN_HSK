import React from 'react';
import { Button, Card, ProgressBar } from '@/components/ui';
import type { CourseLevelStats } from '@/features/courses/types';
import type { CourseMeta } from '@/types';

interface CourseCardProps {
  course: CourseMeta;
  stats: CourseLevelStats;
  onEnter: (level: number) => void;
}

export const CourseCard: React.FC<CourseCardProps> = React.memo(({ course, stats, onEnter }) => {
  const pct = stats.words ? Math.round((stats.mastered / stats.words) * 100) : 0;

  return (
    <Card
      variant="hover"
      padding="none"
      className={`p-6 flex flex-col justify-between gap-5 relative ${
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
            <div className="font-bold text-base mt-0.5">{stats.lessons} bài</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#F8F6F1] border border-[#141414]/20">
            <div className="opacity-65 text-[10px]">TỪ VỰNG</div>
            <div className="font-bold text-base mt-0.5">{stats.words} từ</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-dashed border-current/20">
        <div>
          <div className="flex justify-between font-mono text-[11px] font-bold mb-1">
            <span>
              Hoàn thành ({stats.mastered}/{stats.words})
            </span>
            <span>{pct}%</span>
          </div>
          <ProgressBar percent={pct} color={course.color} trackClassName="h-2.5" />
        </div>

        <Button variant="primary" fullWidth className="py-2.5 gap-2" onClick={() => onEnter(course.level)}>
          Vào khóa học {course.code} →
        </Button>
      </div>
    </Card>
  );
});

CourseCard.displayName = 'CourseCard';
