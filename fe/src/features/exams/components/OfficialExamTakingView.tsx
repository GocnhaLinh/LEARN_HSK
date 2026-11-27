import {
  CheckCircle2,
  Clock,
  Flag,
  Headphones,
  Lock,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  Send,
  Unlock,
  Volume2,
  VolumeX,
  ZoomIn,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Input, Modal, ProgressBar, Textarea } from '@/components/ui';
import { formatTimer, OPTION_LETTERS } from '@/features/exercises/utils/exam-utils';
import type { CourseMeta } from '@/types';
import type {
  ExamQuestionFormat,
  ExamQuestionGroup,
  ExamQuestionItem,
  ExamSectionKey,
  OfficialExam,
  OfficialExamMode,
} from '@/features/exams/types';
import {
  countHanziChars,
  getActiveSectionsForMode,
  MODE_LABELS,
  SECTION_LABELS,
} from '../utils/official-exam-grading';

export interface OfficialExamTakingViewProps {
  meta: CourseMeta;
  exam: OfficialExam;
  mode: OfficialExamMode;
  strictAudio: boolean;
  activeSection: ExamSectionKey;
  answers: Record<number, string>;
  flagged: Record<number, boolean>;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  initialAudioTimeSec: number;
  answeredCount: number;
  totalCount: number;
  unansweredCount: number;
  flaggedCount: number;
  confirmModal: 'submit' | 'exit' | null;
  onChangeSection: (key: ExamSectionKey) => void;
  onToggleStrictAudio: () => void;
  onUpdateAnswer: (questionNumber: number, value: string) => void;
  onToggleFlag: (questionNumber: number) => void;
  onAudioTimeUpdate: (sec: number) => void;
  onRequestSubmit: () => void;
  onConfirmSubmit: () => void;
  onRequestExit: () => void;
  onConfirmExit: () => void;
  onCloseConfirmModal: () => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25] as const;

// ---------------------------------------------------------------------------
// Isolated Persistent Audio Player (owns high-frequency timeupdate state so
// the 45-100 question cards NEVER re-render while audio is playing!)
// ---------------------------------------------------------------------------
interface StickyAudioPlayerProps {
  audioUrl: string;
  initialAudioTimeSec: number;
  defaultDurationSec: number;
  strictAudio: boolean;
  isListeningSection: boolean;
  onToggleStrictAudio: () => void;
  onAudioTimeUpdate: (sec: number) => void;
}

const StickyAudioPlayer: React.FC<StickyAudioPlayerProps> = React.memo(
  ({
    audioUrl,
    initialAudioTimeSec,
    defaultDurationSec,
    strictAudio,
    isListeningSection,
    onToggleStrictAudio,
    onAudioTimeUpdate,
  }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const restoredRef = useRef(false);
    const lastReportedSecRef = useRef(-1);

    const [isPlaying, setIsPlaying] = useState(false);
    const [audioCurrent, setAudioCurrent] = useState(initialAudioTimeSec || 0);
    const [audioDuration, setAudioDuration] = useState(defaultDurationSec || 0);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [isMuted, setIsMuted] = useState(false);
    const [audioEndedOnce, setAudioEndedOnce] = useState(false);

    useEffect(() => {
      const el = audioRef.current;
      if (!el || restoredRef.current || !initialAudioTimeSec) return;
      const onLoaded = () => {
        if (
          !restoredRef.current &&
          initialAudioTimeSec > 0 &&
          Number.isFinite(el.duration) &&
          initialAudioTimeSec < el.duration
        ) {
          el.currentTime = initialAudioTimeSec;
          setAudioCurrent(initialAudioTimeSec);
        }
        restoredRef.current = true;
      };
      el.addEventListener('loadedmetadata', onLoaded);
      return () => el.removeEventListener('loadedmetadata', onLoaded);
    }, [initialAudioTimeSec]);

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
      }
    }, [playbackRate]);

    const flushAudioPosition = useCallback(
      (rawSec: number) => {
        const sec = Math.max(0, Math.floor(rawSec));
        lastReportedSecRef.current = sec;
        onAudioTimeUpdate(sec);
      },
      [onAudioTimeUpdate],
    );

    const togglePlay = async () => {
      const el = audioRef.current;
      if (!el) return;
      if (strictAudio && audioEndedOnce) return;
      if (el.paused) {
        try {
          await el.play();
        } catch {
          // Ignore browser autoplay policy error
        }
      } else {
        el.pause();
      }
    };

    const seekBy = (deltaSec: number) => {
      const el = audioRef.current;
      if (!el || strictAudio) return;
      const next = Math.max(
        0,
        Math.min(el.duration || audioDuration || 0, el.currentTime + deltaSec),
      );
      el.currentTime = next;
      setAudioCurrent(next);
      flushAudioPosition(next);
    };

    const seekTo = (sec: number) => {
      const el = audioRef.current;
      if (!el || strictAudio) return;
      el.currentTime = sec;
      setAudioCurrent(sec);
      flushAudioPosition(sec);
    };

    const showBar = isListeningSection || isPlaying;

    return (
      <>
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={(e) => {
            setIsPlaying(false);
            flushAudioPosition(e.currentTarget.currentTime);
          }}
          onEnded={(e) => {
            setIsPlaying(false);
            setAudioEndedOnce(true);
            flushAudioPosition(e.currentTarget.currentTime);
          }}
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (Number.isFinite(dur) && dur > 0) setAudioDuration(Math.round(dur));
          }}
          onTimeUpdate={(e) => {
            const cur = e.currentTarget.currentTime;
            setAudioCurrent(cur);
            const sec = Math.floor(cur);
            // Report at most once every 5 distinct seconds (never 4x within the same second)
            if (sec % 5 === 0 && sec !== lastReportedSecRef.current) {
              lastReportedSecRef.current = sec;
              onAudioTimeUpdate(sec);
            }
          }}
        />

        {showBar && (
          <div className="rounded-xl border-2 border-[#141414] bg-[#EFE078]/35 px-3 py-2 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={togglePlay}
              disabled={strictAudio && audioEndedOnce}
              className="w-9 h-9 rounded-full border-2 border-[#111111] bg-[#111111] text-[#EFE078] flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40"
              title={isPlaying ? 'Tạm dừng' : 'Phát bài nghe'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {!strictAudio && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  className="px-2 py-1 rounded border border-[#141414]/40 bg-white font-mono text-[11px] font-bold text-[#141414] hover:border-[#141414]"
                >
                  -10s
                </button>
                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  className="px-2 py-1 rounded border border-[#141414]/40 bg-white font-mono text-[11px] font-bold text-[#141414] hover:border-[#141414]"
                >
                  +10s
                </button>
              </div>
            )}

            <div className="flex-1 min-w-[160px] flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-[#141414] shrink-0">
                {formatTimer(Math.floor(audioCurrent))}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(1, audioDuration)}
                value={Math.min(audioCurrent, Math.max(1, audioDuration))}
                disabled={strictAudio}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="w-full accent-[#111111] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="font-mono text-[11px] text-[#57534E] shrink-0">
                {formatTimer(audioDuration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {!strictAudio && (
                <div className="flex items-center rounded border border-[#141414]/40 overflow-hidden bg-white">
                  {SPEED_OPTIONS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setPlaybackRate(sp)}
                      className={`px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                        playbackRate === sp
                          ? 'bg-[#111111] text-[#EFE078]'
                          : 'text-[#141414] hover:bg-[#F8F6F1]'
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="p-1.5 rounded border border-[#141414]/40 bg-white text-[#141414] hover:border-[#141414]"
                title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onToggleStrictAudio}
                className={`px-2 py-1 rounded border-2 font-mono text-[10px] font-bold inline-flex items-center gap-1 ${
                  strictAudio
                    ? 'border-[#111111] bg-[#111111] text-[#EFE078]'
                    : 'border-[#141414]/40 bg-white text-[#141414] hover:border-[#141414]'
                }`}
                title="Bật/tắt chế độ thi thật (khóa tua audio)"
              >
                {strictAudio ? (
                  <>
                    <Lock className="w-3 h-3" /> Thi thật
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" /> Tự do tua
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </>
    );
  },
);

StickyAudioPlayer.displayName = 'StickyAudioPlayer';

// ---------------------------------------------------------------------------
// Memoized MCQ Options Grid & Question Cards (zero re-render on timer ticks!)
// ---------------------------------------------------------------------------
interface McqOptionsGridProps {
  question: ExamQuestionItem;
  selectedLetter: string;
  onSelect: (questionNumber: number, letter: string) => void;
}

const McqOptionsGrid: React.FC<McqOptionsGridProps> = React.memo(
  ({ question, selectedLetter, onSelect }) => {
    const chosen = selectedLetter.toUpperCase();
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(question.options || []).map((opt, idx) => {
          const letter = OPTION_LETTERS[idx] || String.fromCharCode(65 + idx);
          const isSelected = chosen === letter;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => onSelect(question.number, letter)}
              className={`text-left px-3 py-2.5 rounded-xl border-2 flex items-start gap-2.5 transition-all ${
                isSelected
                  ? 'border-[#141414] bg-[#EFE078] shadow-[2px_2px_0px_#141414] font-bold text-[#141414]'
                  : 'border-[#141414]/25 bg-white hover:border-[#141414] hover:bg-[#F8F6F1] text-[#141414]'
              }`}
            >
              <span
                className={`shrink-0 w-6 h-6 rounded-full border-2 font-mono text-xs font-black flex items-center justify-center ${
                  isSelected
                    ? 'border-[#111111] bg-[#111111] text-[#EFE078]'
                    : 'border-[#141414]/40 bg-[#F8F6F1] text-[#141414]'
                }`}
              >
                {letter}
              </span>
              <span className="font-serifcn text-sm sm:text-base leading-snug pt-0.5">{opt}</span>
            </button>
          );
        })}
      </div>
    );
  },
);

McqOptionsGrid.displayName = 'McqOptionsGrid';

interface WordTileBuilderProps {
  question: ExamQuestionItem;
  value: string;
  onChange: (val: string) => void;
}

const WordTileBuilder: React.FC<WordTileBuilderProps> = React.memo(
  ({ question, value, onChange }) => {
    const tiles = question.wordTiles || [];
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    useEffect(() => {
      if (!value.trim() && selectedIndices.length > 0) {
        setSelectedIndices([]);
      }
    }, [value, selectedIndices.length]);

    const handlePickTile = (idx: number) => {
      const next = selectedIndices.includes(idx)
        ? selectedIndices.filter((i) => i !== idx)
        : [...selectedIndices, idx];
      setSelectedIndices(next);
      onChange(next.map((i) => tiles[i]).join(''));
    };

    const handleReset = () => {
      setSelectedIndices([]);
      onChange('');
    };

    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-2">
          {tiles.map((tile, idx) => {
            const pickedPos = selectedIndices.indexOf(idx);
            const isPicked = pickedPos !== -1;
            return (
              <button
                key={`${question.number}-${idx}`}
                type="button"
                onClick={() => handlePickTile(idx)}
                className={`px-3 py-1.5 rounded-xl border-2 font-serifcn text-base font-bold transition-all ${
                  isPicked
                    ? 'border-[#141414] bg-[#CBEAD8] text-[#141414] shadow-[2px_2px_0px_#141414] -translate-y-0.5'
                    : 'border-[#141414]/40 bg-[#F8F6F1] hover:border-[#141414] hover:bg-[#EFE078]/40 text-[#141414]'
                }`}
              >
                {isPicked && (
                  <span className="inline-block mr-1.5 font-mono text-[10px] bg-[#111111] text-[#EFE078] rounded-full w-4 h-4 leading-4 text-center">
                    {pickedPos + 1}
                  </span>
                )}
                {tile}
              </button>
            );
          })}
          {value && (
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-xl border-2 border-[#141414]/25 bg-white hover:border-[#141414] text-xs font-mono font-bold text-[#57534E] hover:text-[#141414] inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Làm lại
            </button>
          )}
        </div>

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Bấm các thẻ từ phía trên hoặc gõ câu tiếng Trung hoàn chỉnh..."
          className="font-serifcn text-base"
        />
      </div>
    );
  },
);

WordTileBuilder.displayName = 'WordTileBuilder';

interface OfficialQuestionCardProps {
  question: ExamQuestionItem;
  format: ExamQuestionFormat;
  value: string;
  isFlagged: boolean;
  onUpdateAnswer: (questionNumber: number, value: string) => void;
  onToggleFlag: (questionNumber: number) => void;
  onZoomImage: (url: string) => void;
}

const OfficialQuestionCard: React.FC<OfficialQuestionCardProps> = React.memo(
  ({ question: q, format, value, isFlagged, onUpdateAnswer, onToggleFlag, onZoomImage }) => {
    const hanziCount =
      format === 'writing_keywords' || format === 'writing_picture' ? countHanziChars(value) : 0;

    return (
      <Card id={`official-q-${q.number}`} padding="md" className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="dark" size="sm">
              Câu {q.number}
            </Badge>
            {value.trim() && (
              <Badge variant="mint" size="sm">
                <CheckCircle2 className="w-3 h-3" /> Đã làm
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => onToggleFlag(q.number)}
            className={`px-2 py-0.5 rounded-full border font-mono text-[11px] font-bold inline-flex items-center gap-1 ${
              isFlagged
                ? 'border-[#141414] bg-[#EFE078] text-[#141414]'
                : 'border-[#141414]/25 text-[#57534E] hover:border-[#141414] hover:text-[#141414]'
            }`}
          >
            <Flag className="w-3 h-3" />
            {isFlagged ? 'Đã đánh dấu' : 'Đánh dấu'}
          </button>
        </div>

        {format === 'listening_mcq' && (
          <McqOptionsGrid question={q} selectedLetter={value} onSelect={onUpdateAnswer} />
        )}

        {format === 'reading_short' && (
          <>
            {q.prompt && (
              <p className="font-serifcn text-base leading-8 text-[#141414] bg-[#F8F6F1] rounded-xl border border-[#141414]/20 p-3.5 indent-6">
                {q.prompt}
              </p>
            )}
            <McqOptionsGrid question={q} selectedLetter={value} onSelect={onUpdateAnswer} />
          </>
        )}

        {format === 'writing_reorder' && (
          <WordTileBuilder
            question={q}
            value={value}
            onChange={(nextVal) => onUpdateAnswer(q.number, nextVal)}
          />
        )}

        {format === 'writing_keywords' && (
          <div className="space-y-3">
            {q.prompt && <p className="font-serifcn text-sm font-bold text-[#141414]">{q.prompt}</p>}
            {q.keywords && q.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {q.keywords.map((kw) => {
                  const used = value.includes(kw);
                  return (
                    <span
                      key={kw}
                      className={`px-3 py-1 rounded-full border-2 font-serifcn text-sm font-bold inline-flex items-center gap-1.5 transition-colors ${
                        used
                          ? 'border-[#141414] bg-[#CBEAD8] text-[#141414]'
                          : 'border-[#141414]/35 bg-[#F8F6F1] text-[#141414]'
                      }`}
                    >
                      {used && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {kw}
                    </span>
                  );
                })}
              </div>
            )}
            <Textarea
              rows={6}
              value={value}
              onChange={(e) => onUpdateAnswer(q.number, e.target.value)}
              placeholder="Viết đoạn văn khoảng 80 chữ Hán sử dụng đủ tất cả từ khóa trên..."
              className="font-serifcn text-base leading-7"
            />
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-[#57534E]">
                Từ khóa đã dùng:{' '}
                <strong className="text-[#141414]">
                  {(q.keywords || []).filter((k) => value.includes(k)).length}/
                  {q.keywords?.length || 0}
                </strong>
              </span>
              <span
                className={`font-bold ${
                  hanziCount >= (q.minChars || 80) * 0.85
                    ? 'text-[#141414] bg-[#CBEAD8]/60 px-2 py-0.5 rounded'
                    : 'text-[#57534E]'
                }`}
              >
                {hanziCount} / ~{q.minChars || 80} 字
              </span>
            </div>
          </div>
        )}

        {format === 'writing_picture' && (
          <div className="space-y-3">
            {q.prompt && <p className="font-serifcn text-sm font-bold text-[#141414]">{q.prompt}</p>}
            {q.imageUrl ? (
              <div className="relative inline-block group">
                <img
                  src={q.imageUrl}
                  alt={`Hình ảnh câu ${q.number}`}
                  onClick={() => onZoomImage(q.imageUrl!)}
                  className="max-h-72 rounded-xl border-2 border-[#141414] bg-white cursor-zoom-in"
                />
                <button
                  type="button"
                  onClick={() => onZoomImage(q.imageUrl!)}
                  className="absolute bottom-2 right-2 px-2 py-1 rounded border-2 border-[#141414] bg-white/95 font-mono text-[11px] font-bold text-[#141414] inline-flex items-center gap-1"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Phóng to
                </button>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-[#141414]/30 bg-[#F8F6F1] p-4 text-xs text-[#57534E]">
                Đề thi chưa có ảnh minh họa cho câu {q.number}.
              </div>
            )}
            <Textarea
              rows={6}
              value={value}
              onChange={(e) => onUpdateAnswer(q.number, e.target.value)}
              placeholder="Quan sát hình ảnh và viết đoạn văn khoảng 80 chữ Hán..."
              className="font-serifcn text-base leading-7"
            />
            <div className="flex justify-end font-mono text-xs">
              <span
                className={`font-bold ${
                  hanziCount >= (q.minChars || 80) * 0.85
                    ? 'text-[#141414] bg-[#CBEAD8]/60 px-2 py-0.5 rounded'
                    : 'text-[#57534E]'
                }`}
              >
                {hanziCount} / ~{q.minChars || 80} 字
              </span>
            </div>
          </div>
        )}
      </Card>
    );
  },
);

OfficialQuestionCard.displayName = 'OfficialQuestionCard';

interface SplitSubQuestionCardProps {
  question: ExamQuestionItem;
  value: string;
  isFlagged: boolean;
  onUpdateAnswer: (questionNumber: number, value: string) => void;
  onToggleFlag: (questionNumber: number) => void;
}

const SplitSubQuestionCard: React.FC<SplitSubQuestionCardProps> = React.memo(
  ({ question: q, value, isFlagged, onUpdateAnswer, onToggleFlag }) => (
    <div
      id={`official-q-${q.number}`}
      className="rounded-xl border-2 border-[#141414]/25 bg-white p-3.5 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Badge variant="dark" size="sm">
            {q.number}
          </Badge>
          {q.prompt && (
            <p className="font-serifcn text-sm sm:text-base font-bold text-[#141414]">{q.prompt}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleFlag(q.number)}
          className={`p-1 rounded border ${
            isFlagged
              ? 'border-[#141414] bg-[#EFE078] text-[#141414]'
              : 'border-transparent text-[#57534E] hover:text-[#141414]'
          }`}
          title="Đánh dấu xem lại"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      </div>
      <McqOptionsGrid question={q} selectedLetter={value} onSelect={onUpdateAnswer} />
    </div>
  ),
);

SplitSubQuestionCard.displayName = 'SplitSubQuestionCard';

interface ClozePassageProps {
  passage: string;
  group: ExamQuestionGroup;
  answers: Record<number, string>;
  onJumpToQuestion: (qNum: number) => void;
}

const ClozePassageBox: React.FC<ClozePassageProps> = React.memo(
  ({ passage, group, answers, onJumpToQuestion }) => {
    const qMap = useMemo(() => {
      const m = new Map<number, ExamQuestionItem>();
      group.questions.forEach((q) => m.set(q.number, q));
      return m;
    }, [group.questions]);

    const normalizedPassage = useMemo(() => {
      let text = passage;
      for (const q of group.questions) {
        if (text.includes(`[${q.number}]`)) continue;
        const digitsPattern = String(q.number).split('').join('\\s*');
        const rx = new RegExp(`(?<!\\d)${digitsPattern}(?!\\d)`, 'g');
        text = text.replace(rx, `[${q.number}]`);
      }
      return text;
    }, [passage, group.questions]);

    const paragraphs = normalizedPassage.split('\n').filter(Boolean);

    return (
      <div className="space-y-3 font-serifcn text-base leading-8 text-[#141414]">
        {paragraphs.map((para, pIdx) => {
          const parts = para.split(/(\[\d{2}\])/g);
          return (
            <p key={pIdx} className="indent-6">
              {parts.map((seg, sIdx) => {
                const match = /^\[(\d{2})\]$/.exec(seg);
                if (!match) return <React.Fragment key={sIdx}>{seg}</React.Fragment>;
                const qNum = Number(match[1]);
                const q = qMap.get(qNum);
                const chosenLetter = (answers[qNum] || '').toUpperCase();
                const chosenIdx = chosenLetter ? chosenLetter.charCodeAt(0) - 65 : -1;
                const chosenWord =
                  q?.options && chosenIdx >= 0 && chosenIdx < q.options.length
                    ? q.options[chosenIdx]
                    : '';
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => onJumpToQuestion(qNum)}
                    className={`mx-1 px-2 py-0.5 rounded border-2 font-sans text-sm font-bold align-baseline transition-colors ${
                      chosenWord
                        ? 'border-[#141414] bg-[#CBEAD8] text-[#141414]'
                        : 'border-dashed border-[#141414] bg-[#EFE078]/50 text-[#141414] hover:bg-[#EFE078]'
                    }`}
                  >
                    <span className="font-mono text-[11px] mr-1">{qNum}.</span>
                    <span className="font-serifcn">{chosenWord || '____'}</span>
                  </button>
                );
              })}
            </p>
          );
        })}
      </div>
    );
  },
);

ClozePassageBox.displayName = 'ClozePassageBox';

// ---------------------------------------------------------------------------
// Main Official Exam Taking View
// ---------------------------------------------------------------------------
export const OfficialExamTakingView: React.FC<OfficialExamTakingViewProps> = ({
  meta,
  exam,
  mode,
  strictAudio,
  activeSection,
  answers,
  flagged,
  elapsedSeconds,
  remainingSeconds,
  initialAudioTimeSec,
  answeredCount,
  totalCount,
  unansweredCount,
  flaggedCount,
  confirmModal,
  onChangeSection,
  onToggleStrictAudio,
  onUpdateAnswer,
  onToggleFlag,
  onAudioTimeUpdate,
  onRequestSubmit,
  onConfirmSubmit,
  onRequestExit,
  onConfirmExit,
  onCloseConfirmModal,
}) => {
  const activeSections = useMemo(
    () => getActiveSectionsForMode(exam, mode),
    [exam, mode],
  );
  const currentSection =
    activeSections.find((s) => s.key === activeSection) || activeSections[0];

  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [showNavGrid, setShowNavGrid] = useState(false);

  const jumpToQuestion = useCallback(
    (qNum: number) => {
      for (const sec of activeSections) {
        for (const part of sec.parts) {
          for (const grp of part.groups) {
            if (grp.questions.some((q) => q.number === qNum)) {
              if (sec.key !== activeSection) {
                onChangeSection(sec.key);
              }
              window.setTimeout(() => {
                document
                  .getElementById(`official-q-${qNum}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 60);
              setShowNavGrid(false);
              return;
            }
          }
        }
      }
    },
    [activeSections, activeSection, onChangeSection],
  );

  const sectionProgress = useMemo(() => {
    const map: Record<string, { answered: number; total: number }> = {};
    for (const sec of activeSections) {
      let total = 0;
      let answered = 0;
      for (const part of sec.parts) {
        for (const grp of part.groups) {
          for (const q of grp.questions) {
            total++;
            if ((answers[q.number] || '').trim()) answered++;
          }
        }
      }
      map[sec.key] = { answered, total };
    }
    return map;
  }, [activeSections, answers]);

  const allSectionQuestionNumbers = useMemo(() => {
    const nums: number[] = [];
    for (const sec of activeSections) {
      for (const part of sec.parts) {
        for (const grp of part.groups) {
          for (const q of grp.questions) nums.push(q.number);
        }
      }
    }
    return nums.sort((a, b) => a - b);
  }, [activeSections]);

  const isLowTime = remainingSeconds !== null && remainingSeconds <= 300;

  return (
    <section className="space-y-4">
      {/* Sticky Top Control Bar */}
      <div className="sticky top-2 z-30 space-y-2">
        <Card padding="sm" className="bg-white/95 backdrop-blur space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="dark" size="sm">
                {meta.code} · {exam.code}
              </Badge>
              <span className="font-bold text-xs sm:text-sm text-[#141414] truncate">
                {MODE_LABELS[mode]}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div
                className={`px-2.5 py-1 rounded-full border-2 font-mono text-xs font-black inline-flex items-center gap-1.5 ${
                  isLowTime
                    ? 'border-red-700 bg-red-600 text-white animate-pulse'
                    : 'border-[#141414] bg-[#F8F6F1] text-[#141414]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {remainingSeconds !== null
                  ? formatTimer(remainingSeconds)
                  : formatTimer(elapsedSeconds)}
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={() => setShowNavGrid((v) => !v)}
              >
                Phiếu trả lời ({answeredCount}/{totalCount})
              </Button>

              <Button
                variant="default"
                size="sm"
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
                onClick={onRequestExit}
              >
                Tạm thoát
              </Button>

              <Button
                variant="mint"
                size="sm"
                leftIcon={<Send className="w-3.5 h-3.5" />}
                onClick={onRequestSubmit}
              >
                Nộp bài
              </Button>
            </div>
          </div>

          <ProgressBar percent={Math.round((answeredCount / Math.max(1, totalCount)) * 100)} />

          {/* Section Switcher Tabs */}
          {activeSections.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeSections.map((sec) => {
                const prog = sectionProgress[sec.key] || { answered: 0, total: 0 };
                const active = sec.key === currentSection?.key;
                return (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => {
                      onChangeSection(sec.key);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`px-3 py-1.5 rounded-full border-2 font-mono text-xs font-bold transition-colors ${
                      active
                        ? 'border-[#111111] bg-[#111111] text-[#EFE078] shadow-[2px_2px_0px_#141414]'
                        : 'border-[#141414]/30 bg-[#F8F6F1] text-[#141414] hover:border-[#141414]'
                    }`}
                  >
                    {SECTION_LABELS[sec.key]} · {prog.answered}/{prog.total}
                  </button>
                );
              })}
              {flaggedCount > 0 && (
                <Badge variant="yellow" size="sm">
                  <Flag className="w-3 h-3" /> {flaggedCount} đánh dấu
                </Badge>
              )}
            </div>
          )}

          {/* Isolated Sticky Audio Player */}
          {exam.audioUrl && (
            <StickyAudioPlayer
              audioUrl={exam.audioUrl}
              initialAudioTimeSec={initialAudioTimeSec}
              defaultDurationSec={exam.audioDurationSec || 0}
              strictAudio={strictAudio}
              isListeningSection={currentSection?.key === 'listening'}
              onToggleStrictAudio={onToggleStrictAudio}
              onAudioTimeUpdate={onAudioTimeUpdate}
            />
          )}

          {/* Collapsible Question Grid Navigator */}
          {showNavGrid && (
            <div className="pt-2 border-t border-[#141414]/15">
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-1">
                {allSectionQuestionNumbers.map((qNum) => {
                  const isAns = Boolean((answers[qNum] || '').trim());
                  const isFlg = Boolean(flagged[qNum]);
                  return (
                    <button
                      key={qNum}
                      type="button"
                      onClick={() => jumpToQuestion(qNum)}
                      className={`w-8 h-8 rounded border-2 font-mono text-xs font-bold transition-colors ${
                        isFlg
                          ? 'border-[#141414] bg-[#EFE078] text-[#141414]'
                          : isAns
                            ? 'border-[#141414] bg-[#CBEAD8] text-[#141414]'
                            : 'border-[#141414]/25 bg-white text-[#57534E] hover:border-[#141414]'
                      }`}
                    >
                      {qNum}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Active Section Content */}
      {currentSection && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="font-serif font-black text-2xl text-[#141414]">
                {currentSection.title}
              </h2>
              <p className="font-mono text-xs text-[#57534E]">
                Thời gian chuẩn: ~{currentSection.durationMin} phút ·{' '}
                {sectionProgress[currentSection.key]?.answered || 0}/
                {sectionProgress[currentSection.key]?.total || 0} câu đã làm
              </p>
            </div>
            {currentSection.key === 'listening' && !exam.audioUrl && (
              <Badge variant="pink" size="sm">
                <Headphones className="w-3 h-3" /> Đề này chưa đính kèm file MP3
              </Badge>
            )}
          </div>

          {currentSection.parts.map((part) => (
            <div key={`${currentSection.key}-${part.partNumber}`} className="space-y-4">
              <div className="rounded-xl border-2 border-[#141414] bg-[#F8F6F1] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-serifcn font-bold text-base text-[#141414]">{part.title}</h3>
                {part.instruction && (
                  <span className="font-serifcn text-xs text-[#57534E]">{part.instruction}</span>
                )}
              </div>

              {part.groups.map((group) => {
                if (
                  (part.questionFormat === 'reading_cloze' ||
                    part.questionFormat === 'reading_long') &&
                  group.passage
                ) {
                  return (
                    <Card key={group.groupId} padding="md" className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="lavender" size="sm">
                          Đoạn văn · Câu {group.rangeLabel}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        <div className="lg:col-span-6 lg:sticky lg:top-44 rounded-xl border-2 border-[#141414]/25 bg-[#F8F6F1] p-4 max-h-[68vh] overflow-y-auto">
                          {part.questionFormat === 'reading_cloze' ? (
                            <ClozePassageBox
                              passage={group.passage}
                              group={group}
                              answers={answers}
                              onJumpToQuestion={jumpToQuestion}
                            />
                          ) : (
                            <div className="space-y-3 font-serifcn text-base leading-8 text-[#141414]">
                              {group.passage
                                .split('\n')
                                .filter(Boolean)
                                .map((para, i) => (
                                  <p key={i} className="indent-6">
                                    {para}
                                  </p>
                                ))}
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-6 space-y-3">
                          {group.questions.map((q) => (
                            <SplitSubQuestionCard
                              key={q.number}
                              question={q}
                              value={answers[q.number] || ''}
                              isFlagged={Boolean(flagged[q.number])}
                              onUpdateAnswer={onUpdateAnswer}
                              onToggleFlag={onToggleFlag}
                            />
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                }

                return (
                  <div key={group.groupId} className="space-y-3">
                    {part.questionFormat === 'listening_mcq' &&
                      group.questions.length >= 2 &&
                      group.questions.length <= 5 && (
                        <div className="px-1">
                          <Badge variant="subtle" size="sm">
                            🎧 Nhóm câu {group.rangeLabel} (nghe chung 1 đoạn hội thoại/bài nói)
                          </Badge>
                        </div>
                      )}

                    {group.questions.map((q) => (
                      <OfficialQuestionCard
                        key={q.number}
                        question={q}
                        format={part.questionFormat}
                        value={answers[q.number] || ''}
                        isFlagged={Boolean(flagged[q.number])}
                        onUpdateAnswer={onUpdateAnswer}
                        onToggleFlag={onToggleFlag}
                        onZoomImage={setZoomedImageUrl}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button variant="default" onClick={onRequestExit}>
              Tạm thoát (lưu nháp)
            </Button>
            <div className="flex items-center gap-2">
              {(() => {
                const curIdx = activeSections.findIndex((s) => s.key === currentSection.key);
                const nextSec = curIdx >= 0 ? activeSections[curIdx + 1] : undefined;
                if (nextSec) {
                  return (
                    <Button
                      variant="yellow"
                      onClick={() => {
                        onChangeSection(nextSec.key);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Sang phần {SECTION_LABELS[nextSec.key]} →
                    </Button>
                  );
                }
                return null;
              })()}
              <Button
                variant="mint"
                leftIcon={<Send className="w-4 h-4" />}
                onClick={onRequestSubmit}
              >
                Nộp bài &amp; Chấm điểm
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(zoomedImageUrl)}
        onClose={() => setZoomedImageUrl(null)}
        title="Ảnh đề bài câu 100"
        maxWidth="2xl"
      >
        {zoomedImageUrl && (
          <img
            src={zoomedImageUrl}
            alt="Ảnh phóng to"
            className="w-full max-h-[75vh] object-contain rounded border-2 border-[#141414] bg-white"
          />
        )}
      </Modal>

      <Modal
        open={confirmModal !== null}
        onClose={onCloseConfirmModal}
        title={confirmModal === 'submit' ? 'Xác nhận nộp bài thi?' : 'Tạm thoát phòng thi?'}
        maxWidth="md"
      >
        <div className="space-y-4">
          {confirmModal === 'submit' ? (
            <p className="text-sm text-[#141414]">
              Bạn đã làm <strong>{answeredCount}/{totalCount}</strong> câu
              {unansweredCount > 0 ? (
                <>
                  {' '}
                  (còn <strong className="text-[#BE185D]">{unansweredCount} câu</strong> chưa trả
                  lời).
                </>
              ) : (
                ' (hoàn thành 100%!).'
              )}{' '}
              Sau khi nộp, hệ thống sẽ chấm điểm thang chuẩn HSK và mở khóa toàn bộ kịch bản nghe
              (Transcript).
            </p>
          ) : (
            <p className="text-sm text-[#141414]">
              Tiến độ làm bài hiện tại ({answeredCount}/{totalCount} câu) và vị trí audio sẽ được
              lưu nháp trong trình duyệt để bạn làm tiếp bất cứ lúc nào.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="default" onClick={onCloseConfirmModal}>
              Tiếp tục làm bài
            </Button>
            {confirmModal === 'submit' ? (
              <Button variant="mint" onClick={onConfirmSubmit}>
                Nộp bài ngay
              </Button>
            ) : (
              <Button variant="pink" onClick={onConfirmExit}>
                Lưu nháp &amp; Thoát
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </section>
  );
};
