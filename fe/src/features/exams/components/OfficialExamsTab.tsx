import {
  BookOpen,
  Clock,
  Cloud,
  FilePlus2,
  Headphones,
  History,
  Loader2,
  PenTool,
  Play,
  RotateCcw,
  Trash2,
  Trophy,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, Modal } from '@/components/ui';
import { formatAttemptDate, formatTimer } from '@/features/exercises/utils/exam-utils';
import type { CourseMeta } from '@/types';
import type {
  LocalOfficialExamAttempt,
  OfficialExamMode,
  OfficialExamSummary,
} from '@/features/exams/types';
import {
  useDeleteExamMutation,
  useExamDetail,
  useExamsByLevel,
} from '../hooks/useExamsQuery';
import { useOfficialExamSession } from '../hooks/useOfficialExamSession';
import {
  hasDraftContent,
  isDraftExpired,
  useExamImporterStore,
} from '../stores/exam-importer.store';
import { MODE_LABELS } from '../utils/official-exam-grading';
import { ExamBundleImporter } from './ExamBundleImporter';
import { OfficialExamResultView } from './OfficialExamResultView';
import { OfficialExamTakingView } from './OfficialExamTakingView';

export interface OfficialExamsTabProps {
  level: number;
  meta: CourseMeta;
  defaultOpenImporter?: boolean;
  onConsumedImportParam?: () => void;
  onSessionActiveChange?: (active: boolean) => void;
}

export const OfficialExamsTab: React.FC<OfficialExamsTabProps> = ({
  level,
  meta,
  defaultOpenImporter = false,
  onConsumedImportParam,
  onSessionActiveChange,
}) => {
  const importerDraft = useExamImporterStore((s) => s.draftsByLevel[level]);
  const isImporterBusy = useExamImporterStore((s) => s.busyStage !== 'idle');
  const setImporterOpen = useExamImporterStore((s) => s.setOpen);
  const pruneExpired = useExamImporterStore((s) => s.pruneExpired);

  const hasValidDraft = hasDraftContent(importerDraft) && !isDraftExpired(importerDraft);
  // Single source of truth for open/close state so "Ẩn khung tải đề" / "Đóng" always works cleanly
  const showImporter = Boolean(importerDraft?.isOpen || isImporterBusy);

  useEffect(() => {
    pruneExpired(level);
  }, [level, pruneExpired]);

  useEffect(() => {
    if (defaultOpenImporter) {
      setImporterOpen(level, true);
      onConsumedImportParam?.();
    }
  }, [defaultOpenImporter, level, setImporterOpen, onConsumedImportParam]);

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'start'; mode: OfficialExamMode }
    | { type: 'resume' }
    | { type: 'history'; attempt: LocalOfficialExamAttempt }
    | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<OfficialExamSummary | null>(null);

  const { data: exams = [], isLoading } = useExamsByLevel(level);
  const { data: activeExamDetail, isFetching: isLoadingDetail } = useExamDetail(selectedExamId);
  const deleteMutation = useDeleteExamMutation(level);

  const session = useOfficialExamSession(level, activeExamDetail || null);

  useEffect(() => {
    onSessionActiveChange?.(session.phase !== 'idle');
  }, [session.phase, onSessionActiveChange]);

  useEffect(() => {
    if (!pendingAction || !activeExamDetail || activeExamDetail.id !== selectedExamId) return;
    if (pendingAction.type === 'start') {
      session.startExam(activeExamDetail, pendingAction.mode, pendingAction.mode === 'full');
    } else if (pendingAction.type === 'resume') {
      session.resumeDraft(activeExamDetail);
    } else if (pendingAction.type === 'history') {
      session.openHistoryAttempt(activeExamDetail, pendingAction.attempt);
    }
    setPendingAction(null);
  }, [pendingAction, activeExamDetail, selectedExamId, session]);

  const launchExam = (examId: string, mode: OfficialExamMode) => {
    if (isImporterBusy) return;
    setSelectedExamId(examId);
    setPendingAction({ type: 'start', mode });
  };

  const launchResume = (examId: string) => {
    if (isImporterBusy) return;
    setSelectedExamId(examId);
    setPendingAction({ type: 'resume' });
  };

  const launchHistory = (attempt: LocalOfficialExamAttempt) => {
    if (isImporterBusy) return;
    setSelectedExamId(attempt.examId);
    setPendingAction({ type: 'history', attempt });
  };

  if (session.phase === 'taking' && activeExamDetail) {
    return (
      <OfficialExamTakingView
        meta={meta}
        exam={activeExamDetail}
        mode={session.mode}
        strictAudio={session.strictAudio}
        activeSection={session.activeSection}
        answers={session.answers}
        flagged={session.flagged}
        elapsedSeconds={session.elapsedSeconds}
        remainingSeconds={session.remainingSeconds}
        initialAudioTimeSec={session.initialAudioTimeSec}
        answeredCount={session.answeredCount}
        totalCount={session.totalCount}
        unansweredCount={session.unansweredCount}
        flaggedCount={session.flaggedCount}
        confirmModal={session.confirmModal}
        onChangeSection={session.setActiveSection}
        onToggleStrictAudio={() => session.setStrictAudio((prev) => !prev)}
        onUpdateAnswer={session.updateAnswer}
        onToggleFlag={session.toggleFlag}
        onAudioTimeUpdate={session.reportAudioTime}
        onRequestSubmit={() => session.setConfirmModal('submit')}
        onConfirmSubmit={() => session.finishAndGrade(false)}
        onRequestExit={() => session.setConfirmModal('exit')}
        onConfirmExit={session.confirmExit}
        onCloseConfirmModal={() => session.setConfirmModal(null)}
      />
    );
  }

  if (session.phase === 'result' && session.gradeResult && activeExamDetail) {
    return (
      <OfficialExamResultView
        meta={meta}
        exam={activeExamDetail}
        gradeResult={session.gradeResult}
        elapsedSeconds={session.elapsedSeconds}
        isViewingHistory={session.isViewingHistory}
        onRetake={() => session.startExam(activeExamDetail, session.mode, session.mode === 'full')}
        onBackToList={session.backToList}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Import Trigger */}
      <Card padding="lg" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="dark" size="sm">
              {meta.code} · BỘ ĐỀ THI CHUẨN
            </Badge>
            <Badge variant="mint" size="sm">
              {exams.length} bộ đề
            </Badge>
          </div>
          <h2 className="font-serif font-black text-2xl text-[#141414]">
            Đề thi chuẩn {meta.code} (Nghe · Đọc · Viết)
          </h2>
          <p className="text-xs sm:text-sm text-[#57534E] mt-0.5">
            Tải bộ 4 file chuẩn HSK (PDF Đề + Đáp án + Kịch bản nghe + Audio MP3) để thi mô phỏng
            300 điểm hoặc luyện từng kỹ năng.
          </p>
        </div>

        <Button
          variant={showImporter ? 'default' : 'yellow'}
          disabled={isImporterBusy}
          leftIcon={<FilePlus2 className="w-4 h-4" />}
          onClick={() => setImporterOpen(level, !showImporter)}
        >
          {showImporter
            ? 'Ẩn khung tải đề'
            : hasValidDraft
              ? 'Tiếp tục nhập bộ đề đang dở (nháp 15p)'
              : 'Nhập bộ đề HSK (PDF + MP3)'}
        </Button>
      </Card>

      {/* 4-File Bundle Importer */}
      {showImporter && (
        <ExamBundleImporter
          level={level}
          onImported={() => setImporterOpen(level, false)}
          onCancel={() => setImporterOpen(level, false)}
        />
      )}

      {pendingAction && isLoadingDetail && (
        <Card
          padding="md"
          className="flex items-center justify-center gap-2 font-mono text-xs font-bold text-[#141414]"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang mở bộ đề thi...
        </Card>
      )}

      {/* Uploaded Exam Cards */}
      {isLoading ? (
        <Card padding="lg" className="text-center font-mono text-xs text-[#57534E]">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Đang tải danh sách bộ đề {meta.code}...
        </Card>
      ) : exams.length === 0 ? (
        <EmptyState
          title={`Chưa có bộ đề thi chuẩn nào cho ${meta.code}`}
          description="Bấm nút “Nhập bộ đề HSK (PDF + MP3)” ở trên và kéo thả cùng lúc 4 file (Đề PDF, Đáp án PDF, Kịch bản nghe PDF, Audio MP3) để tạo đề thi đầu tiên."
          actions={
            !showImporter && (
              <Button
                variant="yellow"
                disabled={isImporterBusy}
                leftIcon={<FilePlus2 className="w-4 h-4" />}
                onClick={() => setImporterOpen(level, true)}
              >
                Nhập bộ đề đầu tiên
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {exams.map((exam) => {
            const draft = session.draftsByExamId[exam.id] || null;
            const draftAnswered = draft ? Object.keys(draft.answers || {}).length : 0;
            const lCount = exam.sectionCounts?.listening || 0;
            const rCount = exam.sectionCounts?.reading || 0;
            const wCount = exam.sectionCounts?.writing || 0;

            return (
              <Card key={exam.id} padding="md" className="flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="dark" size="sm">
                        {exam.code}
                      </Badge>
                      <Badge variant="subtle" size="sm">
                        {exam.totalQuestions} câu · {exam.totalDurationMin} phút
                      </Badge>
                      {exam.audioUrl && (
                        <Badge variant="mint" size="sm">
                          <Cloud className="w-3 h-3" />
                          MP3 {exam.audioDurationSec ? formatTimer(exam.audioDurationSec) : ''}
                        </Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isImporterBusy}
                      onClick={() => setDeleteTarget(exam)}
                      className="p-1.5 rounded border border-transparent hover:border-[#D9468F] text-[#57534E] hover:text-[#BE185D] disabled:opacity-40 disabled:pointer-events-none"
                      title="Xóa bộ đề này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-serif font-black text-lg text-[#141414]">{exam.title}</h3>
                    {exam.description && (
                      <p className="text-xs text-[#57534E] mt-0.5">{exam.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-xs text-[#141414]">
                    <div className="rounded border border-[#141414]/20 bg-[#F8F6F1] px-2.5 py-1.5 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                      <span>Nghe: {lCount}</span>
                    </div>
                    <div className="rounded border border-[#141414]/20 bg-[#F8F6F1] px-2.5 py-1.5 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                      <span>Đọc: {rCount}</span>
                    </div>
                    <div className="rounded border border-[#141414]/20 bg-[#F8F6F1] px-2.5 py-1.5 flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                      <span>Viết: {wCount}</span>
                    </div>
                  </div>

                  {draft && (
                    <div className="rounded-xl border-2 border-[#141414] bg-[#EFE078]/40 p-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-[#141414]">
                        <strong>Đang làm dở</strong> ({MODE_LABELS[draft.mode]} · {draftAnswered}{' '}
                        câu đã làm)
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="default"
                          size="sm"
                          disabled={isImporterBusy}
                          onClick={() => session.discardDraft(exam.id)}
                        >
                          Bỏ nháp
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isImporterBusy}
                          leftIcon={<RotateCcw className="w-3 h-3" />}
                          onClick={() => launchResume(exam.id)}
                        >
                          Làm tiếp
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Launch Controls */}
                <div className="space-y-2 pt-2 border-t border-[#141414]/15">
                  <Button
                    variant="yellow"
                    className="w-full"
                    disabled={isImporterBusy}
                    leftIcon={<Play className="w-4 h-4" />}
                    onClick={() => launchExam(exam.id, 'full')}
                  >
                    Thi thử chuẩn HSK (Full {exam.totalQuestions} câu · {exam.totalDurationMin}p)
                  </Button>
                  <div className="grid grid-cols-3 gap-1.5">
                    {lCount > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isImporterBusy}
                        onClick={() => launchExam(exam.id, 'listening')}
                      >
                        Luyện Nghe
                      </Button>
                    )}
                    {rCount > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isImporterBusy}
                        onClick={() => launchExam(exam.id, 'reading')}
                      >
                        Luyện Đọc
                      </Button>
                    )}
                    {wCount > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isImporterBusy}
                        onClick={() => launchExam(exam.id, 'writing')}
                      >
                        Luyện Viết
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Local Exam History */}
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#141414]" />
            <h3 className="font-serif font-black text-base text-[#141414]">
              Lịch sử thi thử chuẩn {meta.code} ({session.history.length})
            </h3>
          </div>
          {session.history.length > 0 && (
            <Button
              variant="default"
              size="sm"
              disabled={isImporterBusy}
              onClick={session.handleClearHistory}
            >
              Xóa lịch sử
            </Button>
          )}
        </div>

        {session.history.length === 0 ? (
          <p className="text-xs font-mono text-[#57534E]">
            Chưa có lượt thi chuẩn nào cho {meta.code}. Toàn bộ lịch sử &amp; bài luận được lưu cục
            bộ trên trình duyệt.
          </p>
        ) : (
          <div className="space-y-2">
            {session.history.map((att) => (
              <button
                key={att.id}
                type="button"
                disabled={isImporterBusy}
                onClick={() => launchHistory(att)}
                className="w-full text-left rounded-xl border-2 border-[#141414]/20 hover:border-[#141414] bg-[#F8F6F1]/60 hover:bg-[#F8F6F1] p-3 flex flex-wrap items-center justify-between gap-3 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="dark" size="sm">
                      {att.examCode}
                    </Badge>
                    <span className="font-bold text-sm text-[#141414]">
                      {MODE_LABELS[att.mode]}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#57534E] mt-1 flex flex-wrap items-center gap-2.5">
                    <span>{formatAttemptDate(att.completedAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTimer(att.elapsedSeconds)}
                    </span>
                    <span>
                      Đúng {att.autoCorrectCount}/{att.autoTotalCount}
                    </span>
                  </div>
                </div>
                <Badge variant={att.passed ? 'mint' : 'pink'} size="sm">
                  <Trophy className="w-3 h-3" /> {att.totalScore}/{att.maxScore}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Confirm Delete Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa bộ đề thi?"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#141414]">
            Xóa bộ đề <strong>{deleteTarget?.title}</strong> sẽ xóa toàn bộ {deleteTarget?.totalQuestions}{' '}
            câu hỏi trong MongoDB và dọn sạch file MP3 / ảnh + thư mục con trên Cloudinary.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="pink"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteMutation.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
