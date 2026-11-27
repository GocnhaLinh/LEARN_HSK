import { create } from "zustand";
import type {
  ClassifiedExamFiles,
  ExamImporterDraft,
  ExamImporterStoreState,
  ParsedExamBundleResult,
} from "@/features/exams/types";

/** Draft cache lifetime: 15 minutes of inactivity */
export const IMPORTER_DRAFT_TTL_MS = 15 * 60 * 1000;

const EMPTY_FILES: ClassifiedExamFiles = {
  examPdf: null,
  answerPdf: null,
  transcriptPdf: null,
  audioFile: null,
};

function createEmptyDraft(isOpen = false): ExamImporterDraft {
  return {
    files: { ...EMPTY_FILES },
    parsed: null,
    isOpen,
    updatedAt: Date.now(),
  };
}

function revokeParsedUrls(parsed: ParsedExamBundleResult | null | undefined) {
  if (!parsed?.croppedImages?.length) return;
  for (const img of parsed.croppedImages) {
    try {
      URL.revokeObjectURL(img.previewUrl);
    } catch {
      // ignore
    }
  }
}

export function hasDraftContent(draft?: ExamImporterDraft | null): boolean {
  if (!draft) return false;
  return Boolean(
    draft.parsed ||
    draft.files.examPdf ||
    draft.files.answerPdf ||
    draft.files.transcriptPdf ||
    draft.files.audioFile,
  );
}

export function isDraftExpired(
  draft?: ExamImporterDraft | null,
  now = Date.now(),
): boolean {
  if (!draft) return false;
  return now - draft.updatedAt > IMPORTER_DRAFT_TTL_MS;
}

export function getRemainingDraftMinutes(
  draft?: ExamImporterDraft | null,
  now = Date.now(),
): number {
  if (!draft) return 0;
  const remainingMs = Math.max(
    0,
    IMPORTER_DRAFT_TTL_MS - (now - draft.updatedAt),
  );
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}

/**
 * In-memory SPA draft cache (15-minute TTL) + global upload/parse lock for HSK Exam Bundle Importer.
 * Keeps selected File objects (PDF + MP3), parsed 100 questions, OCR edits, and cropped Q100 WebP blobs
 * alive across tab/route switches, and disables navigation while parsing or uploading to Cloudinary.
 */
export const useExamImporterStore = create<ExamImporterStoreState>(
  (set, get) => ({
    draftsByLevel: {},
    busyStage: "idle",
    busyLevel: null,
    busyMessage: "",
    uploadPct: 0,

    setOpen: (level, isOpen) =>
      set((state) => {
        const existing = state.draftsByLevel[level] || createEmptyDraft(isOpen);
        return {
          draftsByLevel: {
            ...state.draftsByLevel,
            [level]: { ...existing, isOpen },
          },
        };
      }),

    setFiles: (level, updater) =>
      set((state) => {
        const existing = state.draftsByLevel[level] || createEmptyDraft(true);
        const nextFiles =
          typeof updater === "function" ? updater(existing.files) : updater;
        return {
          draftsByLevel: {
            ...state.draftsByLevel,
            [level]: {
              ...existing,
              files: nextFiles,
              isOpen: true,
              updatedAt: Date.now(),
            },
          },
        };
      }),

    setParsed: (level, updater, revokeOld = false) =>
      set((state) => {
        const existing = state.draftsByLevel[level] || createEmptyDraft(true);
        const nextParsed =
          typeof updater === "function" ? updater(existing.parsed) : updater;
        if (revokeOld && existing.parsed && existing.parsed !== nextParsed) {
          revokeParsedUrls(existing.parsed);
        }
        return {
          draftsByLevel: {
            ...state.draftsByLevel,
            [level]: {
              ...existing,
              parsed: nextParsed,
              isOpen: true,
              updatedAt: Date.now(),
            },
          },
        };
      }),

    clearDraft: (level) => {
      const existing = get().draftsByLevel[level];
      if (existing?.parsed) {
        revokeParsedUrls(existing.parsed);
      }
      set((state) => {
        const next = { ...state.draftsByLevel };
        delete next[level];
        return { draftsByLevel: next };
      });
    },

    pruneExpired: (level) => {
      const state = get();
      // Never expire while actively parsing or uploading this level
      if (state.busyStage !== "idle" && state.busyLevel === level) return;
      const existing = state.draftsByLevel[level];
      if (existing && hasDraftContent(existing) && isDraftExpired(existing)) {
        state.clearDraft(level);
      }
    },

    setBusy: (stage, opts) =>
      set((state) => ({
        busyStage: stage,
        busyLevel: stage === "idle" ? null : (opts?.level ?? state.busyLevel),
        busyMessage:
          stage === "idle" ? "" : (opts?.message ?? state.busyMessage),
        uploadPct: stage === "idle" ? 0 : (opts?.uploadPct ?? state.uploadPct),
      })),
  }),
);
