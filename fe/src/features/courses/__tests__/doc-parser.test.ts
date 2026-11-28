/**
 * Kiểm thử bộ phân tích tài liệu Smart Importer (doc-parser.ts).
 * Mục đích: Đảm bảo trích xuất đúng từ vựng tiếng Trung, ví dụ song ngữ, câu hỏi bài tập
 * từ các định dạng văn bản khác nhau (.txt / bảng tab / pipe / PDF phẳng) và báo lỗi đúng khi file không hợp lệ.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  extractWrittenExercises,
  parseCourseFile,
  smartExtractChineseVocab,
} from '@/features/courses/utils/doc-parser';

describe('doc-parser (Bộ tách từ vựng & bài tập từ tài liệu)', () => {
  describe('smartExtractChineseVocab — Trích xuất bảng từ vựng', () => {
    it('tách đúng dòng bảng phân tách bằng tab/pipe, lấy ví dụ song ngữ, khử trùng chữ Hán và lọc dòng rác', () => {
      // Giả lập file có cả dòng tiêu đề rác (TikTok, header bảng), 2 từ hợp lệ, 1 từ trùng lặp và 1 dòng câu hỏi
      const raw = [
        'TỪ VỰNG HSK 5 — SOẠN BỞI TIKTOK: abc',
        'STT | Chữ Hán | Pinyin | English | Nghĩa | Ví dụ',
        '1\t安慰\tānwèi\tcomfort\tAn ủi\t她一直在安慰我。 - Cô ấy luôn an ủi tôi.',
        '2 | 坚持 | jiānchí | persist | Kiên trì | 我们要坚持学习。 — Chúng ta phải kiên trì học tập.',
        '3\t安慰\tānwèi\tcomfort\tTrùng lặp',
        'Câu 1: Tôi thích uống trà => 我喜欢喝茶',
      ].join('\n');

      const rows = smartExtractChineseVocab(raw);

      // Kỳ vọng: chỉ còn đúng 2 từ duy nhất (loại header, dòng trùng "安慰" và dòng "Câu 1:")
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        selected: true,
        hanzi: '安慰',
        pinyin: 'ānwèi',
        english: 'comfort',
        meaning: 'An ủi',
        exampleZh: '她一直在安慰我。',
        exampleVi: 'Cô ấy luôn an ủi tôi.',
      });
      expect(rows[1]).toMatchObject({
        hanzi: '坚持',
        pinyin: 'jiānchí',
        english: 'persist',
        meaning: 'Kiên trì',
        exampleZh: '我们要坚持学习。',
        exampleVi: 'Chúng ta phải kiên trì học tập.',
      });
    });

    it('tách đúng dòng từ vựng bị dồn thành khoảng trắng (thường gặp khi copy/đọc từ PDF)', () => {
      // Trường hợp PDF mất ký tự tab, các cột dính nhau bằng khoảng trắng sau số thứ tự
      const raw = '12 珍惜 zhēnxī  cherish  Trân trọng 我很珍惜这份友谊。 - Tôi rất trân trọng tình bạn này.';
      const rows = smartExtractChineseVocab(raw);

      // Kỳ vọng: vẫn tách chuẩn từng cột hanzi, pinyin, nghĩa tiếng Anh/Việt và cặp ví dụ Trung - Việt
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        hanzi: '珍惜',
        pinyin: 'zhēnxī',
        english: 'cherish',
        meaning: 'Trân trọng',
        exampleZh: '我很珍惜这份友谊。',
        exampleVi: 'Tôi rất trân trọng tình bạn này.',
      });
    });
  });

  describe('extractWrittenExercises — Trích xuất câu hỏi bài tập', () => {
    it('tách block trắc nghiệm A/B/C/D và tự ánh xạ chữ cái đáp án (B) sang nội dung phương án đúng', () => {
      const raw = [
        'Câu 1: Từ nào mang nghĩa "kiên trì"?',
        'A. 安慰',
        'B. 坚持',
        'C. 珍惜',
        'D. 咖啡',
        'Đáp án: B',
      ].join('\n');

      const res = extractWrittenExercises(raw, false);

      // Kỳ vọng: nhận diện loại 'quiz', gom đủ 4 đáp án và đổi "B" thành "坚持"
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        exerciseType: 'quiz',
        options: ['安慰', '坚持', '珍惜', '咖啡'],
        correctAnswer: '坚持',
        selected: true,
      });
    });

    it('tách cặp câu hỏi - đáp án dịch Việt → Trung thành bài tập loại translate', () => {
      const raw = [
        'Câu 1: Hôm nay tôi rất vui.',
        'Đáp án: 今天我很高兴。',
      ].join('\n');

      // Truyền hasVocabRows = true để chắc chắn các câu hỏi có nhãn "Câu X / Đáp án:" rõ ràng vẫn được trích xuất
      const res = extractWrittenExercises(raw, true);

      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        exerciseType: 'translate',
        question: 'Hôm nay tôi rất vui.',
        correctAnswer: '今天我很高兴。',
      });
    });

    it('bỏ qua tách lỏng lẻo khi file đã có bảng từ vựng để tránh nhận nhầm ví dụ từ vựng thành bài tập', () => {
      // Dòng không có nhãn "Câu X / Đáp án:", dễ bị nhầm với ví dụ song ngữ trong file từ vựng
      const raw = '1. Hôm nay trời rất đẹp\n今天天气很好';

      // Khi hasVocabRows = true, không được sinh bài tập rác từ các dòng rời
      expect(extractWrittenExercises(raw, true)).toHaveLength(0);
    });
  });

  describe('parseCourseFile — Luồng đọc file đầu vào', () => {
    it('đọc file .txt hợp lệ, gửi thông báo tiến độ qua onProgress và trả về danh sách từ', async () => {
      const content = '1\t咖啡\tkāfēi\tcoffee\tCà phê\t我喜欢喝咖啡。 - Tôi thích uống cà phê.';
      const file = {
        name: 'hsk5-demo.txt',
        text: vi.fn().mockResolvedValue(content),
      } as unknown as File;
      const onProgress = vi.fn();

      const { words, exercises } = await parseCourseFile(file, onProgress);

      // Kiểm tra callback tiến độ hiển thị đúng tên file và dữ liệu tách khớp kỳ vọng
      expect(onProgress).toHaveBeenCalledWith('Đang đọc file "hsk5-demo.txt"...');
      expect(words).toHaveLength(1);
      expect(words[0].hanzi).toBe('咖啡');
      expect(exercises).toHaveLength(0);
    });

    it('ném lỗi tiếng Việt khi người dùng chọn định dạng file không được hỗ trợ (ví dụ .xlsx)', async () => {
      const file = new File(['abc'], 'sheet.xlsx', { type: 'application/octet-stream' });

      // Đảm bảo chặn sớm trước khi gọi parser PDF/DOCX
      await expect(parseCourseFile(file)).rejects.toThrow(
        'Chỉ hỗ trợ định dạng .docx, .pdf hoặc .txt!',
      );
    });
  });
});
