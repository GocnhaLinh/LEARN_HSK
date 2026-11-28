/**
 * Kiểm thử các component giao diện của feature Khóa học:
 * CourseCard, ExamStudioLauncherCard, LessonAccordionList và ImportPreviewPanel.
 * Mục đích: Đảm bảo hiển thị đúng số liệu, trạng thái disable/empty và gọi đúng callback tương tác.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COURSES_META } from '@/data/defaults';
import { CourseCard } from '@/features/courses/components/CourseCard';
import { ExamStudioLauncherCard } from '@/features/courses/components/ExamStudioLauncherCard';
import { ImportPreviewPanel } from '@/features/courses/components/ImportPreviewPanel';
import { LessonAccordionList } from '@/features/courses/components/LessonAccordionList';
import { useCoursesUiStore } from '@/features/courses/stores/courses-ui.store';
import type { Lesson, VocabWord } from '@/types';

const HSK5_META = COURSES_META[4];

describe('Courses components (Các thành phần UI Khóa học)', () => {
  beforeEach(() => {
    useCoursesUiStore.setState({ expandedLessons: {}, importerDraftByLevel: {} });
  });

  it('CourseCard hiển thị số bài, số từ, % đã thuộc và gọi onEnter(5) khi bấm vào khóa học', () => {
    const onEnter = vi.fn();
    render(
      <CourseCard
        course={HSK5_META}
        stats={{ lessons: 12, words: 100, mastered: 60 }}
        onEnter={onEnter}
      />,
    );

    // Kiểm tra các badge thống kê và phần trăm tiến độ (60 / 100 = 60%)
    expect(screen.getByText('12 bài')).toBeInTheDocument();
    expect(screen.getByText('100 từ')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();

    // Bấm nút vào khóa học -> truyền đúng level = 5 lên component cha
    fireEvent.click(screen.getByRole('button', { name: /Vào khóa học HSK 5/i }));
    expect(onEnter).toHaveBeenCalledWith(5);
  });

  it('ExamStudioLauncherCard khóa nút Luyện dịch khi có 0 câu và hiển thị điểm thi local khi có lịch sử thi', () => {
    const onOfficial = vi.fn();
    const onExercises = vi.fn();
    const { rerender } = render(
      <ExamStudioLauncherCard
        meta={HSK5_META}
        exerciseCount={0}
        localExamStats={{ attemptCount: 0, bestScore10: null, wrongCount: 0, lastAttempt: null }}
        onOpenOfficialExams={onOfficial}
        onOpenExercises={onExercises}
      />,
    );

    // Khi chưa có câu bài tập -> nút Luyện dịch bị disabled; nút Đề thi chuẩn HSK vẫn bấm được
    expect(screen.getByRole('button', { name: /Luyện dịch \(0 câu\)/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Đề thi chuẩn HSK/i }));
    expect(onOfficial).toHaveBeenCalledTimes(1);

    // Khi đã có 40 câu bài tập và lịch sử thi thử local -> hiện điểm cao nhất, số câu hay sai và mở khóa nút luyện
    rerender(
      <ExamStudioLauncherCard
        meta={HSK5_META}
        exerciseCount={40}
        localExamStats={{ attemptCount: 3, bestScore10: 8.5, wrongCount: 4, lastAttempt: null }}
        onOpenOfficialExams={onOfficial}
        onOpenExercises={onExercises}
      />,
    );

    expect(screen.getByText(/Cao nhất: 8\.5\/10 \(3 lượt\)/)).toBeInTheDocument();
    expect(screen.getByText(/4 câu hay sai cần ôn/)).toBeInTheDocument();
    const practiceBtn = screen.getByRole('button', { name: /Luyện dịch \(40 câu\)/i });
    expect(practiceBtn).toBeEnabled();
    fireEvent.click(practiceBtn);
    expect(onExercises).toHaveBeenCalledTimes(1);
  });

  it('LessonAccordionList mặc định mở 2 bài đầu, hỗ trợ phát âm, mở/thu gọn tất cả, toggle từng bài và điều hướng học', () => {
    const lessons: Lesson[] = [
      { id: 'l1', level: 5, title: 'Bài 1', desc: 'Mô tả 1', fromFile: false },
      { id: 'l2', level: 5, title: 'Bài 2', desc: 'Mô tả 2', fromFile: true },
      { id: 'l3', level: 5, title: 'Bài 3', desc: 'Mô tả 3', fromFile: false },
    ];
    const words: VocabWord[] = [
      {
        id: 'w1',
        lessonId: 'l1',
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
      },
      {
        id: 'w3',
        lessonId: 'l3',
        hanzi: '坚持',
        pinyin: 'jiānchí',
        hanviet: 'KIÊN TRÌ',
        meaning: 'Kiên trì',
        pos: 'Động từ',
        level: 5,
        status: 'learning',
        note: '',
        exampleZh: '',
        exampleVi: '',
      },
    ];
    const onFlashcard = vi.fn();
    const onWrite = vi.fn();
    const onSpeak = vi.fn();

    render(
      <LessonAccordionList
        meta={HSK5_META}
        courseLessons={lessons}
        courseWords={words}
        onPickFile={vi.fn()}
        onOpenFlashcard={onFlashcard}
        onPracticeWriting={onWrite}
        onSpeakWord={onSpeak}
      />,
    );

    // Bài 1 thuộc 2 bài đầu nên mặc định mở (thấy "安慰"); Bài 3 mặc định đóng (ẩn "坚持")
    expect(screen.getByText('安慰')).toBeInTheDocument();
    expect(screen.queryByText('坚持')).not.toBeInTheDocument();

    // Bấm nút loa trên thẻ từ -> gọi hàm đọc phát âm với đúng chữ Hán
    fireEvent.click(screen.getByTitle('Nghe phát âm'));
    expect(onSpeak).toHaveBeenCalledWith('安慰');

    // Bấm "Mở tất cả" -> Bài 3 bung ra và hiện từ "坚持"
    fireEvent.click(screen.getByRole('button', { name: 'Mở tất cả' }));
    expect(screen.getByText('坚持')).toBeInTheDocument();

    // Bấm nút "Thu gọn" ở thanh công cụ đầu danh sách -> đóng toàn bộ bài học
    fireEvent.click(screen.getAllByRole('button', { name: 'Thu gọn' })[0]);
    expect(screen.queryByText('安慰')).not.toBeInTheDocument();
    expect(screen.queryByText('坚持')).not.toBeInTheDocument();

    // Bấm tiêu đề "Bài 1" -> mở lại riêng Bài 1
    fireEvent.click(screen.getByText('Bài 1'));
    expect(screen.getByText('安慰')).toBeInTheDocument();

    // Bấm nút Ôn Flashcard & Luyện viết -> truyền đúng lessonId "l1"
    fireEvent.click(screen.getAllByRole('button', { name: /Ôn Flashcard bài này/i })[0]);
    expect(onFlashcard).toHaveBeenCalledWith('l1');
    fireEvent.click(screen.getAllByRole('button', { name: /Luyện viết bài này/i })[0]);
    expect(onWrite).toHaveBeenCalledWith('l1');
  });

  it('LessonAccordionList hiển thị màn hình trống (empty state) và gọi onPickFile khi khóa học chưa có bài nào', () => {
    const onPickFile = vi.fn();
    render(
      <LessonAccordionList
        meta={HSK5_META}
        courseLessons={[]}
        courseWords={[]}
        onPickFile={onPickFile}
        onOpenFlashcard={vi.fn()}
        onPracticeWriting={vi.fn()}
        onSpeakWord={vi.fn()}
      />,
    );

    // Khi rỗng phải hiện nút kêu gọi chọn file Smart Importer
    fireEvent.click(screen.getByRole('button', { name: /Chọn file \.PDF \/ \.DOCX \/ \.TXT/i }));
    expect(onPickFile).toHaveBeenCalledTimes(1);
  });

  it('ImportPreviewPanel hiển thị từ xem trước, gọi onConfirmInsert và khóa nút lưu khi isSaving = true', () => {
    const previewRef = React.createRef<HTMLDivElement>();
    const onConfirm = vi.fn();
    const draft = {
      extractedPreview: [
        {
          selected: true,
          hanzi: '珍惜',
          pinyin: 'zhēnxī',
          english: 'cherish',
          meaning: 'Trân trọng',
          exampleZh: '珍惜时间',
          exampleVi: 'Trân trọng thời gian',
        },
      ],
      extractedExercises: [],
      autoGenerateExercises: true,
      lessonBaseName: 'HSK5 Demo',
      splitSize: 50,
      extractSearch: '',
    };

    const { rerender } = render(
      <ImportPreviewPanel
        level={5}
        meta={HSK5_META}
        previewCardRef={previewRef}
        loadingText={null}
        isSaving={false}
        draft={draft}
        selectedCount={1}
        selectedExerciseCount={0}
        bilingualExampleCount={1}
        lessonCountPreview={1}
        filteredPreview={[{ row: draft.extractedPreview[0], idx: 0 }]}
        onConfirmInsert={onConfirm}
      />,
    );

    // Kiểm tra hiển thị đúng từ trích xuất và kích hoạt hàm lưu khi bấm xác nhận
    expect(screen.getByText('珍惜')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Lưu vào MongoDB HSK 5/i });
    fireEvent.click(saveBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Khi đang lưu (isSaving = true) -> nút chuyển sang trạng thái "Đang lưu" và disabled để chống bấm đúp
    rerender(
      <ImportPreviewPanel
        level={5}
        meta={HSK5_META}
        previewCardRef={previewRef}
        loadingText={null}
        isSaving={true}
        draft={draft}
        selectedCount={1}
        selectedExerciseCount={0}
        bilingualExampleCount={1}
        lessonCountPreview={1}
        filteredPreview={[{ row: draft.extractedPreview[0], idx: 0 }]}
        onConfirmInsert={onConfirm}
      />,
    );
    expect(screen.getByRole('button', { name: /Đang lưu/i })).toBeDisabled();
  });
});
