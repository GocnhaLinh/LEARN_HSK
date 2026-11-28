/**
 * Kiểm thử các component giao diện của Trang chủ (features/profile/components/):
 * StreakCalendarCard, HeroLevelSection, WeeklyProgressCard và MissionsGrid.
 * Mục đích: Xác nhận hiển thị đúng số liệu tiến độ, trạng thái kết nối và gọi đúng callback tương tác.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { COURSES_META } from '@/data/defaults';
import { HeroLevelSection } from '@/features/profile/components/HeroLevelSection';
import { MissionsGrid } from '@/features/profile/components/MissionsGrid';
import { StreakCalendarCard } from '@/features/profile/components/StreakCalendarCard';
import { WeeklyProgressCard } from '@/features/profile/components/WeeklyProgressCard';
import type { HomeStats } from '@/features/profile/types';

const SAMPLE_STATS: HomeStats = {
  masteredCount: 40,
  learningCount: 20,
  reviewCount: 5,
  freshCount: 35,
  reviewChips: ['安慰', '坚持'],
  writeSampleChars: ['安', '坚'],
  focusMeta: COURSES_META[4],
  focusTotal: 100,
  focusMastered: 40,
  focusPct: 40,
  primaryTotal: 50,
  primaryMastered: 25,
  primaryPct: 50,
  interTotal: 100,
  interMastered: 40,
  interPct: 40,
  customCount: 12,
};

describe('Home / Profile components (Các khối UI Trang chủ)', () => {
  it('StreakCalendarCard hiển thị đúng số ngày chuỗi và biểu tượng lửa cho những ngày đã điểm danh', () => {
    render(
      <StreakCalendarCard
        streak={4}
        streakDays={[
          { dayName: 'T2', dateText: '23/11', lit: false },
          { dayName: 'T3', dateText: '24/11', lit: false },
          { dayName: 'T4', dateText: '25/11', lit: false },
          { dayName: 'T5', dateText: '26/11', lit: true },
          { dayName: 'T6', dateText: '27/11', lit: true },
          { dayName: 'T7', dateText: '28/11', lit: true },
          { dayName: 'CN', dateText: '29/11', lit: true },
        ]}
      />,
    );

    expect(screen.getByText(/chuỗi 4 ngày Streak/i)).toBeInTheDocument();
    expect(screen.getAllByText('🔥')).toHaveLength(4);
    expect(screen.getAllByText('○')).toHaveLength(3);
  });

  it('HeroLevelSection cho phép chuyển nhanh HSK 1–6 và điều hướng vào Khóa học / Flashcard', () => {
    const onSelectFocusLevel = vi.fn();
    const onNavigate = vi.fn();
    render(
      <HeroLevelSection
        focusLevel={5}
        stats={SAMPLE_STATS}
        onSelectFocusLevel={onSelectFocusLevel}
        onNavigate={onNavigate}
      />,
    );

    // Bấm nút chuyển sang HSK 3 -> gọi callback với level = 3
    fireEvent.click(screen.getByRole('button', { name: 'H3' }));
    expect(onSelectFocusLevel).toHaveBeenCalledWith(3);

    // Bấm 2 nút CTA chính -> điều hướng đúng đường dẫn theo focusLevel hiện tại (5)
    fireEvent.click(screen.getByRole('button', { name: /VÀO KHÓA HSK 5/i }));
    expect(onNavigate).toHaveBeenCalledWith('/courses/5');
    fireEvent.click(screen.getByRole('button', { name: /HỌC FLASHCARD/i }));
    expect(onNavigate).toHaveBeenCalledWith('/flashcard/hsk5');
  });

  it('WeeklyProgressCard hiển thị KPI, trạng thái API và gọi onAdjustDailyTarget khi bấm -5 / +5', () => {
    const onAdjust = vi.fn();
    render(
      <WeeklyProgressCard
        apiConnected={true}
        stats={SAMPLE_STATS}
        todayReviews={10}
        dailyTarget={20}
        weeklyLog={[5, 8, 12, 6, 15, 9, 10]}
        xpInfo={{ xpLevel: 3, inLevelXp: 80, xpPct: 40 }}
        onAdjustDailyTarget={onAdjust}
      />,
    );

    expect(screen.getByText(/Đã kết nối NestJS API/i)).toBeInTheDocument();
    expect(screen.getByText('Level 3 (80 / 200 XP)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '-5' }));
    expect(onAdjust).toHaveBeenCalledWith(-5);
    fireEvent.click(screen.getByRole('button', { name: '+5' }));
    expect(onAdjust).toHaveBeenCalledWith(5);
  });

  it('MissionsGrid hiển thị tiến độ X/4 nhiệm vụ, gọi onToggleMission và điều hướng đúng route', () => {
    const onToggle = vi.fn();
    const onNavigate = vi.fn();
    render(
      <MissionsGrid
        focusLevel={5}
        writtenCountToday={2}
        missionsDone={{ m1: true, m2: false, m3: false, m4: true }}
        stats={SAMPLE_STATS}
        onToggleMission={onToggle}
        onNavigate={onNavigate}
      />,
    );

    // 2/4 nhiệm vụ đã hoàn thành
    expect(screen.getByText('2 / 4 nhiệm vụ hoàn thành')).toBeInTheDocument();

    // Tick vào checkbox nhiệm vụ thứ 2 (m2) -> gọi onToggleMission('m2')
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(onToggle).toHaveBeenCalledWith('m2');

    // Bấm nút hành động của nhiệm vụ 1 -> đi tới /flashcard/review
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu ôn/i }));
    expect(onNavigate).toHaveBeenCalledWith('/flashcard/review');
  });
});
