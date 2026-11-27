import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Compass,
  Database,
  Eye,
  History,
  Play,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import React from 'react';
import { Badge, Button, Card, EmptyState, ProgressBar, Select } from '@/components/ui';
import type { ActiveDraftSummary } from '@/features/exercises/hooks/useExamSession';
import {
  ExamConfig,
  EXERCISE_TYPE_LABELS,
  formatAttemptDate,
  formatTimer,
  LocalExamAttempt,
  QUESTION_COUNT_PRESETS,
  TIME_LIMIT_PRESETS,
} from '@/features/exercises/utils/exam-utils';
import type { CourseMeta, Lesson } from '@/types';

export interface ExamSetupPanelProps {
  meta: CourseMeta;
  totalBankCount: number;
  filteredCount: number;
  seenCount: number;
  isLoading: boolean;
  config: ExamConfig;
  lessons: Lesson[];
  lessonCounts: Map<string, number>;
  typeCounts: Record<string, number>;
  wrongIdsCount: number;
  history: LocalExamAttempt[];
  activeDraft: ActiveDraftSummary | null;
  onBackToCourse: () => void;
  onUpdateConfig: (patch: Partial<ExamConfig>) => void;
  onStartRandomExam: () => void;
  onStartWrongBankExam: () => void;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
  onOpenHistoryAttempt: (attempt: LocalExamAttempt) => void;
  onClearHistory: () => void;
  onClearWrongBank: () => void;
  onClearSeenBank: () => void;
}

const EXERCISE_TYPE_ORDER = ['all', 'fill_blank', 'quiz', 'translate', 'listen'] as const;

export const ExamSetupPanel: React.FC<ExamSetupPanelProps> = ({
  meta,
  totalBankCount,
  filteredCount,
  seenCount,
  isLoading,
  config,
  lessons,
  lessonCounts,
  typeCounts,
  wrongIdsCount,
  history,
  activeDraft,
  onBackToCourse,
  onUpdateConfig,
  onStartRandomExam,
  onStartWrongBankExam,
  onResumeDraft,
  onDiscardDraft,
  onOpenHistoryAttempt,
  onClearHistory,
  onClearWrongBank,
  onClearSeenBank,
}) => {
  const bestScore = history.length
    ? history.reduce((max, item) => (item.score10 > max ? item.score10 : max), 0)
    : null;

  const actualQuestionCount =
    config.questionCount === 0
      ? filteredCount
      : Math.min(config.questionCount, filteredCount);

  const unseenRemaining = Math.max(0, totalBankCount - seenCount);
  const coveragePct =
    totalBankCount > 0 ? Math.round((seenCount / totalBankCount) * 100) : 0;

  return (
    <section className="space-y-6">
      {/* Header Banner */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <Button
            variant="default"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={onBackToCourse}
          >
            Quay lại {meta.code}
          </Button>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="custom" style={{ backgroundColor: meta.color }}>
              {meta.code} • Phòng Thi Thử
            </Badge>
            <Badge variant="mint">
              <ShieldCheck className="w-3.5 h-3.5" />
              Lưu cục bộ • Không ghi DB
            </Badge>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
          <div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl">
              {meta.emoji} Luyện đề &amp; Kiểm tra {meta.code}
            </h1>
            <p className="text-xs sm:text-sm opacity-75 mt-1 max-w-2xl leading-relaxed">
              Sinh đề ngẫu nhiên trực tiếp từ ngân hàng câu hỏi trong database. Chế độ tập
              trung sẽ ẩn thanh điều hướng trong lúc làm bài — kết quả và giải thích chi tiết
              chỉ hiển thị sau khi bạn bấm <strong>Nộp bài</strong>.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 shrink-0">
            <div className="px-3 py-2 rounded-lg bg-[#F8F6F1] border border-[#141414]/25 text-center">
              <div className="font-mono text-[10px] uppercase opacity-65">Ngân hàng</div>
              <div className="font-serif font-bold text-lg text-[#141414]">
                {totalBankCount}
              </div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[#F4C2D7]/45 border border-[#141414]/25 text-center">
              <div className="font-mono text-[10px] uppercase opacity-70">Hay sai</div>
              <div className="font-serif font-bold text-lg text-[#141414]">
                {wrongIdsCount}
              </div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[#EFE078]/60 border border-[#141414]/25 text-center">
              <div className="font-mono text-[10px] uppercase opacity-70">Cao nhất</div>
              <div className="font-serif font-bold text-lg text-[#141414]">
                {bestScore !== null ? `${bestScore.toFixed(1)}` : '—'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Auto-Saved In-Progress Exam Draft Banner */}
      {activeDraft && (
        <Card
          padding="md"
          className="bg-[#EFE078]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="dark" size="xs">
                BÀI THI ĐANG LÀM DỞ
              </Badge>
              <span className="font-mono text-[11px] font-bold opacity-75">
                Lưu lúc {formatAttemptDate(activeDraft.updatedAt)}
              </span>
            </div>
            <h2 className="font-serif font-bold text-lg">
              {activeDraft.examLabel} — Đã chọn {activeDraft.answeredCount}/
              {activeDraft.totalQuestions} câu
            </h2>
            <p className="font-mono text-xs opacity-75">
              {activeDraft.remainingSeconds !== null
                ? `Còn lại ${formatTimer(activeDraft.remainingSeconds)}`
                : `Đã làm ${formatTimer(activeDraft.elapsedSeconds)}`}{' '}
              • Các đáp án bạn chọn trước khi thoát/F5 vẫn được giữ nguyên.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Play className="w-3.5 h-3.5 text-[#EFE078]" />}
              onClick={onResumeDraft}
            >
              Tiếp tục làm bài
            </Button>
            <Button
              variant="default"
              size="md"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={onDiscardDraft}
            >
              Hủy nháp
            </Button>
          </div>
        </Card>
      )}

      {/* Empty Bank Guard */}
      {!isLoading && totalBankCount === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Database className="w-10 h-10" />}
            title={`Chưa có ngân hàng câu hỏi cho ${meta.code}`}
            description={`Khóa học ${meta.code} hiện chưa có bài tập trong database. Hãy quay lại trang khóa học và tải giáo trình (.PDF / .DOCX / .TXT) để tự động sinh bộ câu hỏi.`}
            actions={
              <Button
                variant="primary"
                size="md"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={onBackToCourse}
              >
                Quay lại {meta.code} để tải giáo trình
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Random Exam Builder */}
          <Card padding="lg" className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-dashed border-current/15">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <h2 className="font-serif font-bold text-xl">Cấu hình đề thi ngẫu nhiên</h2>
              </div>
              <Badge variant="yellow">Khớp bộ lọc: {filteredCount} câu</Badge>
            </div>

            {/* Question count presets */}
            <div className="space-y-2">
              <label className="font-mono text-[11px] font-bold uppercase opacity-75 block">
                1. Số lượng câu hỏi trong đề
              </label>
              <div className="flex flex-wrap gap-2">
                {QUESTION_COUNT_PRESETS.map((preset) => {
                  const isActive = config.questionCount === preset;
                  const label =
                    preset === 0 ? `Tất cả (${filteredCount})` : `${preset} câu`;
                  const isBeyondPool =
                    preset > 0 && filteredCount > 0 && preset > filteredCount;
                  return (
                    <Button
                      key={preset}
                      variant={isActive ? 'primary' : 'default'}
                      size="sm"
                      onClick={() => onUpdateConfig({ questionCount: preset })}
                      className={isBeyondPool && !isActive ? 'opacity-65' : undefined}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Time limit presets */}
            <div className="space-y-2">
              <label className="font-mono text-[11px] font-bold uppercase opacity-75 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>2. Thời gian làm bài</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TIME_LIMIT_PRESETS.map((mins) => {
                  const isActive = config.timeLimitMinutes === mins;
                  return (
                    <Button
                      key={mins}
                      variant={isActive ? 'yellow' : 'default'}
                      size="sm"
                      onClick={() => onUpdateConfig({ timeLimitMinutes: mins })}
                    >
                      {mins === 0 ? 'Không giới hạn' : `${mins} phút`}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Lesson filter + Exercise type filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] font-bold uppercase opacity-75 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>3. Phạm vi bài học</span>
                </label>
                <Select
                  value={config.lessonId}
                  onChange={(e) => onUpdateConfig({ lessonId: e.target.value })}
                  className="w-full"
                >
                  <option value="all">Tất cả bài học ({totalBankCount} câu)</option>
                  {lessons.map((lesson) => {
                    const count = lessonCounts.get(lesson.id) || 0;
                    if (count === 0) return null;
                    return (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title} ({count} câu)
                      </option>
                    );
                  })}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[11px] font-bold uppercase opacity-75 block">
                  4. Dạng bài tập
                </label>
                <Select
                  value={config.exerciseType}
                  onChange={(e) => onUpdateConfig({ exerciseType: e.target.value })}
                  className="w-full"
                >
                  {EXERCISE_TYPE_ORDER.map((typeKey) => {
                    const count = typeCounts[typeKey] || 0;
                    if (typeKey !== 'all' && count === 0) return null;
                    return (
                      <option key={typeKey} value={typeKey}>
                        {EXERCISE_TYPE_LABELS[typeKey]} ({count})
                      </option>
                    );
                  })}
                </Select>
              </div>
            </div>

            {/* Exam generation toggles */}
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#F8F6F1] border border-[#141414]/30 cursor-pointer select-none">
                <span className="flex items-center gap-2 font-mono text-xs font-bold text-[#141414]">
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Ưu tiên rút câu chưa làm (còn {unseenRemaining} câu mới chưa gặp)
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={config.prioritizeUnseen}
                  onChange={(e) =>
                    onUpdateConfig({ prioritizeUnseen: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#111111] shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#F8F6F1] border border-[#141414]/30 cursor-pointer select-none">
                <span className="flex items-center gap-2 font-mono text-xs font-bold text-[#141414]">
                  <Shuffle className="w-3.5 h-3.5 shrink-0" />
                  <span>Xáo trộn ngẫu nhiên vị trí đáp án A / B / C / D mỗi lần thi</span>
                </span>
                <input
                  type="checkbox"
                  checked={config.shuffleOptions}
                  onChange={(e) => onUpdateConfig({ shuffleOptions: e.target.checked })}
                  className="w-4 h-4 accent-[#111111] shrink-0"
                />
              </label>
            </div>

            {/* Focus Mode Callout */}
            <div className="p-3.5 rounded-lg bg-[#EFE078]/35 border border-[#141414]/40 text-xs leading-relaxed">
              <div className="font-mono font-bold text-[11px] uppercase mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quy chế phòng thi tập trung</span>
              </div>
              <ul className="space-y-0.5 opacity-85 list-disc list-inside">
                <li>
                  Thanh điều hướng ngoài và nút Back trình duyệt sẽ được <strong>khóa</strong>{' '}
                  trong lúc làm bài (tự lưu nháp nếu lỡ F5).
                </li>
                <li>
                  Chọn đáp án <strong>không lộ đúng/sai</strong> ngay lập tức — chỉ chấm điểm
                  và giải thích sau khi bấm <strong>Nộp bài</strong>.
                </li>
                <li>
                  Toàn bộ điểm số, lịch sử xem lại và sổ tay câu hay sai chỉ lưu cục bộ trên
                  trình duyệt (không ghi lên database).
                </li>
              </ul>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={isLoading || actualQuestionCount === 0}
                leftIcon={<Play className="w-4 h-4 text-[#EFE078]" />}
                onClick={onStartRandomExam}
              >
                {isLoading
                  ? 'Đang tải ngân hàng câu hỏi...'
                  : `Bắt đầu thi thử (${actualQuestionCount} câu)`}
              </Button>
            </div>
          </Card>

          {/* Right: Bank Coverage + Mistake Bank + Local Attempt History */}
          <div className="lg:col-span-5 space-y-5">
            {/* Bank Coverage Tracker */}
            <Card padding="md" className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4" />
                  <h3 className="font-serif font-bold text-lg">Độ phủ ngân hàng</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="mint" size="xs">
                    {seenCount}/{totalBankCount} ({coveragePct}%)
                  </Badge>
                  {seenCount > 0 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      title="Đặt lại độ phủ để luyện vòng mới"
                      onClick={onClearSeenBank}
                    >
                      Đặt lại
                    </Button>
                  )}
                </div>
              </div>
              <ProgressBar percent={coveragePct} color={meta.color} size="sm" />
              <p className="text-[11px] font-mono opacity-70">
                {unseenRemaining > 0
                  ? `Còn ${unseenRemaining} câu hỏi trong ${meta.code} bạn chưa từng làm.`
                  : `Bạn đã luyện qua toàn bộ ${totalBankCount} câu hỏi của ${meta.code}!`}
              </p>
            </Card>

            {/* Local Mistake Notebook Card */}
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  <h3 className="font-serif font-bold text-lg">Sổ tay câu hay sai</h3>
                </div>
                <Badge variant={wrongIdsCount > 0 ? 'pink' : 'subtle'} size="xs">
                  {wrongIdsCount} câu
                </Badge>
              </div>
              <p className="text-xs opacity-75 leading-relaxed">
                Những câu bạn trả lời sai hoặc bỏ trống khi nộp bài sẽ tự động lưu tại máy để
                ôn tập riêng. Khi bạn làm đúng lại câu đó, nó sẽ tự được gỡ khỏi danh sách.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="pink"
                  size="sm"
                  disabled={wrongIdsCount === 0}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={onStartWrongBankExam}
                >
                  Ôn riêng {wrongIdsCount} câu sai
                </Button>
                {wrongIdsCount > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={onClearWrongBank}
                  >
                    Xóa danh sách
                  </Button>
                )}
              </div>
            </Card>

            {/* Local History Card (Clickable to Review!) */}
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <h3 className="font-serif font-bold text-lg">
                    Lịch sử thi thử ({history.length})
                  </h3>
                </div>
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Trash2 className="w-3 h-3" />}
                    onClick={onClearHistory}
                  >
                    Xóa
                  </Button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#F8F6F1] border border-dashed border-[#141414]/25 text-center font-mono text-xs opacity-65">
                  Chưa có lượt thi thử nào cho {meta.code}. Hãy bắt đầu đề ngẫu nhiên đầu
                  tiên!
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                  {history.map((item) => {
                    const scoreVariant =
                      item.score10 >= 8 ? 'mint' : item.score10 >= 5 ? 'yellow' : 'pink';
                    const canReview = Array.isArray(item.records) && item.records.length > 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenHistoryAttempt(item)}
                        title={
                          canReview
                            ? 'Bấm để xem lại chi tiết bài làm & đáp án'
                            : 'Lượt thi cũ chưa lưu chi tiết từng câu'
                        }
                        className={`w-full text-left p-3 rounded-lg bg-[#F8F6F1] border border-[#141414]/20 flex items-center justify-between gap-2 transition ${
                          canReview
                            ? 'hover:bg-white hover:border-[#141414] cursor-pointer group'
                            : 'opacity-80 cursor-default'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-bold text-[#141414] truncate flex items-center gap-1.5">
                            <span className="truncate">{item.label}</span>
                            {canReview && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] opacity-60 group-hover:opacity-100 shrink-0">
                                <Eye className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] opacity-65 mt-0.5 flex flex-wrap items-center gap-x-2">
                            <span>{formatAttemptDate(item.completedAt)}</span>
                            <span>•</span>
                            <span>
                              Đúng {item.correctCount}/{item.total}
                            </span>
                            <span>•</span>
                            <span>{formatTimer(item.elapsedSeconds)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant={scoreVariant} size="sm">
                            <Trophy className="w-3 h-3" />
                            {item.score10.toFixed(1)}/10
                          </Badge>
                          {canReview && (
                            <ChevronRight className="w-3.5 h-3.5 opacity-45 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </section>
  );
};
