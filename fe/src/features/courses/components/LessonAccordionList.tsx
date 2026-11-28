import { ChevronDown, ChevronUp, FileUp, Layers, PenTool, Volume2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { useCoursesUiStore } from '@/features/courses/stores/courses-ui.store';
import type { CourseMeta, Lesson, VocabWord } from '@/types';

interface LessonAccordionListProps {
  meta: CourseMeta;
  courseLessons: Lesson[];
  courseWords: VocabWord[];
  onPickFile: () => void;
  onOpenFlashcard: (lessonId: string) => void;
  onPracticeWriting: (lessonId: string) => void;
  onSpeakWord: (hanzi: string) => void;
}

export const LessonAccordionList: React.FC<LessonAccordionListProps> = React.memo(
  ({
    meta,
    courseLessons,
    courseWords,
    onPickFile,
    onOpenFlashcard,
    onPracticeWriting,
    onSpeakWord,
  }) => {
    const expandedLessons = useCoursesUiStore((s) => s.expandedLessons);

    // Pre-group words by lessonId once (O(N)) instead of filtering inside each lesson card (O(L*N))
    const wordsByLesson = useMemo(() => {
      const map = new Map<string, VocabWord[]>();
      for (const w of courseWords) {
        const arr = map.get(w.lessonId);
        if (arr) arr.push(w);
        else map.set(w.lessonId, [w]);
      }
      return map;
    }, [courseWords]);

    const lessonIds = useMemo(() => courseLessons.map((l) => l.id), [courseLessons]);
    const isExpanded = (lessonId: string, idx: number) =>
      lessonId in expandedLessons ? expandedLessons[lessonId] : idx < 2;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif font-bold text-2xl">Danh sách Bài học</h3>
          <div className="flex items-center gap-2 font-mono text-xs">
            {courseLessons.length > 2 && (
              <>
                <button
                  type="button"
                  onClick={() => useCoursesUiStore.getState().setLessonsExpanded(lessonIds, true)}
                  className="px-2.5 py-1 bg-white text-[#111111] border border-[#141414] rounded font-bold hover:bg-[#EFE078]"
                >
                  Mở tất cả
                </button>
                <button
                  type="button"
                  onClick={() => useCoursesUiStore.getState().setLessonsExpanded(lessonIds, false)}
                  className="px-2.5 py-1 bg-white text-[#111111] border border-[#141414] rounded font-bold hover:bg-[#F4C2D7]"
                >
                  Thu gọn
                </button>
              </>
            )}
            <Badge variant="yellow" className="text-xs">
              {courseLessons.length} bài học
            </Badge>
          </div>
        </div>

        {!courseLessons.length ? (
          <Card padding="none" className="p-8 text-center space-y-3">
            <p className="font-mono text-xs opacity-70">
              Chưa có bài học nào trong {meta.code}. Hãy tải file <code>.PDF / .DOCX / .TXT</code>{' '}
              qua Smart Importer để tự động chia bài học!
            </p>
            <Button
              variant="yellow"
              leftIcon={<FileUp className="w-3.5 h-3.5" />}
              onClick={onPickFile}
            >
              Chọn file .PDF / .DOCX / .TXT
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {courseLessons.map((lesson, idx) => {
              const lessonWords = wordsByLesson.get(lesson.id) || [];
              const expanded = isExpanded(lesson.id, idx);
              const toggle = () => useCoursesUiStore.getState().toggleLesson(lesson.id, idx < 2);

              return (
                <Card key={lesson.id} padding="none" className="p-4 sm:p-5 space-y-4">
                  <div
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      expanded ? 'pb-3 border-b border-dashed border-current/20' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={toggle}
                      className="text-left flex-1 min-w-0 group"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-serif font-bold text-xl group-hover:underline">
                          {lesson.title}
                        </h4>
                        {lesson.fromFile && (
                          <Badge variant="yellow" size="xs">
                            📄 Từ file tải lên
                          </Badge>
                        )}
                        <span className="px-2 py-0.5 bg-[#F8F6F1] border border-[#141414]/30 rounded font-mono text-[10px] font-bold">
                          {lessonWords.length} từ
                        </span>
                      </div>
                      <p className="text-xs opacity-75 mt-1">
                        {lesson.desc || 'Danh sách từ vựng trong bài học.'}
                      </p>
                    </button>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        className="px-3.5 py-2"
                        leftIcon={<Layers className="w-3.5 h-3.5" />}
                        onClick={() => onOpenFlashcard(lesson.id)}
                      >
                        Ôn Flashcard bài này
                      </Button>
                      <Button
                        variant="yellow"
                        size="sm"
                        className="px-3.5 py-2"
                        leftIcon={<PenTool className="w-3.5 h-3.5" />}
                        onClick={() => onPracticeWriting(lesson.id)}
                      >
                        Luyện viết bài này
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="px-2.5 py-2 hover:bg-[#F4C2D7]"
                        title={expanded ? 'Thu gọn danh sách từ' : 'Xem danh sách từ'}
                        leftIcon={
                          expanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        }
                        onClick={toggle}
                      >
                        <span className="hidden sm:inline">{expanded ? 'Thu gọn' : 'Xem từ'}</span>
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {lessonWords.length ? (
                        lessonWords.map((w) => (
                          <div
                            key={w.id}
                            className="p-3 rounded-xl bg-[#F8F6F1] border border-[#141414]/25 flex items-start justify-between gap-2 hover:bg-white transition"
                          >
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-serifcn text-xl font-bold text-[#141414]">
                                  {w.hanzi}
                                </span>
                                <span className="font-mono text-[11px] text-[#A62626] font-semibold">
                                  {w.pinyin}
                                </span>
                              </div>
                              <div className="text-xs font-semibold mt-0.5 truncate">
                                {w.meaning}
                              </div>
                              <div className="font-mono text-[10px] opacity-60 mt-0.5">
                                {w.hanviet || '—'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSpeakWord(w.hanzi)}
                              className="t-btn-black w-7 h-7 flex items-center justify-center shrink-0"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-full text-xs font-mono opacity-60">
                          Chưa có từ vựng trong bài học này.
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

LessonAccordionList.displayName = 'LessonAccordionList';
