import { Eye, Info, PencilLine, Play, Volume2 } from 'lucide-react';
import React, { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import type { VocabWord } from '@/types';

interface HanziWriterPanelProps {
  activeChar: string;
  quickPool: string[];
  matchedWord?: VocabWord;
  writerBoxRef: React.RefObject<HTMLDivElement>;
  statusText: string;
  showOutline: boolean;
  loadError: string | null;
  onSelectChar: (ch: string) => void;
  onSpeak: (ch: string) => void;
  onAnimate: () => void;
  onQuiz: () => void;
  onToggleOutline: () => void;
  onInvalidInput: () => void;
}

export const HanziWriterPanel: React.FC<HanziWriterPanelProps> = ({
  activeChar,
  quickPool,
  matchedWord,
  writerBoxRef,
  statusText,
  showOutline,
  loadError,
  onSelectChar,
  onSpeak,
  onAnimate,
  onQuiz,
  onToggleOutline,
  onInvalidInput,
}) => {
  const [charInput, setCharInput] = useState('');

  const handleSubmitChar = () => {
    const clean = charInput.trim();
    if (!clean) {
      onInvalidInput();
      return;
    }
    const ch = Array.from(clean)[0];
    setCharInput('');
    onSelectChar(ch);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
      <div className="lg:col-span-5 space-y-3.5">
        <Card padding="sm" className="space-y-2.5">
          <label htmlFor="write-char-input" className="font-mono text-xs font-bold uppercase block">
            Nhập chữ Hán bất kỳ để đồ nét
          </label>
          <div className="flex items-stretch gap-2 min-w-0">
            <Input
              id="write-char-input"
              type="text"
              maxLength={2}
              value={charInput}
              onChange={(e) => setCharInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitChar();
              }}
              placeholder="VD: 学, 爱, 茶, 汉..."
              className="flex-1 font-serifcn text-lg"
            />
            <Button
              variant="primary"
              onClick={handleSubmitChar}
              className="shrink-0 whitespace-nowrap"
            >
              Tải chữ
            </Button>
          </div>
        </Card>

        <Card padding="sm" className="space-y-2.5">
          <p className="font-mono text-xs font-bold uppercase">Chọn nhanh chữ luyện viết</p>
          <div className="grid grid-cols-5 gap-2">
            {quickPool.map((ch) => {
              const active = ch === activeChar;
              return (
                <Button
                  key={ch}
                  variant={active ? 'primary' : 'default'}
                  onClick={() => onSelectChar(ch)}
                  className={
                    active
                      ? 'py-2 font-serifcn text-xl'
                      : 'py-2 bg-[#F8F6F1] font-serifcn text-xl hover:bg-[#EFE078]'
                  }
                >
                  {ch}
                </Button>
              );
            })}
          </div>
        </Card>

        <Card padding="sm" className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-serifcn text-4xl font-bold">{activeChar}</span>
              <span className="font-mono text-sm font-semibold text-[#A62626]">
                {matchedWord ? matchedWord.pinyin : 'Chữ tùy chỉnh'}
              </span>
            </div>
            <p className="text-sm font-medium mt-1">
              {matchedWord
                ? `${matchedWord.hanzi}: ${matchedWord.meaning}`
                : 'Dữ liệu nét viết từ HanziWriter'}
            </p>
          </div>
          <Button
            variant="primary"
            size="icon"
            onClick={() => onSpeak(activeChar)}
            className="w-10 h-10 shrink-0"
            title="Phát âm"
            aria-label={`Phát âm chữ ${activeChar}`}
          >
            <Volume2 className="w-4 h-4" />
          </Button>
        </Card>
      </div>

      <Card padding="md" className="lg:col-span-7 flex flex-col items-center">
        <div className="w-full mb-4 px-3.5 py-2 bg-[#F8F6F1] border border-[#141414] rounded-lg font-mono text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{statusText}</span>
        </div>

        <div className="mizige-grid flex items-center justify-center">
          <div
            ref={writerBoxRef}
            className={`relative z-10 w-[280px] h-[280px] ${loadError ? 'hidden' : ''}`}
          />
          {loadError && (
            <div className="relative z-10 w-[280px] h-[280px] flex items-center justify-center p-4 text-center font-mono text-xs text-red-700">
              {loadError}
            </div>
          )}
        </div>

        <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
          <Button
            variant="primary"
            onClick={onAnimate}
            leftIcon={<Play className="w-3.5 h-3.5" />}
            className="py-2.5"
          >
            Xem nét mẫu
          </Button>
          <Button
            variant="yellow"
            onClick={onQuiz}
            leftIcon={<PencilLine className="w-3.5 h-3.5" />}
            className="py-2.5"
          >
            Quiz (+10 XP)
          </Button>
          <Button
            variant="default"
            onClick={onToggleOutline}
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            className="py-2.5 hover:bg-[#F4C2D7]"
          >
            {showOutline ? 'Ẩn khung mờ' : 'Hiện khung mờ'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
