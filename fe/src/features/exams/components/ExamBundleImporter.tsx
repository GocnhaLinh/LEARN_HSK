import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cloud,
  FileAudio,
  FileCheck2,
  FileText,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Input, ProgressBar, Textarea } from '@/components/ui';
import { formatTimer } from '@/features/exercises/utils/exam-utils';
import type { ExamQuestionItem, ExamSectionKey } from '../api/exams.api';
import { useImportExamMutation, useMediaStorageStatus } from '../hooks/useExamsQuery';
import {
  getRemainingDraftMinutes,
  hasDraftContent,
  useExamImporterStore,
} from '../stores/exam-importer.store';
import {
  classifyExamBundleFiles,
  type CroppedQuestionImage,
  type ParsedExamWarning,
  parseExamBundleFiles,
} from '../utils/hsk-exam-parser';

export interface ExamBundleImporterProps {
  level: number;
  onImported: () => void;
  onCancel?: () => void;
}

const EMPTY_FILES = {
  examPdf: null,
  answerPdf: null,
  transcriptPdf: null,
  audioFile: null,
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const ExamBundleImporter: React.FC<ExamBundleImporterProps> = ({
  level,
  onImported,
  onCancel,
}) => {
  const draft = useExamImporterStore((s) => s.draftsByLevel[level]);
  const busyStage = useExamImporterStore((s) => s.busyStage);
  const busyMessage = useExamImporterStore((s) => s.busyMessage);
  const uploadPct = useExamImporterStore((s) => s.uploadPct);
  const setFilesStore = useExamImporterStore((s) => s.setFiles);
  const setParsedStore = useExamImporterStore((s) => s.setParsed);
  const clearDraftStore = useExamImporterStore((s) => s.clearDraft);
  const pruneExpired = useExamImporterStore((s) => s.pruneExpired);
  const setBusy = useExamImporterStore((s) => s.setBusy);

  const files = draft?.files || EMPTY_FILES;
  const parsed = draft?.parsed || null;

  const isParsing = busyStage === 'parsing';
  const isUploading = busyStage === 'uploading';
  const isBusy = busyStage !== 'idle';

  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState('');
  const [nowTick, setNowTick] = useState(() => Date.now());

  const bundleInputRef = useRef<HTMLInputElement | null>(null);
  const examInputRef = useRef<HTMLInputElement | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const customImgInputRef = useRef<HTMLInputElement | null>(null);

  const { data: mediaStatus } = useMediaStorageStatus(true);
  const importMutation = useImportExamMutation(level);

  // Prune expired (> 15 min) draft on mount & refresh countdown label every 30s
  useEffect(() => {
    pruneExpired(level);
    const id = window.setInterval(() => {
      pruneExpired(level);
      setNowTick(Date.now());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [level, pruneExpired]);

  // Warn before closing/reloading browser tab while actively uploading or parsing
  useEffect(() => {
    if (!isBusy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isBusy]);

  const remainingMin = hasDraftContent(draft) ? getRemainingDraftMinutes(draft, nowTick) : 0;

  const warningByQ = useMemo(() => {
    const map = new Map<number, ParsedExamWarning[]>();
    for (const w of parsed?.warnings || []) {
      const list = map.get(w.questionNumber) || [];
      list.push(w);
      map.set(w.questionNumber, list);
    }
    return map;
  }, [parsed]);

  const applyQuickTileFix = (questionNumber: number, fromChar: string, toChar: string) => {
    if (isBusy) return;
    setParsedStore(level, (prev) => {
      if (!prev) return prev;
      const nextSections = prev.sections.map((sec) => ({
        ...sec,
        parts: sec.parts.map((part) => ({
          ...part,
          groups: part.groups.map((grp) => ({
            ...grp,
            questions: grp.questions.map((q) => {
              if (q.number !== questionNumber) return q;
              const nextTiles = (q.wordTiles || []).map((t) => t.replace(fromChar, toChar));
              return {
                ...q,
                wordTiles: nextTiles,
                prompt: nextTiles.join('  /  '),
              };
            }),
          })),
        })),
      }));
      const nextWarnings = prev.warnings.filter(
        (w) =>
          !(
            w.questionNumber === questionNumber &&
            w.suggestedFix?.from === fromChar &&
            w.suggestedFix?.to === toChar
          ),
      );
      return { ...prev, sections: nextSections, warnings: nextWarnings };
    });
  };

  const handleAddFiles = (incoming: FileList | File[] | null) => {
    if (isBusy || !incoming) return;
    const arr = Array.from(incoming);
    if (!arr.length) return;
    setFilesStore(level, (prev) => classifyExamBundleFiles(arr, prev));
    setParseError('');
  };

  const handleParse = async () => {
    if (isBusy) return;
    if (!files.examPdf) {
      setParseError('Vui lòng chọn ít nhất file Đề thi PDF (ví dụ H50000.pdf).');
      return;
    }
    setParseError('');
    setBusy('parsing', { level, message: 'Đang đọc các file PDF & audio...' });
    try {
      const result = await parseExamBundleFiles(files, level, (msg) =>
        setBusy('parsing', { level, message: msg }),
      );
      setParsedStore(level, result, true);
    } catch (err: any) {
      setParseError(err?.message || 'Không thể phân tích bộ file đề thi.');
    } finally {
      setBusy('idle');
    }
  };

  const updateQuestion = (
    questionNumber: number,
    updater: (q: ExamQuestionItem) => ExamQuestionItem,
  ) => {
    if (isBusy) return;
    setParsedStore(level, (prev) => {
      if (!prev) return prev;
      const nextSections = prev.sections.map((sec) => ({
        ...sec,
        parts: sec.parts.map((part) => ({
          ...part,
          groups: part.groups.map((grp) => ({
            ...grp,
            questions: grp.questions.map((q) =>
              q.number === questionNumber ? updater(q) : q,
            ),
          })),
        })),
      }));
      return { ...prev, sections: nextSections };
    });
  };

  const handleReplaceQ100Image = (file: File | null) => {
    if (isBusy || !file || !parsed) return;
    const previewUrl = URL.createObjectURL(file);
    setParsedStore(level, (prev) => {
      if (!prev) return prev;
      prev.croppedImages
        .filter((i) => i.questionNumber === 100)
        .forEach((i) => URL.revokeObjectURL(i.previewUrl));
      const others = prev.croppedImages.filter((i) => i.questionNumber !== 100);
      const nextImages: CroppedQuestionImage[] = [
        ...others,
        {
          questionNumber: 100,
          blob: file,
          previewUrl,
          filename: `q100.${file.name.split('.').pop() || 'png'}`,
        },
      ];
      return {
        ...prev,
        croppedImages: nextImages,
        stats: { ...prev.stats, imagesCropped: nextImages.length },
      };
    });
  };

  const handleSaveExam = async () => {
    if (!parsed || isBusy) return;
    setBusy('uploading', {
      level,
      uploadPct: 5,
      message: 'Đang tải file lên server (5%)...',
    });
    try {
      await importMutation.mutateAsync({
        payload: {
          code: parsed.code.trim() || `HSK${level}-${Date.now()}`,
          level,
          title: parsed.title.trim() || `Đề thi HSK ${level}`,
          description: parsed.description.trim(),
          totalDurationMin: parsed.totalDurationMin || 120,
          audioDurationSec: parsed.audioDurationSec,
          sections: parsed.sections,
        },
        audioFile: files.audioFile,
        questionImages: parsed.croppedImages.map((img) => ({
          questionNumber: img.questionNumber,
          blob: img.blob,
          filename: img.filename,
        })),
        onUploadProgress: (pct) => {
          setBusy('uploading', {
            level,
            uploadPct: pct,
            message:
              pct < 99
                ? `Đang tải file lên server (${pct}%)...`
                : 'Server đang nén MP3 (64k mono) & WebP rồi đẩy lên Cloudinary...',
          });
        },
      });
      clearDraftStore(level);
      setBusy('idle');
      onImported();
    } catch {
      // Keep the 15-minute cached files & parsed preview intact so user can retry immediately
      setBusy('idle');
    }
  };

  const { warningItems, essayCount, gradableCount } = useMemo(() => {
    if (!parsed) {
      return { warningItems: [], essayCount: 0, gradableCount: 0 };
    }
    const list: Array<{
      sectionKey: ExamSectionKey;
      sectionTitle: string;
      partTitle: string;
      questionFormat: string;
      groupPassage?: string;
      groupTranscript?: string;
      question: ExamQuestionItem;
    }> = [];
    let essays = 0;
    let total = 0;
    for (const sec of parsed.sections) {
      for (const part of sec.parts) {
        const isEssay =
          part.questionFormat === 'writing_keywords' ||
          part.questionFormat === 'writing_picture';
        for (const grp of part.groups) {
          for (const q of grp.questions) {
            total++;
            if (isEssay) essays++;
            if (warningByQ.has(q.number)) {
              list.push({
                sectionKey: sec.key,
                sectionTitle: sec.title,
                partTitle: part.title,
                questionFormat: part.questionFormat,
                groupPassage: grp.passage,
                groupTranscript: grp.transcript,
                question: q,
              });
            }
          }
        }
      }
    }
    return {
      warningItems: list,
      essayCount: essays,
      gradableCount: Math.max(0, total - essays),
    };
  }, [parsed, warningByQ]);

  const q100Image = parsed?.croppedImages.find((i) => i.questionNumber === 100);

  return (
    <Card padding="lg" className="space-y-5 relative">
      {/* Global Busy / Upload Lock Banner */}
      {isBusy && (
        <div className="rounded-xl border-2 border-[#141414] bg-[#EFE078] p-3.5 space-y-2 shadow-[3px_3px_0px_#141414]">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs font-bold text-[#141414]">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                {busyMessage ||
                  (isUploading
                    ? 'Đang nén & tải bộ đề lên Cloudinary...'
                    : 'Đang phân tích bộ file đề thi...')}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#111111] text-[#EFE078] text-[10px]">
              <Lock className="w-3 h-3" />
              {isUploading ? `${uploadPct}% · Đã khóa chuyển trang` : 'Đang xử lý...'}
            </span>
          </div>
          {isUploading && <ProgressBar percent={uploadPct} />}
          <p className="text-[11px] font-medium text-[#141414]">
            Vui lòng chờ quá trình hoàn tất — các nút điều hướng tạm thời bị khóa để tránh mất dữ
            liệu tải lên.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="yellow" size="sm">
              NHẬP BỘ ĐỀ CHUẨN HSK {level}
            </Badge>
            {mediaStatus && (
              <Badge
                variant={
                  mediaStatus.provider === 'cloudinary' && mediaStatus.connected
                    ? 'mint'
                    : 'subtle'
                }
                size="sm"
              >
                <Cloud className="w-3 h-3" />
                {mediaStatus.provider === 'cloudinary' && mediaStatus.connected
                  ? `Cloudinary · ${mediaStatus.cloudName}/${mediaStatus.folder}`
                  : 'GridFS fallback'}
              </Badge>
            )}
            {remainingMin > 0 && !isBusy && (
              <Badge variant="lavender" size="sm">
                <Clock className="w-3 h-3" />
                Đang lưu nháp (còn ~{remainingMin} phút)
              </Badge>
            )}
          </div>
          <h3 className="font-serif font-black text-xl text-[#141414]">
            Tải bộ 4 file đề thi (PDF Đề + Đáp án + Kịch bản nghe + Audio MP3)
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Kéo thả cùng lúc cả 4 file — hệ thống giữ nháp 15 phút ngay cả khi bạn chuyển sang trang
            khác trước khi bấm Lưu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasDraftContent(draft) && (
            <Button
              variant="default"
              size="sm"
              disabled={isBusy}
              onClick={() => clearDraftStore(level)}
            >
              Xóa nháp
            </Button>
          )}
          {onCancel && (
            <Button variant="default" size="sm" disabled={isBusy} onClick={onCancel}>
              Đóng
            </Button>
          )}
        </div>
      </div>

      {/* Multi-file Dropzone */}
      <div
        onDragOver={(e) => {
          if (isBusy) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (isBusy) return;
          handleAddFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          if (!isBusy) bundleInputRef.current?.click();
        }}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          isBusy
            ? 'opacity-50 pointer-events-none cursor-not-allowed border-[#141414]/30 bg-[#F8F6F1]'
            : isDragging
              ? 'cursor-pointer border-[#141414] bg-[#EFE078]/40'
              : 'cursor-pointer border-[#141414]/40 bg-[#F8F6F1]/60 hover:bg-[#F8F6F1] hover:border-[#141414]'
        }`}
      >
        <input
          ref={bundleInputRef}
          type="file"
          multiple
          disabled={isBusy}
          accept=".pdf,application/pdf,.mp3,.m4a,.wav,.ogg,audio/mpeg,audio/*"
          className="hidden"
          onChange={(e) => {
            handleAddFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <Upload className="w-7 h-7 mx-auto mb-2 text-[#141414]" />
        <p className="font-bold text-sm text-[#141414]">
          Kéo thả cả 4 file vào đây, hoặc bấm để chọn nhiều file cùng lúc
        </p>
        <p className="font-mono text-[11px] text-[#57534E] mt-1">
          VD: H50000.pdf · H50000 答案.pdf · H50000 听力材料.pdf · H50000.mp3
        </p>
      </div>

      {/* 4 Individual File Slots */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${isBusy ? 'opacity-60 pointer-events-none' : ''}`}>
        {[
          {
            key: 'examPdf' as const,
            label: '1. File Đề thi (Bắt buộc)',
            hint: 'H50000.pdf',
            icon: <FileText className="w-4 h-4" />,
            accept: '.pdf,application/pdf',
            ref: examInputRef,
            file: files.examPdf,
          },
          {
            key: 'answerPdf' as const,
            label: '2. File Đáp án',
            hint: 'H50000 答案.pdf',
            icon: <FileCheck2 className="w-4 h-4" />,
            accept: '.pdf,application/pdf',
            ref: answerInputRef,
            file: files.answerPdf,
          },
          {
            key: 'transcriptPdf' as const,
            label: '3. Kịch bản nghe',
            hint: 'H50000 听力材料.pdf',
            icon: <Headphones className="w-4 h-4" />,
            accept: '.pdf,application/pdf',
            ref: transcriptInputRef,
            file: files.transcriptPdf,
          },
          {
            key: 'audioFile' as const,
            label: '4. File Audio MP3',
            hint: 'H50000.mp3 (tự nén 64k)',
            icon: <FileAudio className="w-4 h-4" />,
            accept: '.mp3,.m4a,.wav,.ogg,audio/mpeg,audio/*',
            ref: audioInputRef,
            file: files.audioFile,
          },
        ].map((slot) => (
          <div
            key={slot.key}
            className={`rounded-xl border-2 p-3 flex flex-col justify-between gap-2 ${
              slot.file ? 'border-[#141414] bg-[#CBEAD8]/25' : 'border-[#141414]/25 bg-white'
            }`}
          >
            <input
              ref={slot.ref}
              type="file"
              disabled={isBusy}
              accept={slot.accept}
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0] || null;
                if (picked) {
                  setFilesStore(level, (prev) => ({ ...prev, [slot.key]: picked }));
                  setParseError('');
                }
                e.target.value = '';
              }}
            />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#141414]">
                {slot.icon}
                <span>{slot.label}</span>
              </div>
              {slot.file && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setFilesStore(level, (prev) => ({ ...prev, [slot.key]: null }))}
                  className="text-[#57534E] hover:text-[#BE185D] p-0.5 disabled:opacity-40"
                  title="Bỏ chọn file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {slot.file ? (
              <div>
                <p className="text-xs font-bold text-[#141414] truncate" title={slot.file.name}>
                  {slot.file.name}
                </p>
                <p className="font-mono text-[10px] text-[#57534E]">
                  {formatFileSize(slot.file.size)}
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => slot.ref.current?.click()}
                className="text-left text-xs text-[#57534E] hover:text-[#141414] underline underline-offset-2"
              >
                Chọn file ({slot.hint})
              </button>
            )}
          </div>
        ))}
      </div>

      {parseError && (
        <div className="rounded-xl border-2 border-[#D9468F] bg-[#F4C2D7]/20 px-3 py-2 text-xs font-medium text-[#141414] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#BE185D] shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Action: Parse bundle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-xs text-[#57534E]">
          {isParsing && busyMessage ? (
            <span className="inline-flex items-center gap-2 text-[#141414] font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {busyMessage}
            </span>
          ) : (
            'Sau khi bấm Phân tích, bạn có thể soát & sửa nhanh lỗi OCR trước khi lưu.'
          )}
        </div>
        <Button
          variant="yellow"
          onClick={handleParse}
          disabled={!files.examPdf || isBusy}
          leftIcon={
            isParsing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )
          }
        >
          {parsed ? 'Phân tích lại bộ file' : 'Phân tích bộ đề HSK'}
        </Button>
      </div>

      {/* Parsed Preview & Quick OCR Editor */}
      {parsed && (
        <div
          className={`space-y-4 pt-4 border-t-2 border-[#141414]/15 ${
            isBusy ? 'opacity-65 pointer-events-none' : ''
          }`}
        >
          {/* Editable Exam Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-mono text-[11px] font-bold uppercase text-[#57534E] mb-1">
                Mã đề
              </label>
              <Input
                disabled={isBusy}
                value={parsed.code}
                onChange={(e) =>
                  setParsedStore(level, (prev) => (prev ? { ...prev, code: e.target.value } : prev))
                }
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] font-bold uppercase text-[#57534E] mb-1">
                Tiêu đề bộ đề
              </label>
              <Input
                disabled={isBusy}
                value={parsed.title}
                onChange={(e) =>
                  setParsedStore(level, (prev) =>
                    prev ? { ...prev, title: e.target.value } : prev,
                  )
                }
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] font-bold uppercase text-[#57534E] mb-1">
                Thời lượng chuẩn (phút)
              </label>
              <Input
                disabled={isBusy}
                type="number"
                min={10}
                max={240}
                value={parsed.totalDurationMin}
                onChange={(e) =>
                  setParsedStore(level, (prev) =>
                    prev ? { ...prev, totalDurationMin: Number(e.target.value) || 120 } : prev,
                  )
                }
              />
            </div>
          </div>

          {/* QA Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="rounded-xl border-2 border-[#141414] bg-[#F8F6F1] p-2.5 text-center">
              <div className="font-mono text-lg font-black text-[#141414]">
                {parsed.stats.totalQuestions}
              </div>
              <div className="font-mono text-[10px] text-[#57534E] uppercase">Tổng câu</div>
            </div>
            <div className="rounded-xl border-2 border-[#141414] bg-white p-2.5 text-center">
              <div className="font-mono text-lg font-black text-[#141414]">
                {parsed.stats.listeningCount}
              </div>
              <div className="font-mono text-[10px] text-[#57534E] uppercase">Nghe (听力)</div>
            </div>
            <div className="rounded-xl border-2 border-[#141414] bg-white p-2.5 text-center">
              <div className="font-mono text-lg font-black text-[#141414]">
                {parsed.stats.readingCount}
              </div>
              <div className="font-mono text-[10px] text-[#57534E] uppercase">Đọc (阅读)</div>
            </div>
            <div className="rounded-xl border-2 border-[#141414] bg-white p-2.5 text-center">
              <div className="font-mono text-lg font-black text-[#141414]">
                {parsed.stats.writingCount}
              </div>
              <div className="font-mono text-[10px] text-[#57534E] uppercase">Viết (书写)</div>
            </div>
            <div className="rounded-xl border-2 border-[#141414] bg-[#CBEAD8]/40 p-2.5 text-center">
              <div className="font-mono text-lg font-black text-[#141414]">
                {parsed.stats.answersMatched}/{gradableCount}
              </div>
              <div className="font-mono text-[10px] text-[#57534E] uppercase">
                Khớp đáp án{essayCount > 0 ? ` (+${essayCount} viết mở)` : ''}
              </div>
            </div>
            <div className="rounded-xl border-2 border-[#141414] bg-[#DCD2F5]/50 p-2.5 text-center">
              <div className="font-mono text-lg font-black text-[#141414]">
                {parsed.stats.transcriptsMatched}
              </div>
              <div className="font-mono text-[10px] text-[#57534E] uppercase">
                Transcript{parsed.audioDurationSec ? ` · ${formatTimer(parsed.audioDurationSec)}` : ''}
              </div>
            </div>
          </div>

          {/* Q100 Auto-cropped Picture Preview */}
          <div className="rounded-xl border-2 border-[#141414]/30 bg-[#F8F6F1]/60 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                ref={customImgInputRef}
                type="file"
                disabled={isBusy}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleReplaceQ100Image(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />
              {q100Image ? (
                <img
                  src={q100Image.previewUrl}
                  alt="Ảnh câu 100"
                  className="w-24 h-16 object-cover rounded border-2 border-[#141414] bg-white"
                />
              ) : (
                <div className="w-24 h-16 rounded border-2 border-dashed border-[#141414]/40 flex items-center justify-center bg-white text-[#57534E]">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-[#141414]">
                  {q100Image
                    ? `Đã tự cắt ảnh câu 100 (${formatFileSize(q100Image.blob.size)} WebP)`
                    : 'Chưa tự cắt được ảnh câu 100 (có thể chọn ảnh thủ công)'}
                </p>
                <p className="text-[11px] text-[#57534E]">
                  Ảnh sẽ được tự động nén WebP và đẩy vào Cloudinary thư mục HSK/HSK{level}/{parsed.code}.
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="sm"
              disabled={isBusy}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => customImgInputRef.current?.click()}
            >
              {q100Image ? 'Thay ảnh câu 100' : 'Chọn ảnh câu 100'}
            </Button>
          </div>

          {/* Warning-Only Review Section (never spoils valid questions) */}
          {warningItems.length === 0 ? (
            <div className="rounded-xl border-2 border-[#2E7D5B] bg-[#CBEAD8]/35 p-4 text-center text-xs sm:text-sm font-bold text-[#141414] flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E7D5B] shrink-0" />
              <span>
                Đọc chuẩn {parsed.stats.totalQuestions}/{parsed.stats.totalQuestions} câu — không có
                câu lỗi hay cảnh báo OCR nào! Bạn có thể bấm Lưu bộ đề ngay.
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="yellow" size="sm">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Có {warningItems.length} câu cần kiểm tra / sửa trước khi lưu
                </Badge>
                <span className="font-mono text-[11px] text-[#57534E]">
                  Các câu đọc đúng được ẩn để tránh lộ đề
                </span>
              </div>

              <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
                {warningItems.map(
                  ({ question: q, questionFormat, partTitle, groupPassage, groupTranscript }) => {
                  const warns = warningByQ.get(q.number) || [];
                  const fullSourceSentence =
                    questionFormat === 'writing_reorder'
                      ? `Câu ${q.number}: ${(q.wordTiles || []).join('  ')}`
                      : q.prompt || groupPassage || q.transcript || groupTranscript || '';
                  return (
                    <div
                      key={q.number}
                      className={`rounded-xl border-2 p-3 space-y-2.5 ${
                        warns.length > 0
                          ? 'border-[#141414] bg-[#EFE078]/25'
                          : 'border-[#141414]/20 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={warns.length > 0 ? 'yellow' : 'dark'} size="sm">
                            Câu {q.number}
                          </Badge>
                          <span className="font-mono text-[11px] text-[#57534E]">{partTitle}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-[#57534E]">Đáp án:</span>
                          <input
                            disabled={isBusy}
                            value={q.correctAnswer}
                            onChange={(e) =>
                              updateQuestion(q.number, (prev) => ({
                                ...prev,
                                correctAnswer: e.target.value,
                              }))
                            }
                            placeholder={
                              questionFormat === 'writing_keywords' ||
                              questionFormat === 'writing_picture'
                                ? 'Tự do (80 chữ)'
                                : 'A/B/C/D hoặc câu đúng'
                            }
                            className="w-36 sm:w-52 px-2 py-0.5 rounded border-2 border-[#141414]/40 bg-white font-serifcn text-xs font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                          />
                        </div>
                      </div>

                      {warns.length > 0 && (
                        <div className="space-y-2">
                          {warns.map((w, i) => (
                            <div
                              key={i}
                              className="text-xs font-semibold text-[#141414] bg-[#EFE078] border-[1.5px] border-[#141414] rounded-lg px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{w.message}</span>
                              </span>
                              {w.suggestedFix && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    applyQuickTileFix(
                                      q.number,
                                      w.suggestedFix!.from,
                                      w.suggestedFix!.to,
                                    )
                                  }
                                  className="px-2.5 py-1 rounded bg-[#111111] text-[#EFE078] font-mono text-[11px] font-bold hover:opacity-90"
                                >
                                  Sửa nhanh: {w.suggestedFix.from} → {w.suggestedFix.to}
                                </button>
                              )}
                            </div>
                          ))}

                          <div className="rounded-lg border-[1.5px] border-[#141414]/35 bg-white p-2.5 space-y-1.5 text-xs">
                            {fullSourceSentence && (
                              <div>
                                <span className="font-mono text-[10px] font-bold uppercase text-[#57534E] block">
                                  Nội dung gốc đọc từ file đề (để đối chiếu / tìm trong file):
                                </span>
                                <p className="font-serifcn text-sm text-[#141414] font-semibold mt-0.5 whitespace-pre-line">
                                  {fullSourceSentence}
                                </p>
                              </div>
                            )}
                            {q.correctAnswer && (
                              <div className="pt-1 border-t border-[#141414]/15">
                                <span className="font-mono text-[10px] font-bold uppercase text-[#57534E] block">
                                  Đáp án nguyên câu (từ file 答案.pdf):
                                </span>
                                <p className="font-serifcn text-sm font-bold text-[#141414] bg-[#CBEAD8]/50 inline-block px-2 py-0.5 rounded mt-0.5">
                                  {q.correctAnswer}
                                </p>
                              </div>
                            )}
                            {(q.transcript || groupTranscript) && (
                              <div className="pt-1 border-t border-[#141414]/15">
                                <span className="font-mono text-[10px] font-bold uppercase text-[#57534E] block">
                                  Kịch bản nghe (听力材料.pdf):
                                </span>
                                <p className="font-serifcn text-xs text-[#141414] whitespace-pre-line mt-0.5">
                                  {q.transcript || groupTranscript}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {questionFormat === 'writing_reorder' ? (
                        <div className="space-y-1">
                          <label className="font-mono text-[10px] uppercase text-[#57534E]">
                            Các thẻ từ (ngăn cách bằng dấu /)
                          </label>
                          <Input
                            disabled={isBusy}
                            value={(q.wordTiles || []).join(' / ')}
                            onChange={(e) => {
                              const tiles = e.target.value
                                .split('/')
                                .map((t) => t.trim())
                                .filter(Boolean);
                              updateQuestion(q.number, (prev) => ({
                                ...prev,
                                wordTiles: tiles,
                                prompt: tiles.join('  /  '),
                              }));
                            }}
                            className="font-serifcn text-sm"
                          />
                        </div>
                      ) : questionFormat === 'writing_keywords' ? (
                        <div className="space-y-1">
                          <label className="font-mono text-[10px] uppercase text-[#57534E]">
                            5 từ khóa bắt buộc (ngăn cách bằng dấu 、)
                          </label>
                          <Input
                            disabled={isBusy}
                            value={(q.keywords || []).join('、')}
                            onChange={(e) =>
                              updateQuestion(q.number, (prev) => ({
                                ...prev,
                                keywords: e.target.value
                                  .split(/[、,，]+/)
                                  .map((k) => k.trim())
                                  .filter(Boolean),
                              }))
                            }
                            className="font-serifcn text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          {q.prompt && (
                            <p className="font-serifcn text-sm text-[#141414] leading-relaxed">
                              {q.prompt}
                            </p>
                          )}
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {q.options.map((opt, idx) => {
                                const letter = String.fromCharCode(65 + idx);
                                const isAns = q.correctAnswer.toUpperCase() === letter;
                                return (
                                  <div
                                    key={letter}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${
                                      isAns
                                        ? 'border-[#141414] bg-[#CBEAD8]/50 font-bold'
                                        : 'border-[#141414]/20 bg-[#F8F6F1]/50'
                                    }`}
                                  >
                                    <span className="font-mono font-bold text-[#141414]">
                                      {letter}.
                                    </span>
                                    <input
                                      disabled={isBusy}
                                      value={opt}
                                      onChange={(e) => {
                                        const nextVal = e.target.value;
                                        updateQuestion(q.number, (prev) => {
                                          const nextOpts = [...(prev.options || [])];
                                          nextOpts[idx] = nextVal;
                                          return { ...prev, options: nextOpts };
                                        });
                                      }}
                                      className="w-full bg-transparent font-serifcn text-xs text-[#141414] focus:outline-none"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {q.transcript && (
                            <Textarea
                              disabled={isBusy}
                              rows={2}
                              value={q.transcript}
                              onChange={(e) =>
                                updateQuestion(q.number, (prev) => ({
                                  ...prev,
                                  transcript: e.target.value,
                                }))
                              }
                              className="font-serifcn text-xs"
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                },
              )}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <Button
              variant="default"
              onClick={() => setParsedStore(level, null, true)}
              disabled={isBusy}
            >
              Xóa preview
            </Button>
            <Button
              variant="mint"
              onClick={handleSaveExam}
              disabled={isBusy}
              leftIcon={
                isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )
              }
            >
              {isUploading
                ? 'Đang nén & lưu lên Cloudinary...'
                : `Lưu bộ đề ${parsed.code} vào HSK ${level}`}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
