import { Inbox } from 'lucide-react';
import React, { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, EmptyState } from '@/components/ui';
import { FlashcardDigicamCard } from '@/features/flashcard/components/FlashcardDigicamCard';
import { FlashcardFilterBar } from '@/features/flashcard/components/FlashcardFilterBar';
import {
  FlashcardSrsControls,
  FlashcardTtsPanel,
} from '@/features/flashcard/components/FlashcardSrsControls';
import { useFlashcardDeck } from '@/features/flashcard/hooks/useFlashcardDeck';

export const FlashcardPage: React.FC = () => {
  const { filter, lessonId } = useParams();
  const navigate = useNavigate();
  const {
    activeFilter,
    activeLessonTitle,
    word,
    safeIndex,
    totalCount,
    triggerFlip,
    navCard,
    handleRate,
    speak,
  } = useFlashcardDeck(filter, lessonId);

  const handleSelectFilter = useCallback(
    (key: string) => navigate(`/flashcard/${key}`),
    [navigate],
  );

  return (
    <section className="space-y-6">
      <FlashcardFilterBar
        activeFilter={activeFilter}
        activeLessonTitle={activeLessonTitle}
        onSelectFilter={handleSelectFilter}
      />

      {!word ? (
        <Card padding="none">
          <EmptyState
            icon={<Inbox className="w-10 h-10" />}
            title="Không có thẻ nào trong bộ lọc này"
            description="Hãy chọn bộ lọc khác hoặc quay lại danh sách tất cả từ vựng."
            actions={
              <Button variant="primary" className="px-5 py-2.5" onClick={() => navigate('/flashcard/all')}>
                XEM TẤT CẢ THẺ
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <FlashcardDigicamCard
            word={word}
            cardIndex={safeIndex}
            onFlip={triggerFlip}
            onSpeakExample={(text) => speak(text, 0.92)}
            onPracticeWrite={(ch) => navigate(`/writing/hanzi/${encodeURIComponent(ch)}`)}
          >
            <FlashcardSrsControls
              currentIndex={safeIndex}
              totalCount={totalCount}
              onRate={handleRate}
              onNav={navCard}
            />
          </FlashcardDigicamCard>

          <FlashcardTtsPanel word={word} onSpeak={speak} />
        </div>
      )}
    </section>
  );
};
