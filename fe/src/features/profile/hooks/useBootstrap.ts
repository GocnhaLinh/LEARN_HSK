import { useEffect } from 'react';
import { profileApi } from '@/features/profile/api/profile.api';
import { useProfileStore } from '@/features/profile/stores/profile.store';
import { normalizeProfile } from '@/features/profile/utils/profile-stats';
import { queryClient } from '@/lib/query-client';
import {
  coursesKeys,
  exercisesKeys,
  handwritingKeys,
  notesKeys,
  vocabKeys,
} from '@/lib/query-keys';
import { APP_STORAGE_KEY, readAppCache } from '@/lib/storage-cache';
import type {
  ExerciseItem,
  HandwritingItem,
  Lesson,
  MindNote,
  UserProfile,
  VocabWord,
} from '@/types';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

const PERSISTED_CACHE_KEYS = new Set([
  `${coursesKeys.lessons[0]}:${coursesKeys.lessons[1]}`,
  `${vocabKeys.list[0]}:${vocabKeys.list[1]}`,
  `${notesKeys.list[0]}:${notesKeys.list[1]}`,
  `${handwritingKeys.list[0]}:${handwritingKeys.list[1]}`,
]);

function isPersistedQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    queryKey.length === 2 &&
    PERSISTED_CACHE_KEYS.has(`${String(queryKey[0])}:${String(queryKey[1])}`)
  );
}

interface HydrateBundle {
  profile?: Partial<UserProfile>;
  lessons?: Lesson[];
  vocab?: VocabWord[];
  exercises?: ExerciseItem[];
  notes?: MindNote[];
  handwriting?: HandwritingItem[];
}

function hydrateCaches(data: HydrateBundle) {
  const { syncProfile, setApiConnected } = useProfileStore.getState();
  if (data.profile) syncProfile(normalizeProfile(data.profile));

  if (Array.isArray(data.lessons)) {
    queryClient.setQueryData<Lesson[]>(coursesKeys.lessons, data.lessons);
  }
  if (Array.isArray(data.vocab)) {
    queryClient.setQueryData<VocabWord[]>(vocabKeys.list, data.vocab);
  }
  if (Array.isArray(data.exercises)) {
    queryClient.setQueryData<ExerciseItem[]>(exercisesKeys.all, data.exercises);
    const byLevel = new Map<number, ExerciseItem[]>();
    for (const ex of data.exercises) {
      const bucket = byLevel.get(ex.level);
      if (bucket) bucket.push(ex);
      else byLevel.set(ex.level, [ex]);
    }
    byLevel.forEach((items, lv) => {
      queryClient.setQueryData<ExerciseItem[]>(exercisesKeys.byLevel(lv), items);
    });
  }
  if (Array.isArray(data.notes)) {
    queryClient.setQueryData<MindNote[]>(notesKeys.list, data.notes);
  }
  if (Array.isArray(data.handwriting)) {
    queryClient.setQueryData<HandwritingItem[]>(handwritingKeys.list, data.handwriting);
  }
  setApiConnected(true);
}

/**
 * Root app bootstrapper (mounted once in App.tsx, causes zero root re-renders):
 * - Syncs `data-theme` attribute to <html>
 * - Hydrates Zustand + React Query caches via single gzipped GET /api/bootstrap (with lazy fallback)
 * - Debounces + idle-schedules offline localStorage snapshots (flushing on pagehide)
 * - Preloads Web Speech synthesis voices
 */
export function useBootstrap() {
  // 1. Sync theme attribute to <html> immediately & on subsequent profile theme changes
  useEffect(() => {
    const applyTheme = (theme: string) =>
      document.documentElement.setAttribute('data-theme', theme);
    applyTheme(useProfileStore.getState().profile.theme);

    return useProfileStore.subscribe((state, prev) => {
      if (state.profile.theme !== prev.profile.theme) {
        applyTheme(state.profile.theme);
      }
    });
  }, []);

  // 2. Debounced + idle-scheduled localStorage persistence on profile/cache updates
  useEffect(() => {
    const win = window as IdleWindow;
    let timer: number | null = null;
    let idleId: number | null = null;

    const persistSnapshot = () => {
      try {
        const prev = readAppCache();
        const { profile } = useProfileStore.getState();
        const lessons =
          queryClient.getQueryData<Lesson[]>(coursesKeys.lessons) ??
          (Array.isArray(prev?.lessons) ? prev.lessons : []);
        const vocab =
          queryClient.getQueryData<VocabWord[]>(vocabKeys.list) ??
          (Array.isArray(prev?.vocab) ? prev.vocab : []);
        const notes =
          queryClient.getQueryData<MindNote[]>(notesKeys.list) ??
          (Array.isArray(prev?.notes) ? prev.notes : []);
        const handwriting =
          queryClient.getQueryData<HandwritingItem[]>(handwritingKeys.list) ??
          (Array.isArray(prev?.handwritingGallery) ? prev.handwritingGallery : []);

        localStorage.setItem(
          APP_STORAGE_KEY,
          JSON.stringify({
            ...profile,
            lessons,
            vocab,
            notes,
            // Cap cached base64 snapshots to avoid exceeding 5MB localStorage quota
            handwritingGallery: handwriting.slice(0, 6),
          }),
        );
      } catch {
        // Storage quota exceeded or restricted
      }
    };

    const cancelScheduled = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (idleId !== null && win.cancelIdleCallback) {
        win.cancelIdleCallback(idleId);
        idleId = null;
      }
    };

    const schedulePersist = () => {
      cancelScheduled();
      timer = window.setTimeout(() => {
        timer = null;
        if (win.requestIdleCallback) {
          idleId = win.requestIdleCallback(
            () => {
              idleId = null;
              persistSnapshot();
            },
            { timeout: 1500 },
          );
        } else {
          persistSnapshot();
        }
      }, 600);
    };

    const flushPending = () => {
      if (timer !== null || idleId !== null) {
        cancelScheduled();
        persistSnapshot();
      }
    };

    const unsubProfile = useProfileStore.subscribe((state, prev) => {
      if (state.profile !== prev.profile) schedulePersist();
    });
    const unsubQuery = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.action.type === 'success' &&
        isPersistedQueryKey(event.query.queryKey)
      ) {
        schedulePersist();
      }
    });
    window.addEventListener('pagehide', flushPending);

    return () => {
      unsubProfile();
      unsubQuery();
      window.removeEventListener('pagehide', flushPending);
      cancelScheduled();
    };
  }, []);

  // 3. Initial hydration from NestJS + MongoDB backend + Web Speech voice preload
  useEffect(() => {
    let active = true;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    async function hydrateFromApi() {
      try {
        const boot = await profileApi.bootstrap();
        if (!active) return;
        hydrateCaches(boot);
        return;
      } catch {
        // Fallback to parallel endpoints if running against an older backend instance
      }

      try {
        const [{ coursesApi }, { vocabApi }, { notesApi }, { handwritingApi }] = await Promise.all([
          import('@/features/courses/api/courses.api'),
          import('@/features/vocab/api/vocab.api'),
          import('@/features/notes/api/notes.api'),
          import('@/features/writing/api/handwriting.api'),
        ]);
        const results = await Promise.allSettled([
          profileApi.getProfile(),
          coursesApi.getLessons(),
          vocabApi.getVocab(),
          coursesApi.getExercises(),
          notesApi.getNotes(),
          handwritingApi.getHandwriting(),
        ]);
        if (!active) return;

        const [pRes, lRes, vRes, exRes, nRes, hwRes] = results;
        if (!results.some((r) => r.status === 'fulfilled')) {
          useProfileStore.getState().setApiConnected(false);
          return;
        }

        hydrateCaches({
          profile: pRes.status === 'fulfilled' ? pRes.value : useProfileStore.getState().profile,
          lessons: lRes.status === 'fulfilled' ? lRes.value : undefined,
          vocab: vRes.status === 'fulfilled' ? vRes.value : undefined,
          exercises: exRes.status === 'fulfilled' ? exRes.value : undefined,
          notes: nRes.status === 'fulfilled' ? nRes.value : undefined,
          handwriting: hwRes.status === 'fulfilled' ? hwRes.value : undefined,
        });
      } catch {
        if (active) useProfileStore.getState().setApiConnected(false);
      }
    }

    void hydrateFromApi();
    return () => {
      active = false;
    };
  }, []);
}
