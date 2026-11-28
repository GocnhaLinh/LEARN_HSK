/**
 * Kiểm thử hook tính thống kê khóa học theo cấp độ HSK 1–6 (useCourseLevelStats.ts).
 * Mục đích: Đảm bảo số bài học, tổng số từ và số từ đã thuộc (mastered) được cộng dồn chính xác
 * trong 1 lần duyệt duy nhất và tự loại bỏ dữ liệu có level nằm ngoài phạm vi HSK 1–6.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCourseLevelStats } from '@/features/courses/hooks/useCourseLevelStats';
import type { Lesson, VocabWord } from '@/types';

/** Helper tạo bài học giả lập theo cấp HSK */
const makeLesson = (id: string, level: number): Lesson => ({
  id,
  level,
  title: `Bài ${id}`,
  desc: '',
  fromFile: false,
});

/** Helper tạo từ vựng giả lập theo cấp HSK và trạng thái học */
const makeWord = (id: string, level: number, status: VocabWord['status']): VocabWord => ({
  id,
  lessonId: `l-${level}`,
  hanzi: '学',
  pinyin: 'xué',
  hanviet: 'HỌC',
  meaning: 'Học',
  pos: 'Động từ',
  level,
  status,
  note: '',
  exampleZh: '',
  exampleVi: '',
});

describe('useCourseLevelStats (Thống kê bài học & từ vựng theo cấp HSK)', () => {
  it('tổng hợp chính xác số bài, tổng từ và số từ đã thuộc cho HSK 1–6 và bỏ qua level ngoài phạm vi', () => {
    // Dữ liệu đầu vào gồm HSK 1, HSK 5 và cả level rác (99) để kiểm tra guard bảo vệ
    const lessons: Lesson[] = [
      makeLesson('l1', 1),
      makeLesson('l5a', 5),
      makeLesson('l5b', 5),
      makeLesson('l99', 99),
    ];
    const vocab: VocabWord[] = [
      makeWord('w1', 5, 'mastered'),
      makeWord('w2', 5, 'mastered'),
      makeWord('w3', 5, 'learning'),
      makeWord('w4', 1, 'new'),
      makeWord('w5', 99, 'mastered'),
    ];

    const { result } = renderHook(() => useCourseLevelStats(lessons, vocab));

    // HSK 5 có 2 bài, 3 từ (trong đó 2 từ mastered); HSK 1 có 1 bài, 1 từ (0 mastered)
    expect(result.current.get(5)).toEqual({ lessons: 2, words: 3, mastered: 2 });
    expect(result.current.get(1)).toEqual({ lessons: 1, words: 1, mastered: 0 });
    // Các cấp chưa có dữ liệu vẫn được khởi tạo sẵn giá trị 0
    expect(result.current.get(2)).toEqual({ lessons: 0, words: 0, mastered: 0 });
    expect(result.current.get(6)).toEqual({ lessons: 0, words: 0, mastered: 0 });
    // Level 99 ngoài HSK 1–6 phải bị bỏ qua, không lọt vào Map kết quả
    expect(result.current.has(99)).toBe(false);
  });
});
