import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
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
import type { ExamGradeSummary, ReviewFilter } from '@/features/exercises/types';
import {
  buildCompletedSentence,
  formatTimer,
  getExerciseTypeLabel,
  getQuestionSpeechText,
  hasSelectableOptions,
  OPTION_LETTERS,
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
  const missedGradableCount = useMemo(
    () => gradeResult.items.filter((i) => i.hasAnswerKey && !i.isCorrect).length,
    [gradeResult.items],
  );

  const visibleItems = useMemo(() => {
    if (reviewFilter === 'wrong') {
      return gradeResult.items.filter((item) => item.hasAnswerKey && !item.isCorrect);
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
              KẾT QUẢ ĐỐI CHIẾU {meta.code}
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
            {gradeResult.score10 !== null ? (
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-serif font-bold text-5xl sm:text-6xl">
                  {gradeResult.score10.toFixed(1)}
                </span>
                <span className="font-mono text-lg font-bold opacity-60">/ 10 điểm</span>
                <Badge variant="yellow" size="sm">
                  Chính xác {gradeResult.percent}% ({gradeResult.correctCount}/
                  {gradeResult.gradableCount} câu có đáp án)
                </Badge>
              </div>
            ) : (
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-serif font-bold text-3xl sm:text-4xl">
                  Đã nhập {gradeResult.answered}/{gradeResult.total} câu
                </span>
                <Badge variant="lavender" size="sm">
                  Bài tự luận (file chưa có đáp án mẫu)
                </Badge>
              </div>
            )}
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
              <div className="font-mono text-[10px] uppercase opacity-75">
                {gradeResult.selfCheckCount > 0 ? 'Tự đối chiếu' : 'Bỏ trống'}
              </div>
              <div className="font-serif font-bold text-xl text-[#141414]">
                {gradeResult.selfCheckCount > 0
                  ? gradeResult.selfCheckCount
                  : gradeResult.unansweredCount}
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
            gradeResult.score10 === null
              ? '#DCD2F5'
              : gradeResult.score10 >= 7
                ? '#CBEAD8'
                : gradeResult.score10 >= 5
                  ? '#EFE078'
                  : '#F4C2D7'
          }
          size="md"
        />

        {/* Post-exam action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {missedGradableCount > 0 && (
            <Button
              variant="pink"
              size="md"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={onRetryWrong}
            >
              Làm lại {missedGradableCount} câu sai / bỏ trống
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
          Đối chiếu bài làm &amp; Đáp án chuẩn
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={reviewFilter === 'all' ? 'primary' : 'default'}
            size="sm"
            onClick={() => onChangeReviewFilter('all')}
          >
            Tất cả ({gradeResult.total})
          </Button>
          {gradeResult.gradableCount > 0 && (
            <>
              <Button
                variant={reviewFilter === 'wrong' ? 'pink' : 'default'}
                size="sm"
                onClick={() => onChangeReviewFilter('wrong')}
              >
                Sai &amp; bỏ trống ({missedGradableCount})
              </Button>
              <Button
                variant={reviewFilter === 'correct' ? 'mint' : 'default'}
                size="sm"
                onClick={() => onChangeReviewFilter('correct')}
              >
                Câu đúng ({gradeResult.correctCount})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Detailed Comparison Cards */}
      {visibleItems.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<CheckCircle2 className="w-9 h-9" />}
            title="Không có câu nào trong mục lọc này"
            description={
              reviewFilter === 'wrong'
                ? 'Tuyệt vời! Bạn đã nhập chính xác toàn bộ các câu có đáp án trong đề này.'
                : 'Chưa có câu đúng nào trong lượt làm bài này — xem mục câu sai để đối chiếu nhé!'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => {
            const {
              question,
              index,
              userAnswer,
              hasAnswerKey,
              isSelfCheck,
              isCorrect,
              isUnanswered,
              similarityPct,
              diffSegments: userDiff,
            } = item;
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

                  <div className="flex flex-wrap items-center gap-1.5">
                    {speechText && (
                      <Button
                        variant="primary"
                        size="xs"
                        leftIcon={<Volume2 className="w-3.5 h-3.5 text-[#EFE078]" />}
                        onClick={() =>
                          speakChinese(speechText, 0.9, (m) => showToast(m, 'pink'))
                        }
                      >
                        Nghe phát âm
                      </Button>
                    )}

                    {isSelfCheck ? (
                      <Badge variant="lavender" size="xs">
                        <FileText className="w-3.5 h-3.5" />
                        Tự đối chiếu (chưa có đáp án mẫu)
                      </Badge>
                    ) : isCorrect ? (
                      <Badge variant="mint" size="xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Chính xác 100%
                      </Badge>
                    ) : isUnanswered ? (
                      <Badge variant="subtle" size="xs">
                        Chưa nhập đáp án
                      </Badge>
                    ) : (
                      <Badge variant="pink" size="xs">
                        <XCircle className="w-3.5 h-3.5" />
                        Chưa khớp ({similarityPct}%)
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Question Prompt */}
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg">
                    {question.title}
                  </h3>
                  <p className="text-sm sm:text-base font-medium leading-relaxed mt-1 whitespace-pre-line">
                    {question.question}
                  </p>
                </div>

                {/* Comparison: A/B/C/D options for real file MCQ, or Typed Answer vs Expected Answer */}
                {hasSelectableOptions(question) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {question.options!.map((opt, optIdx) => {
                      const isRightOpt =
                        hasAnswerKey && opt.trim() === String(question.correctAnswer || '').trim();
                      const isUserPick = userAnswer !== null && opt === userAnswer;
                      const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);

                      let optStyle = 'bg-[#F8F6F1] opacity-60 border-[#141414]/25';
                      if (isRightOpt) {
                        optStyle = 'bg-[#CBEAD8] border-[#141414] ring-2 ring-[#141414]';
                      } else if (isUserPick && !isCorrect) {
                        optStyle = 'bg-[#F4C2D7] border-[#141414] ring-2 ring-[#141414]';
                      } else if (isUserPick && isSelfCheck) {
                        optStyle = 'bg-[#DCD2F5]/55 border-[#141414]';
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
                              {isSelfCheck ? 'Bạn chọn' : '✗ Bạn chọn'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left: User's Typed Input */}
                    <div
                      className={`p-3.5 rounded-xl border-[1.5px] space-y-1.5 ${
                        isSelfCheck
                          ? 'bg-[#DCD2F5]/30 border-[#141414]/40'
                          : isCorrect
                            ? 'bg-[#CBEAD8]/65 border-[#141414]'
                            : isUnanswered
                              ? 'bg-[#F8F6F1] border-[#141414]/30'
                              : 'bg-[#F4C2D7]/45 border-[#141414]'
                      }`}
                    >
                      <div className="font-mono text-[10px] font-bold uppercase opacity-75">
                        Bạn đã nhập
                      </div>
                      {isUnanswered ? (
                        <p className="text-xs italic opacity-60">Chưa nhập câu trả lời.</p>
                      ) : userDiff ? (
                        <p className="font-serifcn text-base sm:text-lg leading-relaxed break-words">
                          {userDiff.map((seg, segIdx) => (
                            <span
                              key={segIdx}
                              className={
                                seg.matched
                                  ? 'text-[#141414]'
                                  : 'bg-[#111111] text-[#F4C2D7] px-0.5 rounded font-bold'
                              }
                            >
                              {seg.char}
                            </span>
                          ))}
                        </p>
                      ) : (
                        <p className="font-serifcn text-base sm:text-lg font-bold text-[#141414] leading-relaxed break-words">
                          {userAnswer}
                        </p>
                      )}
                    </div>

                    {/* Right: Expected Answer / Chinese Example */}
                    <div
                      className={`p-3.5 rounded-xl border-[1.5px] space-y-1.5 ${
                        hasAnswerKey
                          ? 'bg-[#CBEAD8]/55 border-[#141414]'
                          : 'bg-[#F8F6F1] border-dashed border-[#141414]/35'
                      }`}
                    >
                      <div className="font-mono text-[10px] font-bold uppercase opacity-75">
                        {hasAnswerKey
                          ? 'Đáp án chuẩn (câu tiếng Trung / kết quả từ file)'
                          : 'Đáp án mẫu'}
                      </div>
                      {hasAnswerKey ? (
                        <p className="font-serifcn text-base sm:text-lg font-bold text-[#141414] leading-relaxed break-words">
                          {question.correctAnswer}
                        </p>
                      ) : (
                        <p className="text-xs opacity-65">
                          File bài tập gốc chưa kèm đáp án mẫu cho câu này.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Completed Chinese Sentence (for fill_blank questions) */}
                {completed && (
                  <div className="p-3 rounded-lg bg-[#F8F6F1] border border-[#141414]/30 text-xs sm:text-sm leading-relaxed text-[#141414]">
                    <span className="font-mono text-[10px] font-bold uppercase opacity-65 block mb-0.5">
                      Câu hoàn chỉnh
                    </span>
                    <span>{completed.before}</span>
                    <strong className="px-1.5 py-0.5 mx-0.5 rounded bg-[#CBEAD8] border border-[#141414]/40 text-[#111111]">
                      {completed.answer}
                    </strong>
                    <span>{completed.after}</span>
                  </div>
                )}

                {/* Explanation */}
                {question.explanation && (
                  <div
                    className={`p-3 rounded-lg border border-[#141414]/35 text-xs leading-relaxed ${
                      isCorrect ? 'bg-[#CBEAD8]/30' : 'bg-[#EFE078]/35'
                    }`}
                  >
                    <span className="font-mono font-bold mr-1.5">Ghi chú / Từ khóa:</span>
                    <span>{question.explanation}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
