import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Headphones,
  RotateCcw,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { formatTimer } from '@/features/exercises/utils/exam-utils';
import { speakChinese } from '@/lib/speech-utils';
import type { CourseMeta } from '@/types';
import type { ExamSectionKey, OfficialExam } from '../api/exams.api';
import {
  getOptionTextByLetter,
  MODE_LABELS,
  type OfficialExamGradeResult,
  SECTION_LABELS,
} from '../utils/official-exam-grading';

export interface OfficialExamResultViewProps {
  meta: CourseMeta;
  exam: OfficialExam;
  gradeResult: OfficialExamGradeResult;
  elapsedSeconds: number;
  isViewingHistory: boolean;
  onRetake: () => void;
  onBackToList: () => void;
}

type StatusFilter = 'all' | 'wrong' | 'correct' | 'unanswered';

export const OfficialExamResultView: React.FC<OfficialExamResultViewProps> = ({
  meta,
  exam,
  gradeResult,
  elapsedSeconds,
  isViewingHistory,
  onRetake,
  onBackToList,
}) => {
  const [sectionFilter, setSectionFilter] = useState<'all' | ExamSectionKey>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedPassages, setExpandedPassages] = useState<Record<string, boolean>>({});

  const filteredItems = useMemo(() => {
    return gradeResult.items.filter((it) => {
      if (sectionFilter !== 'all' && it.flat.sectionKey !== sectionFilter) return false;
      if (statusFilter === 'wrong') return !it.isSelfCheck && !it.isCorrect;
      if (statusFilter === 'correct') return !it.isSelfCheck && it.isCorrect;
      if (statusFilter === 'unanswered') return it.isUnanswered;
      return true;
    });
  }, [gradeResult.items, sectionFilter, statusFilter]);

  const togglePassage = (key: string) => {
    setExpandedPassages((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="space-y-5">
      {/* Top Scorecard */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="default"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={onBackToList}
          >
            Danh sách đề {meta.code}
          </Button>
          <div className="flex flex-wrap items-center gap-1.5">
            {isViewingHistory && (
              <Badge variant="lavender" size="sm">
                XEM LẠI LỊCH SỬ
              </Badge>
            )}
            <Badge variant={gradeResult.passed ? 'mint' : 'pink'} size="sm">
              {gradeResult.passed
                ? `ĐẠT CHUẨN (≥ ${gradeResult.passScore}/${gradeResult.maxScore})`
                : `CHƯA ĐẠT (cần ≥ ${gradeResult.passScore}/${gradeResult.maxScore})`}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-[#57534E] uppercase">
              {exam.code} · {MODE_LABELS[gradeResult.mode]}
            </p>
            <h2 className="font-serif font-black text-2xl sm:text-3xl text-[#141414] mt-0.5">
              {exam.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 font-mono text-xs text-[#57534E]">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Thời gian: {formatTimer(elapsedSeconds)}
              </span>
              <span>
                Tự chấm đúng:{' '}
                <strong className="text-[#141414]">
                  {gradeResult.autoCorrectCount}/{gradeResult.autoTotalCount}
                </strong>
              </span>
              {gradeResult.essayCount > 0 && (
                <span>
                  Đoạn văn tự luận: {gradeResult.essayCount} câu (ước lượng từ khóa &amp; độ dài)
                </span>
              )}
            </div>
          </div>

          <div
            className={`rounded-xl border-2 border-[#141414] px-6 py-4 text-center shadow-[3px_3px_0px_#141414] ${
              gradeResult.passed ? 'bg-[#CBEAD8]' : 'bg-[#EFE078]'
            }`}
          >
            <div className="font-mono text-[11px] font-bold uppercase text-[#141414] flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Tổng điểm HSK
            </div>
            <div className="font-serif font-black text-4xl text-[#141414] leading-none mt-1">
              {gradeResult.totalScore}
              <span className="text-lg font-mono font-bold text-[#141414]/70">
                /{gradeResult.maxScore}
              </span>
            </div>
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {gradeResult.sections.map((sec) => (
            <div
              key={sec.key}
              className="rounded-xl border-2 border-[#141414] bg-[#F8F6F1] p-3 flex items-center justify-between gap-2"
            >
              <div>
                <div className="font-bold text-sm text-[#141414]">{SECTION_LABELS[sec.key]}</div>
                <div className="font-mono text-[11px] text-[#57534E] mt-0.5">
                  Đúng {sec.correctCount}/{sec.autoGradedTotal} · Sai {sec.wrongCount}
                  {sec.essayCount > 0 ? ` · Bài viết ${sec.essayCount}` : ''}
                </div>
              </div>
              <div className="font-mono text-2xl font-black text-[#141414]">
                {sec.score100}
                <span className="text-xs font-normal text-[#57534E]">/100</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="yellow"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={onRetake}
          >
            Làm lại bộ đề này
          </Button>
          <Button variant="default" onClick={onBackToList}>
            Chọn đề khác
          </Button>
        </div>
      </Card>

      {/* Full Free-Seek Audio Player for Review */}
      {exam.audioUrl && (
        <Card padding="sm" className="bg-[#F8F6F1] flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#141414]">
            <Headphones className="w-4 h-4" />
            <span>Nghe lại audio toàn bộ đề (tự do tua):</span>
          </div>
          <audio src={exam.audioUrl} controls className="flex-1 min-w-[240px] h-9" />
        </Card>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: `Tất cả (${gradeResult.items.length})` },
              {
                id: 'wrong',
                label: `Sai / Chưa đúng (${gradeResult.items.filter((i) => !i.isSelfCheck && !i.isCorrect).length})`,
              },
              {
                id: 'correct',
                label: `Đúng (${gradeResult.autoCorrectCount})`,
              },
              {
                id: 'unanswered',
                label: `Bỏ trống (${gradeResult.items.filter((i) => i.isUnanswered).length})`,
              },
            ] as Array<{ id: StatusFilter; label: string }>
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-full border-2 font-mono text-xs font-bold ${
                statusFilter === f.id
                  ? 'border-[#111111] bg-[#111111] text-[#EFE078]'
                  : 'border-[#141414]/25 bg-white text-[#141414] hover:border-[#141414]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {gradeResult.sections.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', ...gradeResult.sections.map((s) => s.key)] as const).map((secKey) => (
              <button
                key={secKey}
                type="button"
                onClick={() => setSectionFilter(secKey)}
                className={`px-2.5 py-1 rounded-full border-2 font-mono text-xs font-bold ${
                  sectionFilter === secKey
                    ? 'border-[#141414] bg-[#EFE078] text-[#141414]'
                    : 'border-[#141414]/25 bg-white text-[#141414] hover:border-[#141414]'
                }`}
              >
                {secKey === 'all' ? 'Tất cả phần' : SECTION_LABELS[secKey]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Question Review List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const { flat } = item;
          const q = flat.question;
          const transcript = q.transcript || flat.groupTranscript;
          const passageKey = `${flat.groupId}-${q.number}`;
          const isPassageOpen = Boolean(expandedPassages[passageKey]);

          return (
            <Card
              key={q.number}
              padding="md"
              className={`space-y-3 ${
                item.isSelfCheck
                  ? 'border-[#141414]'
                  : item.isCorrect
                    ? 'border-[#141414] bg-[#CBEAD8]/15'
                    : 'border-[#141414] bg-[#F4C2D7]/15'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={item.isSelfCheck ? 'lavender' : item.isCorrect ? 'mint' : 'pink'}
                    size="sm"
                  >
                    {item.isSelfCheck ? (
                      'Tự luận'
                    ) : item.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Đúng
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> {item.isUnanswered ? 'Bỏ trống' : 'Sai'}
                      </>
                    )}
                  </Badge>
                  <Badge variant="dark" size="sm">
                    Câu {q.number}
                  </Badge>
                  <span className="font-mono text-[11px] text-[#57534E]">
                    {SECTION_LABELS[flat.sectionKey]} · {flat.partTitle}
                  </span>
                </div>

                {(transcript || q.correctAnswer) && (
                  <button
                    type="button"
                    onClick={() =>
                      speakChinese(
                        transcript ||
                          (item.isMcq
                            ? getOptionTextByLetter(q, q.correctAnswer)
                            : q.correctAnswer),
                      )
                    }
                    className="px-2.5 py-1 rounded-full border border-[#141414]/35 bg-white hover:border-[#141414] font-mono text-[11px] font-bold text-[#141414] inline-flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Đọc mẫu
                  </button>
                )}
              </div>

              {q.prompt && (
                <p className="font-serifcn text-base text-[#141414] font-semibold leading-relaxed">
                  {q.prompt}
                </p>
              )}

              {flat.groupPassage && (
                <div>
                  <button
                    type="button"
                    onClick={() => togglePassage(passageKey)}
                    className="font-mono text-xs font-bold text-[#141414] underline underline-offset-2 inline-flex items-center gap-1"
                  >
                    {isPassageOpen ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Ẩn đoạn văn ({flat.groupRangeLabel})
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> Xem lại đoạn văn (
                        {flat.groupRangeLabel})
                      </>
                    )}
                  </button>
                  {isPassageOpen && (
                    <div className="mt-2 rounded-xl border border-[#141414]/25 bg-[#F8F6F1] p-3 font-serifcn text-sm leading-7 text-[#141414] whitespace-pre-line">
                      {flat.groupPassage}
                    </div>
                  )}
                </div>
              )}

              {item.isMcq && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(q.options || []).map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isExp = q.correctAnswer.toUpperCase() === letter;
                    const isUser = item.userAnswer.toUpperCase() === letter;
                    return (
                      <div
                        key={letter}
                        className={`px-3 py-2 rounded-xl border-2 text-sm flex items-start gap-2 ${
                          isExp
                            ? 'border-[#141414] bg-[#CBEAD8]/60 font-bold text-[#141414]'
                            : isUser && !isExp
                              ? 'border-[#D9468F] bg-[#F4C2D7]/35 text-[#141414] line-through'
                              : 'border-[#141414]/15 bg-white text-[#57534E]'
                        }`}
                      >
                        <span className="font-mono font-black">{letter}.</span>
                        <span className="font-serifcn">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {transcript && (
                <div className="rounded-xl border-2 border-[#141414]/25 bg-[#EFE078]/25 p-3 space-y-1">
                  <div className="font-mono text-[10px] font-bold uppercase text-[#57534E]">
                    🎧 Kịch bản bài nghe (Transcript)
                  </div>
                  <p className="font-serifcn text-sm leading-7 text-[#141414] whitespace-pre-line">
                    {transcript}
                  </p>
                </div>
              )}

              {flat.questionFormat === 'writing_reorder' && (
                <div className="space-y-2 text-sm">
                  <div className="rounded-xl border border-[#141414]/25 bg-white p-2.5">
                    <span className="font-mono text-[11px] text-[#57534E] block mb-1">
                      Câu bạn ghép:
                    </span>
                    {item.isUnanswered ? (
                      <span className="italic text-[#57534E]">(Chưa trả lời)</span>
                    ) : item.diffSegments ? (
                      <div className="font-serifcn text-base tracking-wide">
                        {item.diffSegments.map((seg, i) => (
                          <span
                            key={i}
                            className={
                              seg.matched
                                ? 'bg-[#CBEAD8]/60 text-[#141414] px-0.5 rounded'
                                : 'bg-[#F4C2D7]/55 text-[#141414] underline decoration-[#D9468F] px-0.5 rounded'
                            }
                          >
                            {seg.char}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-serifcn text-base font-bold text-[#141414]">
                        {item.userAnswer}
                      </span>
                    )}
                  </div>
                  {q.correctAnswer && (
                    <div className="rounded-xl border-2 border-[#141414] bg-[#CBEAD8]/40 p-2.5">
                      <span className="font-mono text-[11px] text-[#57534E] block mb-0.5">
                        Đáp án chuẩn (答案.pdf):
                      </span>
                      <span className="font-serifcn text-base font-bold text-[#141414]">
                        {q.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {(flat.questionFormat === 'writing_keywords' ||
                flat.questionFormat === 'writing_picture') && (
                <div className="space-y-2.5">
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt={`Ảnh câu ${q.number}`}
                      className="max-h-52 rounded-xl border-2 border-[#141414] bg-white"
                    />
                  )}
                  {q.keywords && q.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {q.keywords.map((kw) => {
                        const hit = item.matchedKeywords?.includes(kw);
                        return (
                          <Badge key={kw} variant={hit ? 'mint' : 'pink'} size="sm">
                            {hit ? '✓' : '✗'} {kw}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <div className="rounded-xl border-2 border-[#141414]/25 bg-[#F8F6F1] p-3">
                    <div className="flex items-center justify-between font-mono text-[11px] text-[#57534E] mb-1">
                      <span>Bài viết của bạn</span>
                      <strong className="text-[#141414]">
                        {item.hanziCount || 0} / ~{q.minChars || 80} 字
                      </strong>
                    </div>
                    <p className="font-serifcn text-base leading-7 text-[#141414] whitespace-pre-wrap">
                      {item.userAnswer || '(Chưa viết bài)'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
};
