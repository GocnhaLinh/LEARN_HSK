export interface CourseMeta {
  level: number;
  tier: 'primary' | 'intermediate';
  code: string;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  emoji: string;
  featured?: boolean;
}

export const COURSES_META: CourseMeta[] = [
  {
    level: 1,
    tier: 'primary',
    code: 'HSK 1',
    title: 'HSK 1 — Sơ cấp 1',
    subtitle: 'Giao tiếp chào hỏi, học tập & đời sống cơ bản.',
    badge: 'SƠ CẤP 1',
    color: '#F4C2D7',
    emoji: '🌸',
  },
  {
    level: 2,
    tier: 'primary',
    code: 'HSK 2',
    title: 'HSK 2 — Sơ cấp 2',
    subtitle: 'Hội thoại sinh hoạt, du lịch, thời gian & cảm xúc.',
    badge: 'SƠ CẤP 2',
    color: '#EFE078',
    emoji: '🍋',
  },
  {
    level: 3,
    tier: 'primary',
    code: 'HSK 3',
    title: 'HSK 3 — Sơ cấp 3',
    subtitle: 'Diễn đạt quan điểm, văn hóa, công việc & môi trường.',
    badge: 'SƠ CẤP 3',
    color: '#CBEAD8',
    emoji: '🍵',
  },
  {
    level: 4,
    tier: 'intermediate',
    code: 'HSK 4',
    title: 'HSK 4 — Trung cấp 1',
    subtitle: 'Giao tiếp tự nhiên, thuyết phục, kế hoạch & học thuật cơ bản.',
    badge: 'TRUNG CẤP 1',
    color: '#DCD2F5',
    emoji: '🫐',
  },
  {
    level: 5,
    tier: 'intermediate',
    code: 'HSK 5',
    title: 'HSK 5 — Trung cấp 2',
    subtitle: 'Chuẩn NEW HSK5 3.0 — hỗ trợ tải file PDF/DOCX tự động chia bài, tách từ vựng & tạo bài tập.',
    badge: 'ĐANG HỌC ★',
    color: '#F4C2D7',
    emoji: '🐼',
    featured: true,
  },
  {
    level: 6,
    tier: 'intermediate',
    code: 'HSK 6',
    title: 'HSK 6 — Trung cấp 3',
    subtitle: 'Đọc báo chí, phân tích chuyên sâu, thành ngữ & viết luận.',
    badge: 'TRUNG CẤP 3',
    color: '#EFE078',
    emoji: '🏮',
  },
];
