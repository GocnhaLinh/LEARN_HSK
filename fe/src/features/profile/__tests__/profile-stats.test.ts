/**
 * Kiểm thử các hàm tính toán thuần của feature Profile / Trang chủ (profile-stats.ts).
 * Mục đích: Xác nhận chuẩn hóa profile an toàn khi cache thiếu field, thống kê từ vựng 1 vòng O(N),
 * dựng lịch chuỗi điểm danh 7 ngày và công thức tính cấp độ XP (200 XP / cấp).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE } from '@/data/defaults';
import {
  buildStreakDays,
  computeHomeStats,
  computeXpLevel,
  normalizeProfile,
} from '@/features/profile/utils/profile-stats';
import type { VocabWord } from '@/types';

/** Helper tạo nhanh một từ vựng giả lập cho các bài test thống kê */
const makeWord = (
  id: string,
  level: number,
  status: VocabWord['status'],
  hanzi: string,
  custom = false,
): VocabWord => ({
  id,
  lessonId: `hsk${level}-l1`,
  hanzi,
  pinyin: 'xué',
  hanviet: 'HỌC',
  meaning: 'Học',
  pos: 'Động từ',
  level,
  status,
  custom,
  note: '',
  exampleZh: '',
  exampleVi: '',
});

describe('profile-stats (Hàm tính toán thống kê Trang chủ & Profile)', () => {
  it('normalizeProfile trả về mặc định khi rỗng và chỉ giữ các trường hợp lệ từ cache', () => {
    // Cache rỗng hoặc null -> dùng đúng DEFAULT_PROFILE
    expect(normalizeProfile(null)).toEqual(DEFAULT_PROFILE);

    // Cache thiếu nhiều field, weeklyLog sai độ dài và missionsDone chứa field phụ (_id từ MongoDB)
    const normalized = normalizeProfile({
      theme: 'diary',
      xp: 450,
      weeklyLog: [1, 2],
      missionsDone: { m1: true, _id: 'mongo_extra' } as unknown as typeof DEFAULT_PROFILE.missionsDone,
    });
    expect(normalized.theme).toBe('diary');
    expect(normalized.xp).toBe(450);
    expect(normalized.weeklyLog).toEqual(DEFAULT_PROFILE.weeklyLog);
    expect(normalized.missionsDone).toEqual({ m1: true, m2: false, m3: false, m4: false });
  });

  it('computeHomeStats gom đủ 4 trạng thái từ, tiến độ Sơ cấp/Trung cấp, cấp đang theo và chip nhiệm vụ', () => {
    const vocab: VocabWord[] = [
      makeWord('w1', 1, 'mastered', '你好'),
      makeWord('w2', 2, 'learning', '谢谢'),
      makeWord('w3', 5, 'mastered', '安慰', true),
      makeWord('w4', 5, 'review', '坚持', true),
      makeWord('w5', 5, 'new', '珍惜'),
      makeWord('w6', 6, 'review', '克服'),
    ];

    const stats = computeHomeStats(vocab, 5);

    // Kiểm tra 4 thẻ KPI tổng quan
    expect(stats.masteredCount).toBe(2);
    expect(stats.learningCount).toBe(1);
    expect(stats.reviewCount).toBe(2);
    expect(stats.freshCount).toBe(1);

    // Kiểm tra tiến độ cấp đang theo (HSK 5: 1/3 từ đã thuộc = 33%)
    expect(stats.focusTotal).toBe(3);
    expect(stats.focusMastered).toBe(1);
    expect(stats.focusPct).toBe(33);

    // Sơ cấp (HSK 1–3: 1/2 = 50%), Trung cấp (HSK 4–6: 1/4 = 25%), số từ cá nhân/file = 2
    expect(stats.primaryPct).toBe(50);
    expect(stats.interPct).toBe(25);
    expect(stats.customCount).toBe(2);

    // Chip từ cần chú ý & ký tự mẫu luyện viết của HSK 5
    expect(stats.reviewChips).toEqual(['坚持', '克服']);
    expect(stats.writeSampleChars).toEqual(['安', '坚', '珍']);
  });

  it('buildStreakDays dựng đúng 7 ô ngày liên tiếp cho cả trường hợp đã và chưa điểm danh hôm nay', () => {
    const fixedToday = new Date(2026, 10, 28); // 28/11/2026 (Thứ Bảy)

    // Đã điểm danh hôm nay với chuỗi 3 ngày -> 3 ngày cuối cùng (26, 27, 28) sáng lửa
    const checked = buildStreakDays(3, true, fixedToday);
    expect(checked).toHaveLength(7);
    expect(checked.map((c) => c.lit)).toEqual([false, false, false, false, true, true, true]);
    expect(checked[6]).toMatchObject({ dayName: 'T7', dateText: '28/11', lit: true });

    // Chưa điểm danh hôm nay nhưng có chuỗi 2 ngày trước đó -> hôm nay tắt, 2 ngày trước sáng
    const unchecked = buildStreakDays(2, false, fixedToday);
    expect(unchecked.map((c) => c.lit)).toEqual([false, false, false, false, true, true, false]);
  });

  it('computeXpLevel tính đúng cấp độ mỗi 200 XP và chống giá trị XP âm', () => {
    expect(computeXpLevel(0)).toEqual({ xpLevel: 1, inLevelXp: 0, xpPct: 0 });
    expect(computeXpLevel(450)).toEqual({ xpLevel: 3, inLevelXp: 50, xpPct: 25 });
    expect(computeXpLevel(-50)).toEqual({ xpLevel: 1, inLevelXp: 0, xpPct: 0 });
  });
});
