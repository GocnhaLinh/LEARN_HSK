/**
 * Kiểm thử các hook nghiệp vụ chính của feature Khóa học: useBulkImportLessons & useCourseImporter.
 * Mục đích: Đảm bảo khi lưu dữ liệu Smart Importer lên Backend sẽ đồng bộ đúng 3 cache React Query
 * (lessons, vocab, exercises) + profile XP; đồng thời kiểm tra bộ lọc không dấu, chặn lưu rỗng
 * và giữ nguyên bản nháp khi mất kết nối Backend.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { coursesApi } from '@/features/courses/api/courses.api';
import { useCourseImporter } from '@/features/courses/hooks/useCourseImporter';
import { coursesKeys, useBulkImportLessons } from '@/features/courses/hooks/useCourses';
import {
  EMPTY_IMPORTER_DRAFT,
  useCoursesUiStore,
} from '@/features/courses/stores/courses-ui.store';
import { exercisesKeys } from '@/features/exercises/hooks/useExercisesQuery';
import { vocabKeys } from '@/features/vocab/hooks/useVocab';
import { useToastStore } from '@/stores/toast.store';
import type { ExerciseItem, Lesson, UserProfile, VocabWord } from '@/types';

// Mock syncProfile từ AppContext để kiểm tra xem XP/profile mới có được đồng bộ sau khi import không
const mockSyncProfile = vi.fn();

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({ syncProfile: mockSyncProfile }),
}));

// Mock hiệu ứng confetti / floating XP để tránh tạo node DOM thừa trong môi trường jsdom
vi.mock('@/lib/fx-utils', () => ({
  spawnConfetti: vi.fn(),
  spawnFloatingXP: vi.fn(),
}));

/** Tạo QueryClient độc lập (tắt retry) bọc quanh hook trong từng test case */
function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

describe('useBulkImportLessons & useCourseImporter (Lưu khóa học & Luồng Smart Importer)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSyncProfile.mockReset();
    useCoursesUiStore.setState({ expandedLessons: {}, importerDraftByLevel: {} });
    useToastStore.getState().clearToasts();
  });

  it('cập nhật đồng thời cache lessons, vocab, exercises, đồng bộ profile và báo toast +30 XP khi import thành công', async () => {
    const { qc, wrapper } = createWrapper();
    // Khởi tạo sẵn 1 bài học cũ trong cache để xác nhận bài mới được chèn lên đầu danh sách
    const existingLesson: Lesson = {
      id: 'old-l1',
      level: 5,
      title: 'Bài cũ',
      desc: '',
      fromFile: false,
    };
    qc.setQueryData<Lesson[]>(coursesKeys.lessons, [existingLesson]);
    qc.setQueryData<VocabWord[]>(vocabKeys.list, []);
    qc.setQueryData<ExerciseItem[]>(exercisesKeys.byLevel(5), []);

    // Dữ liệu giả lập Backend trả về sau khi lưu MongoDB thành công
    const newLesson: Lesson = {
      id: 'new-l1',
      level: 5,
      title: 'HSK5 Import',
      desc: 'Từ file',
      fromFile: true,
    };
    const newWord: VocabWord = {
      id: 'w-new',
      lessonId: 'new-l1',
      hanzi: '安慰',
      pinyin: 'ānwèi',
      hanviet: 'AN ỦI',
      meaning: 'An ủi',
      pos: 'Động từ',
      level: 5,
      status: 'new',
      note: '',
      exampleZh: '',
      exampleVi: '',
    };
    const newEx: ExerciseItem = {
      id: 'ex-new',
      level: 5,
      lessonId: 'new-l1',
      exerciseType: 'translate',
      title: 'Dịch câu',
      question: 'Cô ấy an ủi tôi',
      correctAnswer: '她安慰我',
      xpReward: 15,
    };
    const nextProfile = { xp: 130 } as UserProfile;

    const spy = vi.spyOn(coursesApi, 'bulkImportLessons').mockResolvedValue({
      lessons: [newLesson],
      words: [newWord],
      exercises: [newEx],
      totalChunks: 1,
      totalWords: 1,
      totalExercises: 1,
      profile: nextProfile,
    });

    const { result } = renderHook(() => useBulkImportLessons(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        level: 5,
        baseTitle: 'HSK5 Import',
        splitSize: 50,
        picked: [
          {
            selected: true,
            hanzi: '安慰',
            pinyin: 'ānwèi',
            english: 'comfort',
            meaning: 'An ủi',
            exampleZh: '',
            exampleVi: '',
          },
        ],
      });
    });

    // Kiểm tra: API được gọi 1 lần, cả 3 cache React Query đều có dữ liệu mới, profile được cập nhật và có toast thưởng XP
    expect(spy).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData<Lesson[]>(coursesKeys.lessons)?.[0].id).toBe('new-l1');
    expect(qc.getQueryData<Lesson[]>(coursesKeys.lessons)).toHaveLength(2);
    expect(qc.getQueryData<VocabWord[]>(vocabKeys.list)?.[0].hanzi).toBe('安慰');
    expect(qc.getQueryData<ExerciseItem[]>(exercisesKeys.byLevel(5))?.[0].id).toBe('ex-new');
    expect(mockSyncProfile).toHaveBeenCalledWith(nextProfile);
    const toastsAfterSuccess = useToastStore.getState().toasts;
    const lastToast = toastsAfterSuccess[toastsAfterSuccess.length - 1];
    expect(lastToast?.variant).toBe('yellow');
    expect(lastToast?.message).toContain('+30 XP');
  });

  it('lọc bảng xem trước không cần dấu tiếng Việt, chặn lưu khi chọn 0 mục và giữ nguyên bản nháp nếu API lỗi', async () => {
    const { wrapper } = createWrapper();
    const getLastToast = () => {
      const list = useToastStore.getState().toasts;
      return list[list.length - 1];
    };

    // Nạp sẵn 2 từ vào bản nháp HSK 5 (1 từ có ví dụ song ngữ, 1 từ không có)
    useCoursesUiStore.getState().openImporterPreview(
      5,
      [
        {
          selected: true,
          hanzi: '安慰',
          pinyin: 'ānwèi',
          english: 'comfort',
          meaning: 'An ủi',
          exampleZh: '她安慰我',
          exampleVi: 'Cô ấy an ủi tôi',
        },
        {
          selected: true,
          hanzi: '坚持',
          pinyin: 'jiānchí',
          english: 'persist',
          meaning: 'Kiên trì',
          exampleZh: '',
          exampleVi: '',
        },
      ],
      [],
      'HSK5 Draft',
    );

    const { result } = renderHook(() => useCourseImporter(5), { wrapper });

    // Kiểm tra các chỉ số thống kê tự tính trên bản nháp
    expect(result.current.hasPreview).toBe(true);
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.bilingualExampleCount).toBe(1);
    expect(result.current.lessonCountPreview).toBe(1);

    // Trường hợp 1: Gõ tìm kiếm không dấu "kien tri" vẫn phải khớp nghĩa "Kiên trì" (坚持)
    act(() => {
      useCoursesUiStore.getState().patchImporterDraft(5, { extractSearch: 'kien tri' });
    });
    expect(result.current.filteredPreview).toHaveLength(1);
    expect(result.current.filteredPreview[0].row.hanzi).toBe('坚持');

    // Trường hợp 2: Bỏ chọn tất cả rồi bấm Lưu -> báo toast cảnh báo màu hồng và KHÔNG gọi API
    const apiSpy = vi.spyOn(coursesApi, 'bulkImportLessons');
    act(() => {
      useCoursesUiStore.getState().toggleAllExtracted(5, false);
    });
    await act(async () => {
      await result.current.confirmInsert();
    });
    expect(apiSpy).not.toHaveBeenCalled();
    expect(getLastToast()?.variant).toBe('pink');

    // Trường hợp 3: Chọn lại từ nhưng Backend bị tắt (Network Error) -> báo lỗi và PHẢI giữ nguyên bản nháp để người dùng không mất công sửa
    act(() => {
      useCoursesUiStore.getState().toggleAllExtracted(5, true);
    });
    apiSpy.mockRejectedValueOnce(new Error('Network Error'));
    await act(async () => {
      await result.current.confirmInsert();
    });
    expect(apiSpy).toHaveBeenCalledTimes(1);
    expect(getLastToast()?.variant).toBe('pink');
    expect(useCoursesUiStore.getState().importerDraftByLevel[5].extractedPreview).toHaveLength(2);

    // Trường hợp 4: Bấm Lưu lại khi Backend đã online -> lưu xong mới dọn sạch bản nháp HSK 5
    apiSpy.mockResolvedValueOnce({
      lessons: [],
      words: [],
      exercises: [],
      totalChunks: 1,
      totalWords: 2,
      totalExercises: 0,
      profile: { xp: 160 } as UserProfile,
    });
    await act(async () => {
      await result.current.confirmInsert();
    });
    await waitFor(() => {
      expect(useCoursesUiStore.getState().importerDraftByLevel[5]).toEqual(EMPTY_IMPORTER_DRAFT);
    });
  });
});
