import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  History,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { Badge, Button, Card, EmptyState, ProgressBar } from '@/components/ui';
import {
  buildCompletedSentence,
  ExamGradeSummary,
  formatTimer,
  getExerciseTypeLabel,
  getQuestionSpeechText,
  OPTION_LETTERS,
  ReviewFilter,
} from '@/features/exercises/utils/exam-utils';
import { speakChinese } from '@/lib/speech-utils';
import { useToastStore } from '@/stores/toast.store';
import type { CourseMeta } from '@/types';

export interface ExamResultViewProps {
  meta: CourseMeta;
  examLabel: string;
  gradeResult: ExamGradeSummary;
  elapsedSeconds: number;
  isViewingHistory: boolean;
  reviewFilter: ReviewFilter;
  onChangeReviewFilter: (filter: ReviewFilter) => void;
  onRetryWrong: () => void;
  onStartNewRandomExam: () => void;
  onBackToSetup: () => void;
  onBackToCourse: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  meta,
  examLabel,
  gradeResult,
  elapsedSeconds,
  isViewingHistory,
  reviewFilter,
  onChangeReviewFilter,
  onRetryWrong,
  onStartNewRandomExam,
  onBackToSetup,
  onBackToCourse,
}) => {
  const showToast = useToastStore((s) => s.showToast);
  const missedCount = gradeResult.wrongCount + gradeResult.unansweredCount;

  const visibleItems = useMemo(() => {
    if (reviewFilter === 'wrong') {
      return gradeResult.items.filter((item) => !item.isCorrect);
    }
    if (reviewFilter === 'correct') {
      return gradeResult.items.filter((item) => item.isCorrect);
    }
    return gradeResult.items;
  }, [gradeResult.items, reviewFilter]);

  return (
    <section className="space-y-6">
      {/* Score Summary Banner */}
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="dark" size="sm">
              KẾT QUẢ THI THỬ {meta.code}
            </Badge>
            {isViewingHistory && (
              <Badge variant="lavender" size="sm">
                <History className="w-3.5 h-3.5" />
                Xem lại lịch sử
              </Badge>
            )}
            <Badge variant={gradeResult.gradeVariant} size="sm">
              <Trophy className="w-3.5 h-3.5" />
              {gradeResult.gradeLabel}
            </Badge>
          </div>
          <Badge variant="mint" size="xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            Chỉ lưu cục bộ • Không ghi DB
          </Badge>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <p className="font-mono text-xs uppercase opacity-65">{examLabel}</p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-serif font-bold text-5xl sm:text-6xl">
                {gradeResult.score10.toFixed(1)}
              </span>
              <span className="font-mono text-lg font-bold opacity-60">/ 10 điểm</span>
              <Badge variant="yellow" size="sm">
                Chính xác {gradeResult.percent}%
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#CBEAD8]/70 border border-[#141414]/25 text-center">
              <div className="font-mono text-[10px] uppercase opacity-75">Đúng</div>
              <div className="font-serif font-bold text-xl text-[#141414]">
                {gradeResult.correctCount}
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#F4C2D7]/70 border border-[#141414]/25 text-center">
              <div className="font-mono text-[10px] uppercase opacity-75">Sai</div>
              <div className="font-serif font-bold text-xl text-[#141414]">
                {gradeResult.wrongCount}
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#141414]/25 text-center">
              <div className="font-mono text-[10px] uppercase opacity-75">Bỏ trống</div>
              <div className="font-serif font-bold text-xl text-[#141414]">
                {gradeResult.unansweredCount}
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#EFE078]/65 border border-[#141414]/25 text-center">
              <div className="font-mono text-[10px] uppercase opacity-75 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Thời gian
              </div>
              <div className="font-mono font-bold text-base text-[#141414] mt-0.5">
                {formatTimer(elapsedSeconds)}
              </div>
            </div>
          </div>
        </div>

        <ProgressBar
          percent={gradeResult.percent}
          color={
            gradeResult.score10 >= 7
              ? '#CBEAD8'
              : gradeResult.score10 >= 5
                ? '#EFE078'
                : '#F4C2D7'
          }
          size="md"
        />

        {/* Post-exam action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {missedCount > 0 && (
            <Button
              variant="pink"
              size="md"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={onRetryWrong}
            >
              Làm lại {missedCount} câu sai / bỏ trống
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            leftIcon={<RefreshCw className="w-4 h-4 text-[#EFE078]" />}
            onClick={onStartNewRandomExam}
          >
            Tạo đề ngẫu nhiên mới
          </Button>
          <Button
            variant="yellow"
            size="md"
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={onBackToSetup}
          >
            {isViewingHistory ? 'Quay lại phòng thi' : 'Đổi cấu hình đề'}
          </Button>
          <Button
            variant="default"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBackToCourse}
          >
            Về {meta.code}
          </Button>
        </div>
      </Card>

      {/* Review Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif font-bold text-2xl">
          Chi tiết bài làm &amp; Đáp án
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={reviewFilter === 'all' ? 'primary' : 'default'}
            size="sm"
            onClick={() => onChangeReviewFilter('all')}
          >
            Tất cả ({gradeResult.total})
          </Button>
          <Button
            variant={reviewFilter === 'wrong' ? 'pink' : 'default'}
            size="sm"
            onClick={() => onChangeReviewFilter('wrong')}
          >
            Sai &amp; bỏ trống ({missedCount})
          </Button>
          <Button
            variant={reviewFilter === 'correct' ? 'mint' : 'default'}
            size="sm"
            onClick={() => onChangeReviewFilter('correct')}
          >
            Câu đúng ({gradeResult.correctCount})
          </Button>
        </div>
      </div>

      {/* Detailed Graded Questions */}
      {visibleItems.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<CheckCircle2 className="w-9 h-9" />}
            title="Không có câu nào trong mục lọc này"
            description={
              reviewFilter === 'wrong'
                ? 'Tuyệt vời! Bạn đã trả lời đúng toàn bộ các câu trong đề này.'
                : 'Chưa có câu đúng nào trong lượt thi này — thử xem mục câu sai để ôn lại nhé!'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => {
            const { question, index, userAnswer, isCorrect, isUnanswered } = item;
            const correctTrim = String(question.correctAnswer || '').trim();
            const completed = buildCompletedSentence(question);
            const speechText = getQuestionSpeechText(question);

            return (
              <Card key={question.id} padding="md" className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="dark" size="xs">
                      CÂU #{index + 1}
                    </Badge>
                    <Badge variant="subtle" size="xs">
                      {getExerciseTypeLabel(question.exerciseType)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {speechText && !completed && (
                      <Button
                        variant="default"
                        size="xs"
                        leftIcon={<Volume2 className="w-3.5 h-3.5" />}
                        onClick={() =>
                          speakChinese(speechText, 0.9, (m) => showToast(m, 'pink'))
                        }
                      >
                        Nghe phát âm
                      </Button>
                    )}

                    {isCorrect ? (
                      <Badge variant="mint" size="xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Chính xác
                      </Badge>
                    ) : isUnanswered ? (
                      <Badge variant="subtle" size="xs">
                        Chưa chọn đáp án
                      </Badge>
                    ) : (
                      <Badge variant="pink" size="xs">
                        <XCircle className="w-3.5 h-3.5" />
                        Chưa đúng
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg">
                    {question.title}
                  </h3>
                  <p className="text-sm sm:text-base font-medium leading-relaxed mt-1 whitespace-pre-line">
                    {question.question}
                  </p>
                </div>

                {/* Options showing right vs user's choice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {question.options.map((opt, optIdx) => {
                    const isRightOpt = opt.trim() === correctTrim;
                    const isUserPick = userAnswer !== null && opt === userAnswer;
                    const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);

                    let optStyle = 'bg-[#F8F6F1] opacity-60 border-[#141414]/25';
                    if (isRightOpt) {
                      optStyle = 'bg-[#CBEAD8] border-[#141414] ring-2 ring-[#141414]';
                    } else if (isUserPick && !isCorrect) {
                      optStyle = 'bg-[#F4C2D7] border-[#141414] ring-2 ring-[#141414]';
                    }

                    return (
                      <div
                        key={`${question.id}_res_${opt}_${optIdx}`}
                        className={`px-3 py-2.5 rounded-lg border-[1.5px] flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-[#111111] ${optStyle}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded bg-white/90 border border-[#141414] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                            {letter}
                          </span>
                          <span className="break-words">{opt}</span>
                        </div>
                        {isRightOpt && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#111111] text-[#CBEAD8] shrink-0">
                            ✓ Đáp án đúng
                          </span>
                        )}
                        {isUserPick && !isRightOpt && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#111111] text-[#F4C2D7] shrink-0">
                            ✗ Bạn chọn
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Completed Chinese Sentence + TTS Pronunciation (for fill_blank) */}
                {completed && (
                  <div className="p-3 rounded-lg bg-[#F8F6F1] border border-[#141414]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-xs sm:text-sm leading-relaxed text-[#141414]">
                      <span className="font-mono text-[10px] font-bold uppercase opacity-65 block mb-0.5">
                        Câu hoàn chỉnh
                      </span>
                      <span>{completed.before}</span>
                      <strong className="px-1.5 py-0.5 mx-0.5 rounded bg-[#CBEAD8] border border-[#141414]/40 text-[#111111]">
                        {completed.answer}
                      </strong>
                      <span>{completed.after}</span>
                    </div>
                    {completed.speakText && (
                      <Button
                        variant="primary"
                        size="xs"
                        leftIcon={<Volume2 className="w-3.5 h-3.5 text-[#EFE078]" />}
                        onClick={() =>
                          speakChinese(completed.speakText, 0.9, (m) =>
                            showToast(m, 'pink'),
                          )
                        }
                        className="shrink-0 self-start sm:self-center"
                      >
                        Nghe câu
                      </Button>
                    )}
                  </div>
                )}

                {/* Explanation */}
                <div
                  className={`p-3 rounded-lg border border-[#141414]/35 text-xs leading-relaxed ${
                    isCorrect ? 'bg-[#CBEAD8]/35' : 'bg-[#EFE078]/35'
                  }`}
                >
                  <span className="font-mono font-bold mr-1.5">Giải thích:</span>
                  <span>
                    {question.explanation ||
                      `Đáp án chính xác là "${question.correctAnswer}".`}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
