import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_PROFILE,
  DEFAULT_WRITE_QUICK_POOL,
  MASCOT_QUOTES,
} from "../data/defaults";
import { api } from "../services/api";
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
  ToastItem,
  ToastVariant,
  UserProfile,
  VocabStatus,
  VocabWord,
} from "../types";
import { getTodayISO, spawnConfetti, spawnFloatingXP } from "../utils/helpers";

const STORAGE_KEY = "hsk_quest_30_clean_v4";

interface ClickCoords {
  clientX?: number;
  clientY?: number;
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
  toasts: ToastItem[];
  mascotSay: string;
  setMascotSay: (text: string) => void;
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
  addCustomWord: (input: {
    hanzi: string;
    pinyin: string;
    hanviet?: string;
    meaning: string;
    pos?: string;
    level: number;
    exampleZh?: string;
    exampleVi?: string;
  }) => Promise<void>;
  deleteCustomWord: (id: string) => Promise<void>;
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
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mascotSay, setMascotSay] = useState<string>(MASCOT_QUOTES[0]);
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  // Sync theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", profile.theme);
  }, [profile.theme]);

  // Persist local cache whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...profile,
          lessons,
          vocab,
          notes,
          handwritingGallery,
        }),
      );
    } catch {
      // Storage quota exceeded or restricted
    }
  }, [profile, lessons, vocab, notes, handwritingGallery]);

  // Initial fetch from NestJS + MongoDB backend (parallel)
  useEffect(() => {
    let active = true;
    async function hydrateFromApi() {
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
        if (Array.isArray(l)) setLessons(l);
        if (Array.isArray(v)) setVocab(v);
        if (Array.isArray(ex)) setExercises(ex);
        if (sc?.byLevel) setScoreSummaries(sc.byLevel);
        if (sc?.history) setScoreHistory(sc.history);
        if (Array.isArray(n)) setNotes(n);
        if (Array.isArray(hw)) setHandwritingGallery(hw);
        setApiConnected(true);
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

  const toastTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "dark") => {
      const MAX_TOASTS = 2;
      const getGroupKey = (msg: string) => {
        if (msg.startsWith("Đã chuyển sang giao diện")) return "theme";
        if (msg.includes("Đĩa CD")) return "cd";
        if (msg.startsWith("Đã đổi màu mực")) return "ink";
        if (msg.startsWith("Bạn đã điểm danh")) return "checkin";
        return msg;
      };

      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const groupKey = getGroupKey(message);

      setToasts((prev) => {
        // Remove duplicates or same-group toggle spam (e.g. spamming Theme / CD)
        const filtered = prev.filter((t) => {
          const sameGroup = getGroupKey(t.message) === groupKey;
          if (sameGroup) {
            const oldTimer = toastTimersRef.current.get(t.id);
            if (oldTimer) {
              window.clearTimeout(oldTimer);
              toastTimersRef.current.delete(t.id);
            }
          }
          return !sameGroup;
        });

        const next = [...filtered, { id, message, variant }];
        // Keep strictly at most MAX_TOASTS items on screen
        while (next.length > MAX_TOASTS) {
          const evicted = next.shift();
          if (evicted) {
            const oldTimer = toastTimersRef.current.get(evicted.id);
            if (oldTimer) {
              window.clearTimeout(oldTimer);
              toastTimersRef.current.delete(evicted.id);
            }
          }
        }
        return next;
      });

      const timerId = window.setTimeout(() => {
        toastTimersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2200);
      toastTimersRef.current.set(id, timerId);
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
    const nextTheme: ThemeMode = profile.theme === "zine" ? "diary" : "zine";
    setProfile((prev) => ({ ...prev, theme: nextTheme }));
    api.updateProfile({ theme: nextTheme }).catch(() => {});
    showToast(
      nextTheme === "zine"
        ? "Đã chuyển sang giao diện Editorial Zine"
        : "Đã chuyển sang giao diện Pastel Diary",
      "pink",
    );
  }, [profile.theme, showToast]);

  const performDailyCheckin = useCallback(
    async (ev?: ClickCoords) => {
      const today = getTodayISO();
      if (profile.lastCheckinISO === today) {
        showToast(
          "Bạn đã điểm danh hôm nay rồi! Hẹn gặp lại ngày mai nha 🐼",
          "pink",
        );
        return;
      }

      const nextStreak = profile.streak + 1;
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
      setMascotSay(`Tuyệt vời! Chuỗi ${nextStreak} ngày Streak cháy rực! 🔥`);

      try {
        const res = await api.dailyCheckin();
        if (res?.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
        setApiConnected(true);
      } catch {
        // Offline fallback already applied
      }
    },
    [profile.lastCheckinISO, profile.streak, showToast, triggerXpEffects],
  );

  const adjustDailyTarget = useCallback(async (delta: number) => {
    let nextTarget = 15;
    setProfile((prev) => {
      nextTarget = Math.max(5, Math.min(100, prev.dailyTarget + delta));
      return { ...prev, dailyTarget: nextTarget };
    });
    try {
      await api.updateProfile({ dailyTarget: nextTarget });
      setApiConnected(true);
    } catch {
      // Offline fallback already applied
    }
  }, []);

  const setFocusLevel = useCallback(async (lv: number) => {
    setProfile((prev) => ({ ...prev, focusLevel: lv }));
    setMascotSay(`Đã chuyển mục tiêu sang HSK ${lv}! Cố lên nha 🐼`);
    try {
      await api.updateProfile({ focusLevel: lv });
      setApiConnected(true);
    } catch {
      // Offline fallback
    }
  }, []);

  const toggleMissionDone = useCallback(
    async (key: keyof MissionsDone) => {
      const wasDone = !!profile.missionsDone[key];
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
    [profile.missionsDone, triggerXpEffects],
  );

  const rateFlashcardWord = useCallback(
    async (id: string, newStatus: VocabStatus, ev?: ClickCoords) => {
      const word = vocab.find((w) => w.id === id);
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
    [vocab, triggerXpEffects],
  );

  const changeWordStatus = useCallback(
    async (id: string, newStatus: VocabStatus) => {
      const word = vocab.find((w) => w.id === id);
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
    [vocab, showToast],
  );

  const addCustomWord = useCallback(
    async (input: {
      hanzi: string;
      pinyin: string;
      hanviet?: string;
      meaning: string;
      pos?: string;
      level: number;
      exampleZh?: string;
      exampleVi?: string;
    }) => {
      const defaultLesson = lessons.find((l) => l.level === input.level);
      const optimisticWord: VocabWord = {
        id: "cw_" + Date.now(),
        lessonId: defaultLesson ? defaultLesson.id : `hsk${input.level}-l1`,
        hanzi: input.hanzi.trim(),
        pinyin: input.pinyin.trim(),
        hanviet: (input.hanviet || "").trim().toUpperCase() || "TỰ THÊM",
        meaning: input.meaning.trim(),
        pos: (input.pos || "").trim() || "Từ vựng",
        level: input.level,
        status: "new",
        custom: true,
        note: "Từ vựng cá nhân do bạn tự thêm.",
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
    [lessons, triggerXpEffects],
  );

  const deleteCustomWord = useCallback(
    async (id: string) => {
      setVocab((prev) => prev.filter((w) => w.id !== id));
      showToast("Đã xóa từ cá nhân");
      try {
        await api.deleteVocab(id);
        setApiConnected(true);
      } catch {
        // Offline fallback
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
        // Offline local creation fallback
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
      setMascotSay(
        `Đỉnh nóc! Đã nhập ${picked.length} từ${exSuffix} vào HSK ${level} 🎉`,
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
      meta?: { level?: number; mode?: 'quiz' | 'listen' | 'match'; score?: number; combo?: number },
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
                mode: meta.mode ?? 'quiz',
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
      const localEx = exercises.find((e) => e.id === id);
      try {
        const res = await api.submitExercise(id, answer);
        if (res.correct) {
          setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, completed: true } : e)));
          if (res.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
          triggerXpEffects(res.xpEarned, 'Chính xác! Hoàn thành bài tập', ev);
          await refreshScores();
        } else {
          showToast(`Chưa chính xác! Đáp án đúng: ${res.correctAnswer}`, 'pink');
        }
        setApiConnected(true);
        return {
          correct: res.correct,
          correctAnswer: res.correctAnswer,
          explanation: res.explanation,
        };
      } catch {
        const correct = !!localEx && answer.trim() === localEx.correctAnswer.trim();
        if (correct && localEx) {
          setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, completed: true } : e)));
          setProfile((prev) => ({ ...prev, xp: prev.xp + (localEx.xpReward || 20) }));
          triggerXpEffects(localEx.xpReward || 20, 'Chính xác! Hoàn thành bài tập', ev);
        } else {
          showToast(`Chưa chính xác! Đáp án đúng: ${localEx?.correctAnswer || ''}`, 'pink');
        }
        return {
          correct,
          correctAnswer: localEx?.correctAnswer || '',
          explanation: localEx?.explanation || '',
        };
      }
    },
    [exercises, refreshScores, showToast, triggerXpEffects],
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
    let payload: any = {
      exportedAt: new Date().toISOString(),
      xp: profile.xp,
      streak: profile.streak,
      dailyTarget: profile.dailyTarget,
      weeklyLog: profile.weeklyLog,
      lessons,
      vocab,
      notes,
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
  }, [lessons, notes, profile, showToast, vocab]);

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

  return (
    <AppContext.Provider
      value={{
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
        toasts,
        mascotSay,
        setMascotSay,
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
        addCustomWord,
        deleteCustomWord,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
