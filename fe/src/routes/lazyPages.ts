import { lazyNamed } from '@/lib/lazy-load';

/**
 * Centralized lazy-loaded pages — import directly in App.tsx or preload from navigation.
 */
export const HomePage = lazyNamed(() => import('../pages/HomePage'), 'HomePage');
export const CoursesPage = lazyNamed(() => import('../pages/CoursesPage'), 'CoursesPage');
export const CourseDetailPage = lazyNamed(
  () => import('../pages/CourseDetailPage'),
  'CourseDetailPage',
);
export const ExercisesPage = lazyNamed(
  () => import('../pages/ExercisesPage'),
  'ExercisesPage',
);
export const FlashcardPage = lazyNamed(() => import('../pages/FlashcardPage'), 'FlashcardPage');
export const WritingPage = lazyNamed(() => import('../pages/WritingPage'), 'WritingPage');
export const GamePage = lazyNamed(() => import('../pages/GamePage'), 'GamePage');
export const VocabPage = lazyNamed(() => import('../pages/VocabPage'), 'VocabPage');
export const NotesPage = lazyNamed(() => import('../pages/NotesPage'), 'NotesPage');

const ROUTE_PRELOADERS: Record<string, () => Promise<unknown>> = {
  '/': HomePage.preload,
  '/courses': CoursesPage.preload,
  '/flashcard': FlashcardPage.preload,
  '/writing': WritingPage.preload,
  '/game': GamePage.preload,
  '/vocab': VocabPage.preload,
  '/notes': NotesPage.preload,
};

export function preloadRoute(path: string): void {
  const base = path === '/' ? '/' : `/${path.split('/').filter(Boolean)[0] || ''}`;
  const preload = ROUTE_PRELOADERS[base];
  if (preload) {
    void preload();
  }
}
