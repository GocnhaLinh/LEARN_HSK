import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_PROFILE } from "@/data/defaults";
import { exercisesKeys } from "@/features/exercises/hooks/useExercisesQuery";
import { notesKeys } from "@/features/notes/hooks/useNotes";
import { handwritingKeys } from "@/features/writing/hooks/useHandwriting";
import { getTodayISO } from "@/lib/date-utils";
import { spawnConfetti, spawnFloatingXP } from "@/lib/fx-utils";
import { queryClient } from "@/lib/query-client";
import { api } from "@/services/api";
import { useToastStore } from "@/stores/toast.store";
import {
  ExerciseItem,
  ExtractedExerciseRow,
  ExtractedVocabRow,
  HandwritingItem,
  Lesson,
  MindNote,
  MissionsDone,
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
  syncProfile: (
    next: Partial<UserProfile> | ((prev: UserProfile) => UserProfile),
  ) => void;
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
  }) => Promise<boolean>;
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
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  const syncProfile = useCallback(
    (next: Partial<UserProfile> | ((prev: UserProfile) => UserProfile)) => {
      if (typeof next === "function") {
        setProfile(next);
      } else {
        setProfile((prev) => ({ ...prev, ...next }));
      }
    },
    [],
  );

  // Refs for stable callbacks (avoids tearing down callbacks / re-rendering consumers on data edits)
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const lessonsRef = useRef(lessons);
  lessonsRef.current = lessons;
  const vocabRef = useRef(vocab);
  vocabRef.current = vocab;

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
              notes: queryClient.getQueryData<MindNote[]>(notesKeys.list) || [],
              // Cap cached base64 snapshots in localStorage to avoid exceeding 5MB quota
              handwritingGallery: (
                queryClient.getQueryData<HandwritingItem[]>(handwritingKeys.list) || []
              ).slice(0, 6),
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
  }, [profile, lessons, vocab]);

  // Initial fetch from NestJS + MongoDB backend (single gzipped /bootstrap call with legacy fallback)
  useEffect(() => {
    let active = true;

    const applyHydratedData = (data: {
      profile: any;
      lessons: any;
      vocab: any;
      exercises: any;
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
      if (Array.isArray(data.notes)) {
        queryClient.setQueryData<MindNote[]>(notesKeys.list, data.notes);
      }
      if (Array.isArray(data.handwriting)) {
        queryClient.setQueryData<HandwritingItem[]>(
          handwritingKeys.list,
          data.handwriting,
        );
      }
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
        const results = await Promise.allSettled([
          api.getProfile(),
          api.getLessons(),
          api.getVocab(),
          api.getExercises(),
          api.getNotes(),
          api.getHandwriting(),
        ]);
        if (!active) return;

        const [pRes, lRes, vRes, exRes, nRes, hwRes] = results;
        const anySuccess = results.some((r) => r.status === "fulfilled");
        if (!anySuccess) {
          setApiConnected(false);
          return;
        }

        applyHydratedData({
          profile: pRes.status === "fulfilled" ? pRes.value : profileRef.current,
          lessons: lRes.status === "fulfilled" ? lRes.value : undefined,
          vocab: vRes.status === "fulfilled" ? vRes.value : undefined,
          exercises: exRes.status === "fulfilled" ? exRes.value : undefined,
          notes: nRes.status === "fulfilled" ? nRes.value : undefined,
          handwriting: hwRes.status === "fulfilled" ? hwRes.value : undefined,
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
      const chunkSize = splitSize > 0 ? splitSize : Math.max(1, picked.length);
      const totalChunks = picked.length > 0 ? Math.ceil(picked.length / chunkSize) : extractedExercises.length > 0 ? 1 : 0;
      let createdExerciseCount = 0;

      let savedToDb = false;

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
        if (Array.isArray(res.lessons) && res.lessons.length) {
          setLessons((prev) => [...res.lessons, ...prev]);
        }
        if (Array.isArray(res.words) && res.words.length) {
          setVocab((prev) => [...res.words, ...prev]);
        }
        if (Array.isArray(res.exercises) && res.exercises.length) {
          setExercises((prev) => [...res.exercises, ...prev]);
          queryClient.setQueryData<ExerciseItem[]>(
            exercisesKeys.byLevel(level),
            (prev = []) => [...res.exercises, ...prev],
          );
          void queryClient.invalidateQueries({
            queryKey: exercisesKeys.byLevel(level),
          });
          createdExerciseCount = res.exercises.length;
        }
        if (res.profile) setProfile((prev) => ({ ...prev, ...res.profile }));
        setApiConnected(true);
        savedToDb = true;
      } catch (err: any) {
        setApiConnected(false);
        showToast(
          `Không kết nối được Backend (${err?.message || "Port 3001 chưa chạy"}) — chưa lưu vào MongoDB! Hãy kiểm tra terminal npm run dev:be.`,
          "pink",
        );
        return false;
      }

      if (!savedToDb) return false;

      const summaryMsg =
        picked.length > 0
          ? `Đã lưu ${picked.length} từ (${totalChunks} bài)${
              createdExerciseCount > 0 ? ` & ${createdExerciseCount} bài tập tự nhập` : ""
            } vào MongoDB HSK ${level}`
          : `Đã lưu ${createdExerciseCount} câu bài tập vào MongoDB HSK ${level}`;
      triggerXpEffects(30, summaryMsg);
      return true;
    },
    [showToast, triggerXpEffects],
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
      notes: queryClient.getQueryData<MindNote[]>(notesKeys.list) || [],
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
        if (Array.isArray(parsed.notes)) {
          queryClient.setQueryData<MindNote[]>(notesKeys.list, parsed.notes);
        }
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
      syncProfile,
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
      exportDataJSON,
      importDataJSON,
    }),
    [
      profile,
      lessons,
      vocab,
      exercises,
      syncProfile,
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
