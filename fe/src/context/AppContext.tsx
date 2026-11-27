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
import { useVocab, vocabKeys } from "@/features/vocab/hooks/useVocab";
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

interface AppContextValue {
  profile: UserProfile;
  lessons: Lesson[];
  vocab: VocabWord[];
  exercises: ExerciseItem[];
  syncProfile: (
    next: Partial<UserProfile> | ((prev: UserProfile) => UserProfile),
  ) => void;
  syncLessons: (next: Lesson[]) => void;
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
  bulkImportWords: (payload: {
    level: number;
    baseTitle: string;
    splitSize: number;
    picked: ExtractedVocabRow[];
    autoGenerateExercises?: boolean;
    extractedExercises?: ExtractedExerciseRow[];
  }) => Promise<boolean>;
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
  const { data: vocab = [] } = useVocab(false);
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

  const syncLessons = useCallback((next: Lesson[]) => setLessons(next), []);

  // Refs for stable callbacks (avoids tearing down callbacks / re-rendering consumers on data edits)
  const profileRef = useRef(profile);
  profileRef.current = profile;
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
      if (Array.isArray(data.vocab)) {
        queryClient.setQueryData<VocabWord[]>(vocabKeys.list, data.vocab);
      }
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

      queryClient.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) =>
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
          queryClient.setQueryData<VocabWord[]>(vocabKeys.list, (prev = []) => [
            ...res.words,
            ...prev,
          ]);
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

  const appCtxValue = useMemo<AppContextValue>(
    () => ({
      profile,
      lessons,
      vocab,
      exercises,
      syncProfile,
      syncLessons,
      apiConnected,
      showToast,
      dismissToast,
      toggleTheme,
      performDailyCheckin,
      adjustDailyTarget,
      setFocusLevel,
      toggleMissionDone,
      rateFlashcardWord,
      bulkImportWords,
    }),
    [
      profile,
      lessons,
      vocab,
      exercises,
      syncProfile,
      syncLessons,
      apiConnected,
      showToast,
      dismissToast,
      toggleTheme,
      performDailyCheckin,
      adjustDailyTarget,
      setFocusLevel,
      toggleMissionDone,
      rateFlashcardWord,
      bulkImportWords,
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
