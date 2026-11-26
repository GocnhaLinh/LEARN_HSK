import React, { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { FreehandCanvasPanel } from '@/features/writing/components/FreehandCanvasPanel';
import { HandwritingGallery } from '@/features/writing/components/HandwritingGallery';
import { HanziWriterPanel } from '@/features/writing/components/HanziWriterPanel';
import { useFreehandCanvas } from '@/features/writing/hooks/useFreehandCanvas';
import {
  useDeleteHandwritingItem,
  useHandwriting,
  useRecordHanziQuiz,
  useSaveHandwritingSnapshot,
} from '@/features/writing/hooks/useHandwriting';
import { useHanziWriter } from '@/features/writing/hooks/useHanziWriter';
import { useWritingStore } from '@/features/writing/stores/writing.store';
import type { EffectCoords } from '@/lib/fx-utils';
import { speakChinese } from '@/lib/speech-utils';
import { useToastStore } from '@/stores/toast.store';

export const WritingPage: React.FC = () => {
  const { char: charParam } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { vocab } = useApp();
  const writeQuickPool = useWritingStore((s) => s.writeQuickPool);

  const isCanvasMode = pathname.startsWith('/writing/canvas');
  const activeChar = charParam ? Array.from(decodeURIComponent(charParam))[0] || '学' : '学';
  const matchedWord = useMemo(
    () => vocab.find((v) => v.hanzi.includes(activeChar)),
    [vocab, activeChar],
  );

  const { data: handwritingGallery = [] } = useHandwriting();
  const recordQuiz = useRecordHanziQuiz();
  const saveSnapshot = useSaveHandwritingSnapshot();
  const deleteItem = useDeleteHandwritingItem();

  const onQuizComplete = useCallback(
    (ch: string) => {
      recordQuiz.mutate({ char: ch });
    },
    [recordQuiz],
  );

  const writer = useHanziWriter(activeChar, !isCanvasMode, onQuizComplete);
  const canvas = useFreehandCanvas(isCanvasMode);

  const handleSaveSnapshot = (coords?: EffectCoords) => {
    const snap = canvas.captureSnapshot();
    if (!snap) return;
    saveSnapshot.mutate({ ...snap, coords });
  };

  return (
    <section className="space-y-4 sm:space-y-5">
      <Card
        variant="flat"
        padding="sm"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <p className="font-mono text-[11px] uppercase opacity-65">[04] WRITING STUDIO // 米字格</p>
          <h2 className="font-serif font-bold text-2xl">Luyện viết Chữ Hán</h2>
        </div>

        <div className="grid grid-cols-2 sm:inline-flex gap-1.5">
          <Button
            variant={!isCanvasMode ? 'primary' : 'default'}
            onClick={() => navigate(`/writing/hanzi/${encodeURIComponent(activeChar)}`)}
          >
            Đồ nét chuẩn (HanziWriter)
          </Button>
          <Button
            variant={isCanvasMode ? 'primary' : 'default'}
            onClick={() => navigate('/writing/canvas')}
          >
            Viết tay tự do (Canvas)
          </Button>
        </div>
      </Card>

      {!isCanvasMode ? (
        <HanziWriterPanel
          activeChar={activeChar}
          quickPool={writeQuickPool}
          matchedWord={matchedWord}
          writerBoxRef={writer.writerBoxRef}
          statusText={writer.statusText}
          showOutline={writer.showOutline}
          loadError={writer.loadError}
          onSelectChar={(ch) => navigate(`/writing/hanzi/${encodeURIComponent(ch)}`)}
          onSpeak={(ch) =>
            speakChinese(ch, 0.85, (m) => useToastStore.getState().showToast(m, 'pink'))
          }
          onAnimate={writer.handleAnimate}
          onQuiz={writer.handleQuiz}
          onToggleOutline={writer.handleToggleOutline}
          onInvalidInput={() =>
            useToastStore.getState().showToast('Vui lòng nhập 1 chữ Hán hợp lệ.', 'pink')
          }
        />
      ) : (
        <div className="space-y-6">
          <FreehandCanvasPanel
            canvasRef={canvas.canvasRef}
            inkColor={canvas.inkColor}
            brushSize={canvas.brushSize}
            caption={canvas.caption}
            isSaving={saveSnapshot.isPending}
            onInkColorChange={canvas.setInkColor}
            onBrushSizeChange={canvas.setBrushSize}
            onCaptionChange={canvas.setCaption}
            onClear={canvas.clearCanvas}
            onSave={handleSaveSnapshot}
          />
          <HandwritingGallery
            items={handwritingGallery}
            onDelete={(id) => deleteItem.mutate(id)}
          />
        </div>
      )}
    </section>
  );
};
