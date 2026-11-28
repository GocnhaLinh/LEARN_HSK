import { useMemo } from 'react';
import { HSK_LEVELS } from '@/data/defaults';
import type { CourseLevelStats } from '@/features/courses/types';
import type { Lesson, VocabWord } from '@/types';

/** Single O(N) pass aggregating lesson/word/mastered counts across HSK 1–6 */
export function useCourseLevelStats(
  lessons: Lesson[],
  vocab: VocabWord[],
): Map<number, CourseLevelStats> {
  return useMemo(() => {
    const map = new Map<number, CourseLevelStats>();
    for (const lv of HSK_LEVELS) map.set(lv, { lessons: 0, words: 0, mastered: 0 });
    for (const l of lessons) {
      const s = map.get(l.level);
      if (s) s.lessons++;
    }
    for (const w of vocab) {
      const s = map.get(w.level);
      if (s) {
        s.words++;
        if (w.status === 'mastered') s.mastered++;
      }
    }
    return map;
  }, [lessons, vocab]);
}
