# HSK (QUEST) 3.0 — Personal Mandarin Zine (Full-Stack FE + BE)

Dự án web tự học tiếng Trung chuẩn **HSK 3.0 (Cấp 1–6)** được chuyển đổi từ `v1.3.html`, giữ nguyên 100% giao diện **Editorial Zine / Pastel Diary**, bổ sung hệ thống định tuyến (Router) đầy đủ ở cả **Frontend (React + Vite + React Router)** và **Backend (NestJS + Mongoose / MongoDB)**.

---

## Cấu trúc thư mục

```text
WEBSITEHSK/
├── package.json         # Scripts tiện ích chạy FE & BE
├── be/                  # Backend NestJS + MongoDB (Mongoose)
│   ├── .env             # Biến môi trường (MONGODB_URI, PORT, CORS_ORIGIN)
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── data/seed.data.ts         # 16 bài học + 105 từ HSK 1-6 + 2 MindNotes
│       ├── schemas/                  # Profile, Lesson, Vocab, Note, Handwriting
│       └── modules/
│           ├── health/               # GET /api/health
│           ├── seed/                 # Auto-seed MongoDB & POST /api/seed/reset
│           ├── profile/              # Profile, XP, Streak, Check-in, Missions
│           ├── courses/              # HSK 1-6 Overview & Detail
│           ├── lessons/              # Lessons CRUD & Bulk PDF/DOCX Import
│           ├── vocab/                # Vocab CRUD, Filter, SRS Status
│           ├── notes/                # MindNotes CRUD
│           ├── handwriting/          # Freehand Canvas Gallery
│           └── backup/               # JSON Export / Import
└── fe/                  # Frontend React + TypeScript + Vite + Tailwind CSS
    └── src/
        ├── App.tsx                   # React Router đầy đủ cho 7 module
        ├── index.css                 # Theme Zine/Pastel & toàn bộ animation
        ├── context/AppContext.tsx    # Đồng bộ NestJS API + Fallback offline
        ├── services/api.ts           # Typed REST client
        ├── utils/docParser.ts        # Trích xuất bảng 6 cột .PDF / .DOCX / .TXT
        ├── components/               # Navbar, BottomDock, MascotWidget, Toast, Layout
        └── pages/                    # 7 module trang riêng biệt
```

---

## Danh sách Route Frontend

| Module           | Route                                       | Mô tả                                                        |
| :--------------- | :------------------------------------------ | :----------------------------------------------------------- |
| 01 Trang chủ     | `/`                                         | Dashboard, Streak 7 ngày, KPI, Daily Target, Missions        |
| 02 Khóa học      | `/courses`                                  | Tổng quan lộ trình Trung cấp (4–6) & Sơ cấp (1–3)            |
| 02 Chi tiết khóa | `/courses/:level`                           | Chi tiết khóa HSK 1–6 + Smart Importer `.PDF/.DOCX/.TXT`     |
| 03 Flashcard     | `/flashcard`                                | Thẻ Digicam 3D & Flip-TTS (mặc định theo Focus Level)        |
| 03 Flashcard lọc | `/flashcard/:filter`                        | Lọc theo `all`, `review`, `learning`, `new`, `hsk1`..`hsk6`  |
| 03 Flashcard bài | `/flashcard/lesson/:lessonId`               | Ôn thẻ riêng của từng bài học                                |
| 04 Luyện viết    | `/writing/hanzi` & `/writing/hanzi/:char`   | Đồ nét chuẩn thứ tự bút thuận (HanziWriter trên lưới 米字格) |
| 04 Viết tự do    | `/writing/canvas`                           | Bảng vẽ tự do + Sổ tay ảnh chữ viết                          |
| 05 Mini-Game     | `/game/quiz`, `/game/listen`, `/game/match` | Trắc nghiệm nhanh, Nghe chọn chữ, Ghép cặp 5 thẻ             |
| 06 Kho từ        | `/vocab`                                    | Tìm kiếm/lọc (`?q=&level=&status=`), Thêm từ, Xuất/Nhập JSON |
| 07 MindNotes     | `/notes` & `/notes/:noteId/edit`            | Ghi chú ngữ pháp & Nhật ký tiếng Trung                       |

---

## Danh sách API Backend (NestJS — prefix `/api`)

- **Health**: `GET /api/health`
- **Profile**: `GET /api/profile`, `PATCH /api/profile`, `POST /api/profile/checkin`, `POST /api/profile/xp`, `POST /api/profile/review`, `POST /api/profile/written`, `PATCH /api/profile/missions/:key`
- **Courses**: `GET /api/courses`, `GET /api/courses/:level`
- **Lessons**: `GET /api/lessons`, `GET /api/lessons/:id`, `POST /api/lessons`, `POST /api/lessons/import`, `DELETE /api/lessons/:id`
- **Vocab**: `GET /api/vocab`, `GET /api/vocab/:id`, `POST /api/vocab`, `PATCH /api/vocab/:id`, `PATCH /api/vocab/:id/status`, `DELETE /api/vocab/:id`
- **Exercises (Bài tập từng cấp HSK)**: `GET /api/exercises`, `POST /api/exercises`, `POST /api/exercises/:id/submit`, `DELETE /api/exercises/:id`
- **Scores (Điểm thi đua & Bảng thành tích)**: `GET /api/scores`, `POST /api/scores`
- **Notes**: `GET /api/notes`, `GET /api/notes/:id`, `POST /api/notes`, `PATCH /api/notes/:id`, `DELETE /api/notes/:id`
- **Handwriting**: `GET /api/handwriting`, `POST /api/handwriting`, `DELETE /api/handwriting/:id`
- **Backup & Seed**: `GET /api/backup/export`, `POST /api/backup/import`, `POST /api/seed/reset`

---

## Cấu trúc MongoDB Atlas (Database: `HSK`)

- `HSK1`, `HSK2`, `HSK3`, `HSK4`, `HSK5`, `HSK6`: Mỗi cấp HSK là 1 collection riêng chứa:
  - `category: "course_summary"` — Thông tin khóa & tổng kết điểm thi đua (`xpEarned`, `totalScore`, `highScore`, `bestCombo`, `exercisesCompleted`)
  - `category: "lesson"` — Danh sách bài học
  - `category: "vocab"` — Danh sách từ vựng (bao gồm cả từ import từ `.PDF / .DOCX`)
  - `category: "exercise"` — Bài tập trắc nghiệm / điền từ / dịch câu kèm giải thích & XP thưởng
- `profiles`: Thông tin tài khoản, Streak 7 ngày, XP, Daily Target, Missions, Theme
- `scores`: Lịch sử điểm thi đua từng lượt chơi Mini-Game & làm bài tập
- `notes`: MindNotes & Nhật ký tiếng Trung
- `handwriting`: Sổ tay ảnh viết tay Canvas

---

## Hướng dẫn kết nối MongoDB & Chạy dự án

1. **Cấu hình chuỗi kết nối MongoDB** trong `be/.env`:

   ```env
   PORT=3001
   MONGODB_URI=mongodb://127.0.0.1:27017/hsk_quest_30
   CORS_ORIGIN=http://localhost:5173
   ```

   _(Hỗ trợ cả MongoDB local lẫn MongoDB Atlas `mongodb+srv://...` — dữ liệu mẫu 16 bài học & 105 từ vựng sẽ tự động seed lần đầu kết nối)._

2. **Cài đặt dependencies** (nếu chưa cài):

   ```bash
   npm run install:all
   ```

3. **Chạy Backend (NestJS — cổng 3001)**:

   ```bash
   npm run dev:be
   ```

4. **Chạy Frontend (Vite React — cổng 5173)**:
   ```bash
   npm run dev:fe
   ```
   Mở trình duyệt tại `http://localhost:5173`.
