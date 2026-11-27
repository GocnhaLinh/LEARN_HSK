import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { AppProvider } from '@/context/AppContext';
import {
  CourseDetailPage,
  CoursesPage,
  ExercisesPage,
  FlashcardPage,
  GamePage,
  HomePage,
  NotesPage,
  VocabPage,
  WritingPage,
} from '@/routes/lazyPages';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Module 01: Trang chủ */}
            <Route path="/" element={<HomePage />} />

            {/* Module 02: Khóa học HSK 1-6 + Smart Importer + Phòng thi thử */}
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:level" element={<CourseDetailPage />} />
            <Route path="/courses/:level/exercises" element={<ExercisesPage />} />

            {/* Module 03: Flashcard Digicam & Flip-TTS */}
            <Route path="/flashcard" element={<FlashcardPage />} />
            <Route path="/flashcard/lesson/:lessonId" element={<FlashcardPage />} />
            <Route path="/flashcard/:filter" element={<FlashcardPage />} />

            {/* Module 04: Luyện viết Chữ Hán (HanziWriter + Canvas) */}
            <Route path="/writing" element={<Navigate to="/writing/hanzi" replace />} />
            <Route path="/writing/hanzi" element={<WritingPage />} />
            <Route path="/writing/hanzi/:char" element={<WritingPage />} />
            <Route path="/writing/canvas" element={<WritingPage />} />

            {/* Module 05: Đấu trường Mini-Game */}
            <Route path="/game" element={<Navigate to="/game/quiz" replace />} />
            <Route path="/game/:mode" element={<GamePage />} />

            {/* Module 06: Kho từ HSK 3.0 & Backup JSON */}
            <Route path="/vocab" element={<VocabPage />} />

            {/* Module 07: MindNotes & Nhật ký */}
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/notes/:noteId/edit" element={<NotesPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
