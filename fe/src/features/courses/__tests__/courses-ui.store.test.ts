/**
 * Kiểm thử Zustand store giao diện cho feature Khóa học (courses-ui.store.ts).
 * Mục đích: Xác nhận trạng thái đóng/mở danh sách bài học và bản nháp Smart Importer
 * hoạt động bất biến, tách biệt theo từng cấp HSK và tự chọn ngưỡng chia bài hợp lý.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMPTY_IMPORTER_DRAFT,
  useCoursesUiStore,
} from '@/features/courses/stores/courses-ui.store';
import type { ExtractedExerciseRow, ExtractedVocabRow } from '@/types';

/** Helper tạo nhanh danh sách từ vựng trích xuất giả lập */
const makeWords = (count: number): ExtractedVocabRow[] =>
  Array.from({ length: count }, (_, i) => ({
    selected: true,
    hanzi: `字${i}`,
    pinyin: `zì${i}`,
    english: `word${i}`,
    meaning: `Nghĩa ${i}`,
    exampleZh: '',
    exampleVi: '',
  }));

/** Helper tạo nhanh danh sách bài tập trích xuất giả lập */
const makeExercises = (count: number): ExtractedExerciseRow[] =>
  Array.from({ length: count }, (_, i) => ({
    selected: true,
    exerciseType: 'translate',
    title: `Câu ${i + 1}`,
    question: `Đề ${i + 1}`,
    correctAnswer: `答案${i + 1}`,
  }));

describe('useCoursesUiStore (Store UI Khóa học & Smart Importer)', () => {
  // Reset toàn bộ store về rỗng trước mỗi test để các test case không ảnh hưởng lẫn nhau
  beforeEach(() => {
    useCoursesUiStore.setState({ expandedLessons: {}, importerDraftByLevel: {} });
  });

  it('đóng/mở từng bài học dựa theo trạng thái mặc định (defaultOpen) và hỗ trợ mở/thu gọn hàng loạt', () => {
    const store = useCoursesUiStore.getState();

    // Bài 1 mặc định đang mở (defaultOpen = true) -> bấm toggle sẽ chuyển thành đóng (false)
    store.toggleLesson('hsk5-l1', true);
    expect(useCoursesUiStore.getState().expandedLessons['hsk5-l1']).toBe(false);

    // Bài 4 mặc định đang đóng (defaultOpen = false) -> bấm toggle sẽ chuyển thành mở (true)
    store.toggleLesson('hsk5-l4', false);
    expect(useCoursesUiStore.getState().expandedLessons['hsk5-l4']).toBe(true);

    // Bấm "Thu gọn tất cả" -> cập nhật đồng loạt mọi lessonId sang false
    store.setLessonsExpanded(['hsk5-l1', 'hsk5-l2', 'hsk5-l4'], false);
    expect(useCoursesUiStore.getState().expandedLessons).toEqual({
      'hsk5-l1': false,
      'hsk5-l2': false,
      'hsk5-l4': false,
    });
  });

  it('tự động chọn kích thước chia bài (splitSize) theo số lượng từ và cô lập bản nháp theo từng cấp HSK', () => {
    const store = useCoursesUiStore.getState();

    // > 60 từ -> chia 50 từ/bài; 26–60 từ -> chia 25 từ/bài; <= 25 từ -> gộp 1 bài (splitSize = 0)
    store.openImporterPreview(5, makeWords(70), [], 'HSK 5 Big');
    store.openImporterPreview(4, makeWords(30), [], 'HSK 4 Medium');
    store.openImporterPreview(3, makeWords(10), [], 'HSK 3 Small');

    const drafts = useCoursesUiStore.getState().importerDraftByLevel;
    expect(drafts[5].splitSize).toBe(50);
    expect(drafts[4].splitSize).toBe(25);
    expect(drafts[3].splitSize).toBe(0);
    // Mở nháp ở cấp HSK khác không làm ghi đè tên/dữ liệu nháp của HSK 5 hoặc HSK 4
    expect(drafts[5].lessonBaseName).toBe('HSK 5 Big');
    expect(drafts[4].lessonBaseName).toBe('HSK 4 Medium');
  });

  it('cập nhật từng dòng từ vựng/bài tập bất biến, chọn/bỏ chọn tất cả và xóa nháp đúng cấp HSK', () => {
    const store = useCoursesUiStore.getState();
    store.openImporterPreview(5, makeWords(2), makeExercises(2), 'Demo');
    store.openImporterPreview(6, makeWords(1), [], 'Keep HSK6');

    // Sửa nghĩa dòng số 2 của từ vựng và đáp án dòng số 1 của bài tập ở HSK 5
    store.updatePreviewField(5, 1, 'meaning', 'Nghĩa đã sửa');
    store.updateExerciseField(5, 0, 'correctAnswer', '新答案');
    expect(useCoursesUiStore.getState().importerDraftByLevel[5].extractedPreview[1].meaning).toBe(
      'Nghĩa đã sửa',
    );
    // Dòng khác không bị ảnh hưởng (đảm bảo cập nhật immutable)
    expect(useCoursesUiStore.getState().importerDraftByLevel[5].extractedPreview[0].meaning).toBe(
      'Nghĩa 0',
    );
    expect(
      useCoursesUiStore.getState().importerDraftByLevel[5].extractedExercises[0].correctAnswer,
    ).toBe('新答案');

    // Bỏ chọn tất cả -> cả từ vựng lẫn bài tập của HSK 5 đều về selected = false
    store.toggleAllExtracted(5, false);
    const d5 = useCoursesUiStore.getState().importerDraftByLevel[5];
    expect(d5.extractedPreview.every((r) => r.selected === false)).toBe(true);
    expect(d5.extractedExercises.every((e) => e.selected === false)).toBe(true);

    // Xóa bản nháp HSK 5 -> chỉ reset HSK 5 về rỗng, giữ nguyên bản nháp đang dở ở HSK 6
    store.clearImporterDraft(5);
    expect(useCoursesUiStore.getState().importerDraftByLevel[5]).toEqual(EMPTY_IMPORTER_DRAFT);
    expect(useCoursesUiStore.getState().importerDraftByLevel[6].lessonBaseName).toBe('Keep HSK6');
  });
});
