import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_PROFILE,
  DEFAULT_WRITE_QUICK_POOL,
} from "@/data/defaults";
import { getTodayISO } from "@/lib/date-utils";
import { spawnConfetti, spawnFloatingXP } from "@/lib/fx-utils";
import { api } from "@/services/api";
import { useToastStore } from "@/stores/toast.store";
import {
  ExerciseItem,
  ExtractedExerciseRow,
  ExtractedVocabRow,
  HandwritingItem,
  Lesson,
  LevelScoreSummary,
  MindNote,
  MissionsDone,
  ScoreHistoryItem,
  ThemeMode,
  ToastVariant,
  UserProfile,
  VocabStatus,
  VocabWord,
} from "@/types";

const STORAGE_KEY = "hsk_quest_30_clean_v4";

interface ClickCoords {
  clientX?: number;
  clientY?: number;
}

export interface VocabFormInput {
  hanzi: string;
  pinyin: string;
  hanviet?: string;
  english?: string;
  meaning: string;
  pos?: string;
  level: number;
  lessonId?: string;
  status?: VocabStatus;
  note?: string;
  exampleZh?: string;
  exampleVi?: string;
}

interface AppContextValue {
  profile: UserProfile;
  lessons: Lesson[];
  vocab: VocabWord[];
  exercises: ExerciseItem[];
  scoreSummaries: LevelScoreSummary[];
  scoreHistory: ScoreHistoryItem[];
  notes: MindNote[];
  handwritingGallery: HandwritingItem[];
  writeQuickPool: string[];
  setWriteQuickPool: React.Dispatch<React.SetStateAction<string[]>>;
  apiConnected: boolean;
  showToast: (msg: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
  toggleTheme: () => void;
  performDailyCheckin: (ev?: ClickCoords) => Promise<void>;
  adjustDailyTarget: (delta: number) => Promise<void>;
  setFocusLevel: (lv: number) => Promise<void>;
  toggleMissionDone: (key: keyof MissionsDone) => Promise<void>;
  rateFlashcardWord: (
    id: string,
    status: VocabStatus,
    ev?: ClickCoords,
  ) => Promise<void>;
  changeWordStatus: (id: string, status: VocabStatus) => Promise<void>;
  batchChangeWordStatus: (ids: string[], status: VocabStatus) => Promise<void>;
  addCustomWord: (input: VocabFormInput) => Promise<void>;
  updateWord: (id: string, patch: Partial<VocabFormInput>) => Promise<void>;
  deleteCustomWord: (id: string) => Promise<void>;
  batchDeleteWords: (ids: string[]) => Promise<void>;
  bulkImportWords: (payload: {
    level: number;
    baseTitle: string;
    splitSize: number;
    picked: ExtractedVocabRow[];
    autoGenerateExercises?: boolean;
    extractedExercises?: ExtractedExerciseRow[];
  }) => Promise<void>;
  recordHanziQuizComplete: (char: string) => Promise<void>;
  saveHandwritingSnapshot: (
    img: string,
    caption: string,
    ev?: ClickCoords,
  ) => Promise<void>;
  deleteHandwritingItem: (id: string) => Promise<void>;
  recordGameWin: (
    xpAmount: number,
    label: string,
    ev?: ClickCoords,
    meta?: {
      level?: number;
      mode?: "quiz" | "listen" | "match";
      score?: number;
      combo?: number;
    },
  ) => Promise<void>;
  submitCourseExercise: (
    id: string,
    answer: string,
    ev?: ClickCoords,
  ) => Promise<{
    correct: boolean;
    correctAnswer: string;
    explanation: string;
  }>;
  saveNote: (
    payload: {
      id?: string | null;
      title: string;
      tag: string;
      content: string;
    },
    ev?: ClickCoords,
  ) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  exportDataJSON: () => Promise<void>;
  importDataJSON: (rawJson: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function readLocalCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const cached = useRef(readLocalCache()).current;

  const [profile, setProfile] = useState<UserProfile>(() => ({
    ...DEFAULT_PROFILE,
    ...(cached
      ? {
          theme: cached.theme || "zine",
          focusLevel:
            typeof cached.focusLevel === "number" ? cached.focusLevel : 5,
          xp: typeof cached.xp === "number" ? cached.xp : 0,
          streak: typeof cached.streak === "number" ? cached.streak : 0,
          lastCheckinISO: cached.lastCheckinISO || null,
          dailyTarget:
            typeof cached.dailyTarget === "number" ? cached.dailyTarget : 15,
          todayReviews:
            typeof cached.todayReviews === "number" ? cached.todayReviews : 0,
          writtenCountToday:
            typeof cached.writtenCountToday === "number"
              ? cached.writtenCountToday
              : 0,
          weeklyLog:
            Array.isArray(cached.weeklyLog) && cached.weeklyLog.length === 7
              ? cached.weeklyLog
              : DEFAULT_PROFILE.weeklyLog,
          missionsDone: cached.missionsDone
            ? { ...DEFAULT_PROFILE.missionsDone, ...cached.missionsDone }
            : DEFAULT_PROFILE.missionsDone,
        }
      : {}),
  }));

  const [lessons, setLessons] = useState<Lesson[]>(() =>
    Array.isArray(cached?.lessons) ? cached.lessons : [],
  );
  const [vocab, setVocab] = useState<VocabWord[]>(() =>
    Array.isArray(cached?.vocab) ? cached.vocab : [],
  );
  const [exercises, setExercises] = useState<ExerciseItem[]>(() =>
    Array.isArray(cached?.exercises) ? cached.exercises : [],
  );
  const [scoreSummaries, setScoreSummaries] = useState<LevelScoreSummary[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryItem[]>([]);
  const [notes, setNotes] = useState<MindNote[]>(() =>
    Array.isArray(cached?.notes) ? cached.notes : [],
  );
  const [handwritingGallery, setHandwritingGallery] = useState<
    HandwritingItem[]
  >(() =>
    Array.isArray(cached?.handwritingGallery) ? cached.handwritingGallery : [],
  );
  const [writeQuickPool, setWriteQuickPool] = useState<string[]>(
    DEFAULT_WRITE_QUICK_POOL,
  );
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  // Refs for stable callbacks (avoids tearing down callbacks / re-rendering consumers on data edits)
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const lessonsRef = useRef(lessons);
  lessonsRef.current = lessons;
  const vocabRef = useRef(vocab);
  vocabRef.current = vocab;
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // Sync theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", profile.theme);
  }, [profile.theme]);

  // Debounced + idle-scheduled localStorage persistence so large vocab lists never block UI clicks
  useEffect(() => {
    let idleId: number | null = null;
    const timer = window.setTimeout(() => {
      const persist = () => {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              ...profile,
              lessons,
              vocab,
              notes,
              // Cap cached base64 snapshots in localStorage to avoid exceeding 5MB quota
              handwritingGallery: handwritingGallery.slice(0, 6),
            }),
          );
        } catch {
          // Storage quota exceeded or restricted
        }
      };
      if ("requestIdleCallback" in window) {
        idleId = (window as any).requestIdleCallback(persist, { timeout: 1500 });
      } else {
        persist();
      }
    }, 600);

    return () => {
      window.clearTimeout(timer);
      if (idleId !== null && "cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, [profile, lessons, vocab, notes, handwritingGallery]);

  // Initial fetch from NestJS + MongoDB backend (single gzipped /bootstrap call with legacy fallback)
  useEffect(() => {
    let active = true;

    const applyHydratedData = (data: {
      profile: any;
      lessons: any;
      vocab: any;
      exercises: any;
      scores: any;
      notes: any;
      handwriting: any;
    }) => {
      const p = data.profile || {};
      setProfile({
        theme: p.theme || "zine",
        focusLevel: p.focusLevel ?? 5,
        xp: p.xp ?? 0,
        streak: p.streak ?? 0,
        lastCheckinISO: p.lastCheckinISO ?? null,
        dailyTarget: p.dailyTarget ?? 15,
        todayReviews: p.todayReviews ?? 0,
        writtenCountToday: p.writtenCountToday ?? 0,
        weeklyLog:
          Array.isArray(p.weeklyLog) && p.weeklyLog.length === 7
            ? p.weeklyLog
            : DEFAULT_PROFILE.weeklyLog,
        missionsDone: p.missionsDone
          ? { ...DEFAULT_PROFILE.missionsDone, ...p.missionsDone }
          : DEFAULT_PROFILE.missionsDone,
      });
      if (Array.isArray(data.lessons)) setLessons(data.lessons);
      if (Array.isArray(data.vocab)) setVocab(data.vocab);
      if (Array.isArray(data.exercises)) setExercises(data.exercises);
      if (data.scores?.byLevel) setScoreSummaries(data.scores.byLevel);
      if (data.scores?.history) setScoreHistory(data.scores.history);
      if (Array.isArray(data.notes)) setNotes(data.notes);
      if (Array.isArray(data.handwriting)) setHandwritingGallery(data.handwriting);
      setApiConnected(true);
    };

    async function hydrateFromApi() {
      try {
        const boot = await api.bootstrap();
        if (!active) return;
        applyHydratedData(boot);
        return;
      } catch {
        // Fallback to parallel endpoints if running against an older backend instance
      }

      try {
        const [p, l, v, ex, sc, n, hw] = await Promise.all([
          api.getProfile(),
          api.getLessons(),
          api.getVocab(),
          api.getExercises(),
          api.getScores(),
          api.getNotes(),
          api.getHandwriting(),
        ]);
        if (!active) return;
        applyHydratedData({
          profile: p,
          lessons: l,
          vocab: v,
          exercises: ex,
          scores: sc,
          notes: n,
          handwriting: hw,
        });
      } catch {
        if (active) setApiConnected(false);
      }
    }

    hydrateFromApi();
    return () => {
      active = false;
    };
  }, []);

  // Preload Web Speech voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    useToastStore.getState().dismissToast(id);
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "dark") => {
      useToastStore.getState().showToast(message, variant);
    },
    [],
  );

  const triggerXpEffects = useCallback(
    (amount: number, toastLabel?: string, ev?: ClickCoords) => {
      spawnFloatingXP(amount, ev);
      if (amount >= 15) spawnConfetti(ev, 12);
      if (toastLabel) showToast(`${toastLabel} (+${amount} XP)`, "yellow");
    },
    [showToast],
  );

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode =
      profileRef.current.theme === "zine" ? "diary" : "zine";
    setProfile((prev) => ({ ...prev, theme: nextTheme }));
    api.updateProfile({ theme: nextTheme }).catch(() => {});
    showToast(
      nextTheme === "zine"
        ? "Đã chuyển sang giao diện Editorial Zine"
        : "Đã chuyển sang giao diện Pastel Diary",
      "pink",
    );
  }, [showToast]);

  const performDailyCheckin = useCallback(
    async (ev?: ClickCoords) => {
      const today = getTodayISO();
      const cur = profileRef.current;
      if (cur.lastCheckinISO === today) {
        showToast(
          "Bạn đã điểm danh hôm nay rồi! Hẹn gặp lại ngày mai nha 🐼",
          "pink",
        );
        return;
      }

      const nextStreak = cur.streak + 1;
      setProfile((prev) => ({
        ...prev,
        lastCheckinISO: today,
        streak: prev.streak + 1,
        xp: prev.xp + 15,
      }));
      triggerXpEffects(
        15,
        `Điểm danh thành công! Chuỗi ${nextStreak} ngày`,
        ev,
      );

      try {
        const res = await api.dailyCheckin();
        if (res?.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
        setApiConnected(true);
      } catch {
        // Offline fallback already applied
      }
    },
    [showToast, triggerXpEffects],
  );

  const adjustDailyTarget = useCallback(async (delta: number) => {
    const nextTarget = Math.max(
      5,
      Math.min(100, profileRef.current.dailyTarget + delta),
    );
    setProfile((prev) => ({ ...prev, dailyTarget: nextTarget }));
    try {
      await api.updateProfile({ dailyTarget: nextTarget });
      setApiConnected(true);
    } catch {
      // Offline fallback already applied
    }
  }, []);

  const setFocusLevel = useCallback(async (lv: number) => {
    setProfile((prev) => ({ ...prev, focusLevel: lv }));
    try {
      await api.updateProfile({ focusLevel: lv });
      setApiConnected(true);
    } catch {
      // Offline fallback
    }
  }, []);

  const toggleMissionDone = useCallback(
    async (key: keyof MissionsDone) => {
      const wasDone = !!profileRef.current.missionsDone[key];
      const nextDone = !wasDone;
      setProfile((prev) => ({
        ...prev,
        xp: nextDone ? prev.xp + 15 : prev.xp,
        missionsDone: { ...prev.missionsDone, [key]: nextDone },
      }));
      if (nextDone) triggerXpEffects(15, "Hoàn thành nhiệm vụ hôm nay");

      try {
        const res = await api.toggleMission(key, nextDone);
        if (res?.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [triggerXpEffects],
  );

  const rateFlashcardWord = useCallback(
    async (id: string, newStatus: VocabStatus, ev?: ClickCoords) => {
      const word = vocabRef.current.find((w) => w.id === id);
      if (!word) return;

      const xpMap: Record<VocabStatus, number> = {
        review: 5,
        learning: 10,
        mastered: 20,
        new: 0,
      };
      const labelMap: Record<string, string> = {
        review: `Đánh dấu "${word.hanzi}" Cần chú ý`,
        learning: `Đánh dấu "${word.hanzi}" Đang học`,
        mastered: `Tuyệt vời! Đã thuộc "${word.hanzi}"`,
      };
      const xpGain = xpMap[newStatus] || 0;

      setVocab((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w)),
      );
      setProfile((prev) => {
        const nextReviews = prev.todayReviews + 1;
        const nextWeekly = [...prev.weeklyLog];
        nextWeekly[6] = nextReviews;
        return {
          ...prev,
          xp: prev.xp + xpGain,
          todayReviews: nextReviews,
          weeklyLog: nextWeekly,
          missionsDone:
            nextReviews >= 5
              ? { ...prev.missionsDone, m1: true }
              : prev.missionsDone,
        };
      });
      triggerXpEffects(xpGain, labelMap[newStatus], ev);

      try {
        const res = await api.updateVocabStatus(id, newStatus, true);
        if (res?.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [triggerXpEffects],
  );

  const changeWordStatus = useCallback(
    async (id: string, newStatus: VocabStatus) => {
      const word = vocabRef.current.find((w) => w.id === id);
      if (!word) return;
      setVocab((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w)),
      );
      showToast(`Đã cập nhật trạng thái "${word.hanzi}"`);
      try {
        await api.updateVocabStatus(id, newStatus, false);
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [showToast],
  );

  const batchChangeWordStatus = useCallback(
    async (ids: string[], newStatus: VocabStatus) => {
      const idSet = new Set(ids);
      if (!idSet.size) return;
      setVocab((prev) =>
        prev.map((w) => (idSet.has(w.id) ? { ...w, status: newStatus } : w)),
      );
      const labelMap: Record<VocabStatus, string> = {
        mastered: "Đã thuộc",
        learning: "Đang học",
        review: "Cần chú ý",
        new: "Từ mới",
      };
      showToast(
        `Đã chuyển ${idSet.size} từ sang "${labelMap[newStatus]}"`,
        "yellow",
      );
      try {
        await api.batchUpdateVocabStatus(Array.from(idSet), newStatus);
        setApiConnected(true);
      } catch {
        // Fallback per-item if running older backend without batch route
        await Promise.allSettled(
          Array.from(idSet).map((id) => api.updateVocabStatus(id, newStatus, false)),
        );
      }
    },
    [showToast],
  );

  const addCustomWord = useCallback(
    async (input: VocabFormInput) => {
      const defaultLesson = lessonsRef.current.find(
        (l) => l.level === input.level,
      );
      const optimisticWord: VocabWord = {
        id: "cw_" + Date.now(),
        lessonId:
          input.lessonId ||
          (defaultLesson ? defaultLesson.id : `hsk${input.level}-l1`),
        hanzi: input.hanzi.trim(),
        pinyin: input.pinyin.trim(),
        hanviet: (input.hanviet || "").trim().toUpperCase() || "TỰ THÊM",
        english: (input.english || "").trim(),
        meaning: input.meaning.trim(),
        pos: (input.pos || "").trim() || "Từ vựng",
        level: input.level,
        status: input.status || "new",
        custom: true,
        note: (input.note || "").trim() || "Từ vựng cá nhân do bạn tự thêm.",
        exampleZh: (input.exampleZh || "").trim() || input.hanzi.trim(),
        exampleVi: (input.exampleVi || "").trim() || input.meaning.trim(),
      };

      setVocab((prev) => [optimisticWord, ...prev]);
      setProfile((prev) => ({ ...prev, xp: prev.xp + 10 }));
      triggerXpEffects(10, `Đã thêm từ "${optimisticWord.hanzi}"`);

      try {
        const res = await api.createVocab(input);
        if (res?.word) {
          setVocab((prev) =>
            prev.map((w) => (w.id === optimisticWord.id ? res.word : w)),
          );
        }
        if (res?.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [triggerXpEffects],
  );

  const updateWord = useCallback(
    async (id: string, patch: Partial<VocabFormInput>) => {
      const normalized: Partial<VocabWord> = {
        ...patch,
        ...(typeof patch.hanzi === "string"
          ? { hanzi: patch.hanzi.trim() }
          : {}),
        ...(typeof patch.pinyin === "string"
          ? { pinyin: patch.pinyin.trim() }
          : {}),
        ...(typeof patch.hanviet === "string"
          ? { hanviet: patch.hanviet.trim().toUpperCase() }
          : {}),
        ...(typeof patch.english === "string"
          ? { english: patch.english.trim() }
          : {}),
        ...(typeof patch.meaning === "string"
          ? { meaning: patch.meaning.trim() }
          : {}),
        ...(typeof patch.pos === "string" ? { pos: patch.pos.trim() } : {}),
        ...(typeof patch.note === "string" ? { note: patch.note.trim() } : {}),
        ...(typeof patch.exampleZh === "string"
          ? { exampleZh: patch.exampleZh.trim() }
          : {}),
        ...(typeof patch.exampleVi === "string"
          ? { exampleVi: patch.exampleVi.trim() }
          : {}),
      };

      setVocab((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...normalized } : w)),
      );
      showToast(
        `Đã lưu thay đổi cho "${normalized.hanzi || "từ vựng"}"`,
        "yellow",
      );

      try {
        const updated = await api.updateVocab(id, normalized);
        if (updated?.id) {
          setVocab((prev) =>
            prev.map((w) => (w.id === id ? { ...w, ...updated } : w)),
          );
        }
        setApiConnected(true);
      } catch {
        // Offline fallback already applied
      }
    },
    [showToast],
  );

  const deleteCustomWord = useCallback(
    async (id: string) => {
      const target = vocabRef.current.find((w) => w.id === id);
      setVocab((prev) => prev.filter((w) => w.id !== id));
      showToast(
        target ? `Đã xóa từ "${target.hanzi}"` : "Đã xóa từ vựng",
        "pink",
      );
      try {
        await api.deleteVocab(id);
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [showToast],
  );

  const batchDeleteWords = useCallback(
    async (ids: string[]) => {
      const idSet = new Set(ids);
      if (!idSet.size) return;
      setVocab((prev) => prev.filter((w) => !idSet.has(w.id)));
      showToast(`Đã xóa ${idSet.size} từ khỏi kho từ`, "pink");
      try {
        await api.batchDeleteVocab(Array.from(idSet));
        setApiConnected(true);
      } catch {
        await Promise.allSettled(
          Array.from(idSet).map((id) => api.deleteVocab(id)),
        );
      }
    },
    [showToast],
  );

  const refreshScores = useCallback(async () => {
    try {
      const sc = await api.getScores();
      if (sc?.byLevel) setScoreSummaries(sc.byLevel);
      if (sc?.history) setScoreHistory(sc.history);
    } catch {
      // ignore offline
    }
  }, []);

  const bulkImportWords = useCallback(
    async ({
      level,
      baseTitle,
      splitSize,
      picked,
      autoGenerateExercises = true,
      extractedExercises = [],
    }: {
      level: number;
      baseTitle: string;
      splitSize: number;
      picked: ExtractedVocabRow[];
      autoGenerateExercises?: boolean;
      extractedExercises?: ExtractedExerciseRow[];
    }) => {
      const chunkSize = splitSize > 0 ? splitSize : picked.length;
      const totalChunks = Math.ceil(picked.length / chunkSize);
      let createdExerciseCount = 0;

      try {
        const res = await api.bulkImportLessons({
          level,
          baseTitle,
          splitSize,
          autoGenerateExercises,
          words: picked.map((item) => ({
            hanzi: item.hanzi,
            pinyin: item.pinyin,
            english: item.english,
            meaning: item.meaning,
            exampleZh: item.exampleZh,
            exampleVi: item.exampleVi,
          })),
          extractedExercises,
        });
        setLessons((prev) => [...res.lessons, ...prev]);
        setVocab((prev) => [...res.words, ...prev]);
        if (Array.isArray(res.exercises) && res.exercises.length) {
          setExercises((prev) => [...res.exercises, ...prev]);
          createdExerciseCount = res.exercises.length;
        }
        if (res.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
        await refreshScores();
        setApiConnected(true);
      } catch {
        const newLessons: Lesson[] = [];
        const newWords: VocabWord[] = [];
        const stamp = Date.now();
        for (let c = 0; c < totalChunks; c++) {
          const slice = picked.slice(c * chunkSize, (c + 1) * chunkSize);
          const lessonId = `hsk${level}-doc-${stamp}-${c + 1}`;
          const title =
            totalChunks > 1
              ? `${baseTitle} — Phần ${c + 1} (${slice.length} từ)`
              : baseTitle;
          newLessons.push({
            id: lessonId,
            level,
            title,
            desc: `Tự động trích xuất ${slice.length} từ vựng từ tài liệu tải lên.`,
            fromFile: true,
          });
          slice.forEach((item, i) => {
            newWords.push({
              id: `docw_${stamp}_${c}_${i}`,
              lessonId,
              hanzi: item.hanzi,
              pinyin: item.pinyin || "—",
              hanviet: "TỪ GIÁO TRÌNH",
              english: item.english || "",
              meaning: item.meaning || "Từ mới từ file tải lên",
              pos: "Từ vựng",
              level,
              status: "new",
              custom: true,
              note: `Nhập từ "${title}".`,
              exampleZh: item.exampleZh || item.hanzi,
              exampleVi: item.exampleVi || item.meaning || item.hanzi,
            });
          });
        }
        setLessons((prev) => [...newLessons, ...prev]);
        setVocab((prev) => [...newWords, ...prev]);
        setProfile((prev) => ({ ...prev, xp: prev.xp + 30 }));
      }

      const exSuffix =
        createdExerciseCount > 0 ? ` & tạo ${createdExerciseCount} bài tập` : "";
      triggerXpEffects(
        30,
        `Đã chèn ${picked.length} từ (${totalChunks} bài)${exSuffix} vào HSK ${level}`,
      );
    },
    [triggerXpEffects, refreshScores],
  );

  const recordHanziQuizComplete = useCallback(
    async (char: string) => {
      setProfile((prev) => {
        const nextCount = prev.writtenCountToday + 1;
        return {
          ...prev,
          writtenCountToday: nextCount,
          xp: prev.xp + 10,
          missionsDone:
            nextCount >= 5
              ? { ...prev.missionsDone, m3: true }
              : prev.missionsDone,
        };
      });
      triggerXpEffects(10, `Hoàn thành đồ nét chữ "${char}"`);
      try {
        const updated = await api.recordWritten(10);
        setProfile((prev) => ({ ...prev, ...updated }));
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [triggerXpEffects],
  );

  const saveHandwritingSnapshot = useCallback(
    async (img: string, captionRaw: string, ev?: ClickCoords) => {
      const caption =
        captionRaw.trim() ||
        `Bài viết ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
      const optimistic: HandwritingItem = {
        id: "hw_" + Date.now(),
        img,
        caption,
        date: new Date().toLocaleDateString("vi-VN"),
      };

      setHandwritingGallery((prev) => [optimistic, ...prev].slice(0, 15));
      setProfile((prev) => {
        const nextCount = prev.writtenCountToday + 1;
        return {
          ...prev,
          writtenCountToday: nextCount,
          xp: prev.xp + 10,
          missionsDone:
            nextCount >= 5
              ? { ...prev.missionsDone, m3: true }
              : prev.missionsDone,
        };
      });
      triggerXpEffects(10, "Đã lưu bài viết tay vào sổ tay", ev);

      try {
        const res = await api.createHandwriting({ img, caption });
        if (res?.item) {
          setHandwritingGallery((prev) =>
            prev.map((item) => (item.id === optimistic.id ? res.item : item)),
          );
        }
        if (res?.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [triggerXpEffects],
  );

  const deleteHandwritingItem = useCallback(
    async (id: string) => {
      setHandwritingGallery((prev) => prev.filter((item) => item.id !== id));
      showToast("Đã xóa ảnh khỏi sổ tay");
      try {
        await api.deleteHandwriting(id);
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [showToast],
  );

  const recordGameWin = useCallback(
    async (
      xpAmount: number,
      label: string,
      ev?: ClickCoords,
      meta?: {
        level?: number;
        mode?: "quiz" | "listen" | "match";
        score?: number;
        combo?: number;
      },
    ) => {
      setProfile((prev) => {
        const nextReviews = prev.todayReviews + 1;
        const nextWeekly = [...prev.weeklyLog];
        nextWeekly[6] = nextReviews;
        return {
          ...prev,
          xp: prev.xp + xpAmount,
          todayReviews: nextReviews,
          weeklyLog: nextWeekly,
          missionsDone: {
            ...prev.missionsDone,
            m1: nextReviews >= 5 ? true : prev.missionsDone.m1,
            m4: true,
          },
        };
      });
      triggerXpEffects(xpAmount, label, ev);

      try {
        const [updated] = await Promise.all([
          api.recordReview(xpAmount, true),
          meta
            ? api.recordScore({
                level: meta.level ?? 0,
                mode: meta.mode ?? "quiz",
                score: meta.score ?? xpAmount,
                combo: meta.combo ?? 1,
                xpEarned: xpAmount,
                detail: label,
              })
            : Promise.resolve(null),
        ]);
        setProfile((prev) => ({ ...prev, ...updated }));
        await refreshScores();
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [triggerXpEffects, refreshScores],
  );

  const submitCourseExercise = useCallback(
    async (id: string, answer: string, ev?: ClickCoords) => {
      const localEx = exercisesRef.current.find((e) => e.id === id);
      try {
        const res = await api.submitExercise(id, answer);
        if (res.correct) {
          setExercises((prev) =>
            prev.map((e) => (e.id === id ? { ...e, completed: true } : e)),
          );
          if (res.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
          triggerXpEffects(res.xpEarned, "Chính xác! Hoàn thành bài tập", ev);
          await refreshScores();
        } else {
          showToast(
            `Chưa chính xác! Đáp án đúng: ${res.correctAnswer}`,
            "pink",
          );
        }
        setApiConnected(true);
        return {
          correct: res.correct,
          correctAnswer: res.correctAnswer,
          explanation: res.explanation,
        };
      } catch {
        const correct =
          !!localEx && answer.trim() === localEx.correctAnswer.trim();
        if (correct && localEx) {
          setExercises((prev) =>
            prev.map((e) => (e.id === id ? { ...e, completed: true } : e)),
          );
          setProfile((prev) => ({
            ...prev,
            xp: prev.xp + (localEx.xpReward || 20),
          }));
          triggerXpEffects(
            localEx.xpReward || 20,
            "Chính xác! Hoàn thành bài tập",
            ev,
          );
        } else {
          showToast(
            `Chưa chính xác! Đáp án đúng: ${localEx?.correctAnswer || ""}`,
            "pink",
          );
        }
        return {
          correct,
          correctAnswer: localEx?.correctAnswer || "",
          explanation: localEx?.explanation || "",
        };
      }
    },
    [refreshScores, showToast, triggerXpEffects],
  );

  const saveNote = useCallback(
    async (
      payload: {
        id?: string | null;
        title: string;
        tag: string;
        content: string;
      },
      ev?: ClickCoords,
    ) => {
      const title = payload.title.trim();
      const content = payload.content.trim();
      if (!title || !content) {
        showToast("Vui lòng nhập đủ tiêu đề và nội dung ghi chú.", "pink");
        return;
      }

      if (payload.id) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === payload.id
              ? { ...n, title, tag: payload.tag, content }
              : n,
          ),
        );
        showToast("Đã cập nhật ghi chú");
        try {
          await api.updateNote(payload.id, {
            title,
            tag: payload.tag,
            content,
          });
          setApiConnected(true);
        } catch {
          // Offline fallback
        }
      } else {
        const optimistic: MindNote = {
          id: "note_" + Date.now(),
          title,
          tag: payload.tag,
          content,
          date: new Date().toLocaleDateString("vi-VN"),
        };
        setNotes((prev) => [optimistic, ...prev]);
        setProfile((prev) => ({ ...prev, xp: prev.xp + 10 }));
        triggerXpEffects(10, "Đã lưu ghi chú mới", ev);
        try {
          const res = await api.createNote({
            title,
            tag: payload.tag,
            content,
          });
          if (res?.note) {
            setNotes((prev) =>
              prev.map((n) => (n.id === optimistic.id ? res.note : n)),
            );
          }
          if (res?.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
          setApiConnected(true);
        } catch {
          // Offline fallback
        }
      }
    },
    [showToast, triggerXpEffects],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      showToast("Đã xóa ghi chú");
      try {
        await api.deleteNote(id);
        setApiConnected(true);
      } catch {
        // Offline fallback
      }
    },
    [showToast],
  );

  const exportDataJSON = useCallback(async () => {
    const p = profileRef.current;
    let payload: any = {
      exportedAt: new Date().toISOString(),
      xp: p.xp,
      streak: p.streak,
      dailyTarget: p.dailyTarget,
      weeklyLog: p.weeklyLog,
      lessons: lessonsRef.current,
      vocab: vocabRef.current,
      notes: notesRef.current,
    };
    try {
      payload = await api.exportBackup();
      setApiConnected(true);
    } catch {
      // Export local snapshot if API offline
    }
    const dataStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hsk-quest-3.0-backup-${getTodayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã xuất file Backup JSON thành công!", "yellow");
  }, [showToast]);

  const importDataJSON = useCallback(
    async (rawJson: string) => {
      try {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed.lessons) && parsed.lessons.length > 0)
          setLessons(parsed.lessons);
        if (Array.isArray(parsed.vocab) && parsed.vocab.length > 0)
          setVocab(parsed.vocab);
        if (Array.isArray(parsed.notes)) setNotes(parsed.notes);
        setProfile((prev) => ({
          ...prev,
          xp: typeof parsed.xp === "number" ? parsed.xp : prev.xp,
          streak:
            typeof parsed.streak === "number" ? parsed.streak : prev.streak,
          dailyTarget:
            typeof parsed.dailyTarget === "number"
              ? parsed.dailyTarget
              : prev.dailyTarget,
          weeklyLog:
            Array.isArray(parsed.weeklyLog) && parsed.weeklyLog.length === 7
              ? parsed.weeklyLog
              : prev.weeklyLog,
        }));

        try {
          await api.importBackup(parsed);
          setApiConnected(true);
        } catch {
          // Offline restore still succeeds
        }
        showToast("Khôi phục dữ liệu từ file JSON thành công!", "yellow");
      } catch {
        showToast("File JSON không hợp lệ.", "pink");
      }
    },
    [showToast],
  );

  const appCtxValue = useMemo<AppContextValue>(
    () => ({
      profile,
      lessons,
      vocab,
      exercises,
      scoreSummaries,
      scoreHistory,
      notes,
      handwritingGallery,
      writeQuickPool,
      setWriteQuickPool,
      apiConnected,
      showToast,
      dismissToast,
      toggleTheme,
      performDailyCheckin,
      adjustDailyTarget,
      setFocusLevel,
      toggleMissionDone,
      rateFlashcardWord,
      changeWordStatus,
      batchChangeWordStatus,
      addCustomWord,
      updateWord,
      deleteCustomWord,
      batchDeleteWords,
      bulkImportWords,
      recordHanziQuizComplete,
      saveHandwritingSnapshot,
      deleteHandwritingItem,
      recordGameWin,
      submitCourseExercise,
      saveNote,
      deleteNote,
      exportDataJSON,
      importDataJSON,
    }),
    [
      profile,
      lessons,
      vocab,
      exercises,
      scoreSummaries,
      scoreHistory,
      notes,
      handwritingGallery,
      writeQuickPool,
      apiConnected,
      showToast,
      dismissToast,
      toggleTheme,
      performDailyCheckin,
      adjustDailyTarget,
      setFocusLevel,
      toggleMissionDone,
      rateFlashcardWord,
      changeWordStatus,
      batchChangeWordStatus,
      addCustomWord,
      updateWord,
      deleteCustomWord,
      batchDeleteWords,
      bulkImportWords,
      recordHanziQuizComplete,
      saveHandwritingSnapshot,
      deleteHandwritingItem,
      recordGameWin,
      submitCourseExercise,
      saveNote,
      deleteNote,
      exportDataJSON,
      importDataJSON,
    ],
  );

  return (
    <AppContext.Provider value={appCtxValue}>
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
