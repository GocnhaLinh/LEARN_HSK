import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  Flag,
  Keyboard,
  LayoutGrid,
  List,
  Lock,
  LogOut,
  Send,
  Volume2,
} from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { Badge, Button, Card, Modal, ProgressBar, Textarea } from '@/components/ui';
import type { ExamConfirmModal } from '@/features/exercises/hooks/useExamSession';
import {
  ExamQuestion,
  ExamViewMode,
  formatTimer,
  getExerciseTypeLabel,
  hasSelectableOptions,
  OPTION_LETTERS,
} from '@/features/exercises/utils/exam-utils';
import { speakChinese } from '@/lib/speech-utils';
import { useToastStore } from '@/stores/toast.store';
import type { CourseMeta } from '@/types';

export interface ExamTakingViewProps {
  meta: CourseMeta;
  examLabel: string;
  questions: ExamQuestion[];
  answers: Record<string, string>;
  flaggedIds: Record<string, boolean>;
  currentIndex: number;
  viewMode: ExamViewMode;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  confirmModal: ExamConfirmModal;
  onUpdateAnswer: (questionId: string, value: string) => void;
  onToggleFlag: (questionId: string) => void;
  onGoToQuestion: (index: number) => void;
  onGoToFirstUnanswered: () => void;
  onPrevQuestion: () => void;
  onNextQuestion: () => void;
  onChangeViewMode: (mode: ExamViewMode) => void;
  onRequestSubmit: () => void;
  onConfirmSubmit: () => void;
  onRequestExit: () => void;
  onConfirmExit: () => void;
  onCloseConfirmModal: () => void;
}

interface TypedQuestionCardProps {
  question: ExamQuestion;
  index: number;
  total: number;
  value: string;
  isFlagged: boolean;
  autoFocus?: boolean;
  onChange: (questionId: string, value: string) => void;
  onToggleFlag: (questionId: string) => void;
}

const TypedQuestionCard: React.FC<TypedQuestionCardProps> = React.memo(
  ({
    question,
    index,
    total,
    value,
    isFlagged,
    autoFocus = false,
    onChange,
    onToggleFlag,
  }) => {
    const showToast = useToastStore((s) => s.showToast);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const hasAnswer = value.trim().length > 0;
    const isMcq = hasSelectableOptions(question);

    useEffect(() => {
      if (autoFocus && !isMcq && inputRef.current) {
        inputRef.current.focus();
      }
    }, [autoFocus, isMcq, question.id]);

    const placeholderText =
      question.exerciseType === 'translate'
        ? 'Nhập câu dịch tiếng Trung tương ứng của bạn...'
        : question.exerciseType === 'fill_blank'
          ? 'Nhập từ tiếng Trung điền vào chỗ trống...'
          : 'Nhập câu trả lời của bạn tại đây...';

    return (
      <Card id={`exam-q-${index}`} padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-dashed border-current/15">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="dark" size="xs">
              CÂU {index + 1} / {total}
            </Badge>
            <Badge variant="subtle" size="xs">
              {getExerciseTypeLabel(question.exerciseType)}
            </Badge>
            {hasAnswer && (
              <Badge variant="mint" size="xs">
                <CheckCircle2 className="w-3 h-3" />
                Đã nhập
              </Badge>
            )}
          </div>

          <Button
            variant={isFlagged ? 'pink' : 'default'}
            size="xs"
            leftIcon={<Flag className="w-3 h-3" />}
            onClick={() => onToggleFlag(question.id)}
          >
            {isFlagged ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}
          </Button>
        </div>

        {/* Prompt — ONLY shows the question (e.g. Vietnamese sentence only, NO Chinese shown beside it) */}
        <div className="space-y-2.5">
          <h2 className="font-serif font-bold text-lg sm:text-xl leading-snug">
            {question.title}
          </h2>
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#141414]/20 flex items-start justify-between gap-3">
            <p className="text-base sm:text-lg font-medium leading-relaxed text-[#141414] whitespace-pre-line">
              {question.question}
            </p>
            {question.exerciseType === 'listen' && (
              <Button
                variant="primary"
                size="icon"
                title="Nghe câu hỏi"
                onClick={() =>
                  speakChinese(question.question, 0.9, (m) => showToast(m, 'pink'))
                }
                className="shrink-0"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Answer Area: A/B/C/D options ONLY when the exercise came from an MCQ file; otherwise 100% Typed Input */}
        {isMcq ? (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {question.options!.map((opt, optIdx) => {
                const isSelected = value === opt;
                const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);
                return (
                  <button
                    key={`${question.id}_${opt}_${optIdx}`}
                    type="button"
                    onClick={() => onChange(question.id, opt)}
                    aria-pressed={isSelected}
                    className={`t-btn px-3.5 py-3 flex items-center gap-3 text-left transition-all ${
                      isSelected
                        ? 'bg-[#EFE078] text-[#111111] ring-2 ring-[#141414]'
                        : 'bg-[#F8F6F1] text-[#111111] hover:bg-white'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-[#141414] ${
                        isSelected
                          ? 'bg-[#111111] text-[#EFE078]'
                          : 'bg-white text-[#111111]'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 text-center pr-4 text-sm font-semibold leading-snug break-words">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="font-mono text-[11px] opacity-65 text-right">
              Đáp án chuẩn sẽ được đối chiếu sau khi bấm Nộp bài
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={`answer-input-${question.id}`}
                className="font-mono text-[11px] font-bold uppercase opacity-75 flex items-center gap-1.5"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Câu trả lời của bạn</span>
              </label>
              {hasAnswer && (
                <Button
                  variant="ghost"
                  size="xs"
                  leftIcon={<Eraser className="w-3 h-3" />}
                  onClick={() => onChange(question.id, '')}
                >
                  Xóa ô nhập
                </Button>
              )}
            </div>

            <Textarea
              ref={inputRef}
              id={`answer-input-${question.id}`}
              rows={3}
              value={value}
              onChange={(e) => onChange(question.id, e.target.value)}
              placeholder={placeholderText}
              autoComplete="off"
              spellCheck={false}
              className="font-serifcn text-base sm:text-lg leading-relaxed bg-white focus:ring-2 focus:ring-[#EFE078]"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] opacity-65">
              <span>
                {hasAnswer ? `Đã nhập ${Array.from(value.trim()).length} ký tự` : 'Chưa nhập đáp án'}
              </span>
              <span>Đáp án chuẩn sẽ được đối chiếu sau khi bấm Nộp bài</span>
            </div>
          </div>
        )}
      </Card>
    );
  },
);
TypedQuestionCard.displayName = 'TypedQuestionCard';

export const ExamTakingView: React.FC<ExamTakingViewProps> = ({
  meta,
  examLabel,
  questions,
  answers,
  flaggedIds,
  currentIndex,
  viewMode,
  elapsedSeconds,
  remainingSeconds,
  answeredCount,
  unansweredCount,
  flaggedCount,
  confirmModal,
  onUpdateAnswer,
  onToggleFlag,
  onGoToQuestion,
  onGoToFirstUnanswered,
  onPrevQuestion,
  onNextQuestion,
  onChangeViewMode,
  onRequestSubmit,
  onConfirmSubmit,
  onRequestExit,
  onConfirmExit,
  onCloseConfirmModal,
}) => {
  const isTimed = remainingSeconds !== null;
  const isLowTime = isTimed && remainingSeconds <= 60;
  const progressPct = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const currentQuestion = questions[currentIndex];

  return (
    <section className="space-y-5 pb-10">
      {/* Sticky Exam Focus Header */}
      <Card
        padding="sm"
        className="sticky top-3 z-30 space-y-2.5 bg-[var(--bg-surface)]/95 backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Badge variant="dark" size="sm">
              <Lock className="w-3 h-3" />
              KIỂM TRA {meta.code}
            </Badge>
            <span className="font-serif font-bold text-sm sm:text-base truncate">
              {examLabel}
            </span>
            <Badge variant="mint" size="xs">
              Đã nhập {answeredCount}/{questions.length}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Timer */}
            <Badge
              variant={isLowTime ? 'pink' : isTimed ? 'yellow' : 'subtle'}
              size="sm"
              className={isLowTime ? 'animate-pulse' : undefined}
            >
              <Clock className="w-3.5 h-3.5" />
              {isTimed ? formatTimer(remainingSeconds) : formatTimer(elapsedSeconds)}
            </Badge>

            {/* View mode toggle */}
            <div className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-[#EFECE4] border border-[#141414]/35">
              <button
                type="button"
                onClick={() => onChangeViewMode('single')}
                className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 transition ${
                  viewMode === 'single'
                    ? 'bg-[#111111] text-[#EFE078]'
                    : 'text-[#111111] hover:bg-white/60'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                Từng câu
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('all')}
                className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 transition ${
                  viewMode === 'all'
                    ? 'bg-[#111111] text-[#EFE078]'
                    : 'text-[#111111] hover:bg-white/60'
                }`}
              >
                <List className="w-3 h-3" />
                Cả đề
              </button>
            </div>

            <Button
              variant="default"
              size="sm"
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              onClick={onRequestExit}
            >
              Thoát
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send className="w-3.5 h-3.5 text-[#EFE078]" />}
              onClick={onRequestSubmit}
            >
              Nộp bài
            </Button>
          </div>
        </div>

        <ProgressBar percent={progressPct} color={meta.color} size="sm" />
      </Card>

      {/* Main Content + Question Navigator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Questions Area */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === 'single' && currentQuestion ? (
            <>
              <TypedQuestionCard
                question={currentQuestion}
                index={currentIndex}
                total={questions.length}
                value={answers[currentQuestion.id] || ''}
                isFlagged={Boolean(flaggedIds[currentQuestion.id])}
                autoFocus
                onChange={onUpdateAnswer}
                onToggleFlag={onToggleFlag}
              />

              {/* Single-mode prev/next bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="default"
                  size="md"
                  disabled={currentIndex === 0}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                  onClick={onPrevQuestion}
                >
                  Câu trước
                </Button>

                <span className="hidden sm:inline font-mono text-[11px] opacity-60">
                  Phím tắt: Ctrl + Enter câu tiếp • Ctrl + Shift + Enter câu trước
                </span>

                {currentIndex < questions.length - 1 ? (
                  <Button
                    variant="yellow"
                    size="md"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={onNextQuestion}
                  >
                    Câu tiếp theo
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<Send className="w-4 h-4 text-[#EFE078]" />}
                    onClick={onRequestSubmit}
                  >
                    Nộp bài &amp; Đối chiếu
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <TypedQuestionCard
                    key={q.id}
                    question={q}
                    index={idx}
                    total={questions.length}
                    value={answers[q.id] || ''}
                    isFlagged={Boolean(flaggedIds[q.id])}
                    onChange={onUpdateAnswer}
                    onToggleFlag={onToggleFlag}
                  />
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Send className="w-4 h-4 text-[#EFE078]" />}
                  onClick={onRequestSubmit}
                >
                  Nộp bài &amp; Đối chiếu ({answeredCount}/{questions.length})
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar: Question Navigator Palette */}
        <Card padding="md" className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif font-bold text-lg">Bảng câu hỏi</h3>
            <span className="font-mono text-[11px] font-bold opacity-70">
              {answeredCount}/{questions.length} đã nhập
            </span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-5 gap-1.5 max-h-72 overflow-y-auto p-0.5">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]?.trim());
              const isFlagged = Boolean(flaggedIds[q.id]);
              const isCurrent = viewMode === 'single' && idx === currentIndex;

              let tileClass = 'bg-[#F8F6F1] text-[#111111] hover:bg-[#EFE078]/60';
              if (isAnswered) {
                tileClass = 'bg-[#CBEAD8] text-[#111111]';
              }
              if (isFlagged) {
                tileClass = isAnswered
                  ? 'bg-[#EFE078] text-[#111111]'
                  : 'bg-[#F4C2D7] text-[#111111]';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onGoToQuestion(idx)}
                  className={`relative h-9 rounded-md border-[1.5px] border-[#141414] font-mono text-xs font-bold transition ${tileClass} ${
                    isCurrent ? 'ring-2 ring-[#141414] ring-offset-1 scale-105' : ''
                  }`}
                  title={`Câu ${idx + 1}${isAnswered ? ' (Đã nhập)' : ' (Chưa nhập)'}${
                    isFlagged ? ' • Đã đánh dấu' : ''
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#111111] border border-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-[10px] opacity-80 pt-1 border-t border-dashed border-current/15">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#CBEAD8] border border-[#141414]" />
              Đã nhập ({answeredCount})
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#F8F6F1] border border-[#141414]" />
              Chưa nhập ({unansweredCount})
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#F4C2D7] border border-[#141414]" />
              Đánh dấu ({flaggedCount})
            </span>
          </div>

          {/* Mobile view mode switch */}
          <div className="flex sm:hidden gap-2">
            <Button
              variant={viewMode === 'single' ? 'primary' : 'default'}
              size="xs"
              fullWidth
              onClick={() => onChangeViewMode('single')}
            >
              Xem từng câu
            </Button>
            <Button
              variant={viewMode === 'all' ? 'primary' : 'default'}
              size="xs"
              fullWidth
              onClick={() => onChangeViewMode('all')}
            >
              Xem cả đề
            </Button>
          </div>

          <div className="space-y-2">
            {unansweredCount > 0 && (
              <Button
                variant="yellow"
                size="sm"
                fullWidth
                onClick={onGoToFirstUnanswered}
              >
                Tới câu chưa nhập đầu tiên ({unansweredCount})
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<Send className="w-4 h-4 text-[#EFE078]" />}
              onClick={onRequestSubmit}
            >
              Nộp bài &amp; Đối chiếu
            </Button>
          </div>
        </Card>
      </div>

      {/* Confirm Submit Modal */}
      <Modal
        open={confirmModal === 'submit'}
        onClose={onCloseConfirmModal}
        maxWidth="md"
        headerBadge={
          <Badge variant={unansweredCount > 0 ? 'pink' : 'mint'} size="xs">
            XÁC NHẬN NỘP BÀI
          </Badge>
        }
        title="Bạn có chắc chắn muốn nộp bài?"
        footer={
          <div className="flex flex-wrap justify-end gap-2 w-full">
            {unansweredCount > 0 && (
              <Button variant="yellow" size="md" onClick={onGoToFirstUnanswered}>
                Tới câu chưa nhập
              </Button>
            )}
            <Button variant="default" size="md" onClick={onCloseConfirmModal}>
              Quay lại kiểm tra
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Send className="w-3.5 h-3.5 text-[#EFE078]" />}
              onClick={onConfirmSubmit}
            >
              Xác nhận nộp bài
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
            <div className="p-3 rounded-lg bg-[#CBEAD8]/60 border border-[#141414]/30">
              <div className="opacity-70">Đã nhập</div>
              <div className="text-lg font-bold">
                {answeredCount} / {questions.length}
              </div>
            </div>
            <div
              className={`p-3 rounded-lg border border-[#141414]/30 ${
                unansweredCount > 0 ? 'bg-[#F4C2D7]/70' : 'bg-[#F8F6F1]'
              }`}
            >
              <div className="opacity-70">Bỏ trống</div>
              <div className="text-lg font-bold">{unansweredCount} câu</div>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="p-3 rounded-lg bg-[#F4C2D7]/45 border border-[#141414]/30 flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Bạn vẫn còn <strong>{unansweredCount} câu chưa nhập đáp án</strong>. Các câu bỏ
                trống sẽ bị tính là chưa đúng khi đối chiếu kết quả.
              </span>
            </div>
          )}

          {flaggedCount > 0 && (
            <p className="font-mono text-xs opacity-75">
              Lưu ý: Bạn có <strong>{flaggedCount} câu đang đánh dấu xem lại</strong>.
            </p>
          )}
        </div>
      </Modal>

      {/* Confirm Exit Modal */}
      <Modal
        open={confirmModal === 'exit'}
        onClose={onCloseConfirmModal}
        maxWidth="sm"
        headerBadge={
          <Badge variant="pink" size="xs">
            THOÁT PHÒNG THI
          </Badge>
        }
        title="Rời khỏi bài kiểm tra đang làm?"
        footer={
          <>
            <Button variant="default" size="md" onClick={onCloseConfirmModal}>
              Tiếp tục làm bài
            </Button>
            <Button variant="pink" size="md" onClick={onConfirmExit}>
              Thoát &amp; Hủy bài
            </Button>
          </>
        }
      >
        <p className="text-sm opacity-80 leading-relaxed">
          Bạn đã nhập <strong>{answeredCount}/{questions.length}</strong> câu. Nếu bấm{' '}
          <strong>Thoát &amp; Hủy bài</strong>, bản nháp đang làm sẽ bị xóa và không được chấm
          điểm.
        </p>
      </Modal>
    </section>
  );
};
