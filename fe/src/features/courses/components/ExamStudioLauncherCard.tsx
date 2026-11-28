import {
  ArrowRight,
  ClipboardCheck,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import React from 'react';
import { Badge, Button, Card } from '@/components/ui';
import type { LocalCourseExamStats } from '@/features/exercises/types';
import { ExercisesPage } from '@/routes/lazyPages';
import type { CourseMeta } from '@/types';

interface ExamStudioLauncherCardProps {
  meta: CourseMeta;
  exerciseCount: number;
  localExamStats: LocalCourseExamStats;
  onOpenOfficialExams: () => void;
  onOpenExercises: () => void;
}

export const ExamStudioLauncherCard: React.FC<ExamStudioLauncherCardProps> = React.memo(
  ({ meta, exerciseCount, localExamStats, onOpenOfficialExams, onOpenExercises }) => {
    const preloadExercises = () => void ExercisesPage.preload();

    return (
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                <h3 className="font-serif font-bold text-2xl">
                  Phòng Thi thử &amp; Bài tập {meta.code}
                </h3>
              </div>
              <Badge variant="yellow" size="xs">
                {exerciseCount} câu hỏi
              </Badge>
              <Badge variant="mint" size="xs">
                <ShieldCheck className="w-3 h-3" />
                Chấm điểm cục bộ
              </Badge>
            </div>

            <p className="text-xs sm:text-sm opacity-75 max-w-2xl leading-relaxed">
              {exerciseCount > 0
                ? `Rút đề ngẫu nhiên (10 / 20 / 30 / 50 câu hoặc toàn bộ ${exerciseCount} câu) theo bài học & dạng bài. Khi vào bài thi sẽ ẩn thanh điều hướng để tập trung tối đa và chỉ chấm điểm sau khi bấm Nộp bài.`
                : `Chưa có bài tập nào trong ${meta.code}. Hãy tải giáo trình (.PDF / .DOCX / .TXT) để tự động sinh ngân hàng câu hỏi.`}
            </p>

            {(localExamStats.attemptCount > 0 || localExamStats.wrongCount > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {localExamStats.bestScore10 !== null && (
                  <Badge variant="yellow" size="xs">
                    <Trophy className="w-3 h-3" />
                    Cao nhất: {localExamStats.bestScore10.toFixed(1)}/10 (
                    {localExamStats.attemptCount} lượt)
                  </Badge>
                )}
                {localExamStats.wrongCount > 0 && (
                  <Badge variant="pink" size="xs">
                    <RotateCcw className="w-3 h-3" />
                    {localExamStats.wrongCount} câu hay sai cần ôn
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="yellow"
              size="lg"
              onMouseEnter={preloadExercises}
              leftIcon={<GraduationCap className="w-4 h-4" />}
              onClick={onOpenOfficialExams}
            >
              Đề thi chuẩn HSK (PDF + MP3)
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={exerciseCount === 0}
              onMouseEnter={preloadExercises}
              rightIcon={<ArrowRight className="w-4 h-4 text-[#EFE078]" />}
              onClick={onOpenExercises}
            >
              Luyện dịch ({exerciseCount} câu)
            </Button>
          </div>
        </div>
      </Card>
    );
  },
);

ExamStudioLauncherCard.displayName = 'ExamStudioLauncherCard';
