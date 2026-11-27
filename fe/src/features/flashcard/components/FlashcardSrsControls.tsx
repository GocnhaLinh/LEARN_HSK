import { MessageSquareQuote, Turtle, Volume2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui";
import { useFlashcardStore } from "@/features/flashcard/stores/flashcard.store";
import type { EffectCoords } from "@/lib/fx-utils";
import type { VocabStatus, VocabWord } from "@/types";

const SRS_OPTIONS: ReadonlyArray<{
  status: VocabStatus;
  label: string;
  xpText: string;
  shortcut: string;
  btnClass: string;
  subClass: string;
}> = [
  {
    status: "review",
    label: "Cần chú ý",
    xpText: "+5 XP",
    shortcut: "Phím 1",
    btnClass: "bg-[#F4C2D7] text-[#111111]",
    subClass: "text-[#3B1D2A]",
  },
  {
    status: "learning",
    label: "Đang học",
    xpText: "+10 XP",
    shortcut: "Phím 2",
    btnClass: "bg-[#EFE078] text-[#111111]",
    subClass: "text-[#3A320C]",
  },
  {
    status: "mastered",
    label: "Đã thuộc ✓",
    xpText: "+20 XP",
    shortcut: "Phím 3",
    btnClass: "srs-btn-dark bg-[#111111] text-white",
    subClass: "text-[#EFE078]",
  },
];

interface FlashcardSrsControlsProps {
  currentIndex: number;
  totalCount: number;
  onRate: (status: VocabStatus, coords: EffectCoords) => void;
  onNav: (dir: number) => void;
}

export const FlashcardSrsControls: React.FC<FlashcardSrsControlsProps> = ({
  currentIndex,
  totalCount,
  onRate,
  onNav,
}) => (
  <>
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {SRS_OPTIONS.map((opt) => (
        <button
          key={opt.status}
          type="button"
          onClick={(e) =>
            onRate(opt.status, { clientX: e.clientX, clientY: e.clientY })
          }
          className={`srs-btn py-2.5 sm:py-3 px-2 flex flex-col items-center justify-center gap-0.5 ${opt.btnClass}`}
        >
          <span className="text-xs sm:text-sm font-bold leading-tight whitespace-nowrap">
            {opt.label}
          </span>
          <span
            className={`font-mono text-[10px] font-semibold whitespace-nowrap ${opt.subClass}`}
          >
            {opt.xpText}
            <span className="hidden sm:inline"> • {opt.shortcut}</span>
          </span>
        </button>
      ))}
    </div>

    <div className="flex items-center justify-between pt-1">
      <Button
        variant="default"
        size="sm"
        className="px-3.5 py-2"
        onClick={() => onNav(-1)}
      >
        ← Thẻ trước
      </Button>
      <div className="text-center">
        <span className="font-mono text-xs font-bold text-[#141414]">
          {currentIndex + 1} / {totalCount}
        </span>
        <p className="font-mono text-[10px] text-[#57534E] hidden sm:block">
          Space: lật • ←/→: chuyển thẻ
        </p>
      </div>
      <Button
        variant="default"
        size="sm"
        className="px-3.5 py-2"
        onClick={() => onNav(1)}
      >
        Thẻ tiếp →
      </Button>
    </div>
  </>
);

interface FlashcardTtsPanelProps {
  word: VocabWord;
  onSpeak: (text: string, rate: number) => void;
}

export const FlashcardTtsPanel: React.FC<FlashcardTtsPanelProps> = ({
  word,
  onSpeak,
}) => {
  const autoRead = useFlashcardStore((s) => s.autoRead);
  const setAutoRead = useFlashcardStore((s) => s.setAutoRead);

  return (
    <aside className="lg:col-span-4 t-card bg-[#F4C2D7] p-5 space-y-4">
      <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#141414]">
        <span>FLIP-TTS // ZH-CN</span>
        <span className="px-2 py-0.5 bg-[#111111] text-[#EFE078] rounded-[4px] text-[10px]">
          BẮC KINH
        </span>
      </div>

      <div className="bg-[#111111] text-[#F8F6F1] border-2 border-[#141414] rounded-xl p-5 text-center space-y-1.5 shadow-inner">
        <p className="font-mono text-[10px] tracking-widest text-[#F4C2D7] uppercase">
          AUDIO PLAYER • LIVE
        </p>
        <div className="font-serifcn text-4xl font-bold tracking-wider py-1">
          {word.hanzi}
        </div>
        <div className="font-mono text-sm text-[#EFE078]">{word.pinyin}</div>
      </div>

      <div className="space-y-2.5">
        <Button
          variant="yellow"
          fullWidth
          className="py-2.5 gap-2"
          leftIcon={<Volume2 className="w-4 h-4" />}
          onClick={() => onSpeak(word.hanzi, 1.0)}
        >
          Đọc chuẩn (1.0x)
        </Button>
        <Button
          variant="default"
          fullWidth
          className="py-2.5 gap-2 hover:bg-[#F8F6F1]"
          leftIcon={<Turtle className="w-4 h-4" />}
          onClick={() => onSpeak(word.hanzi, 0.65)}
        >
          Đọc chậm luyện nghe (0.65x)
        </Button>
        <Button
          variant="primary"
          fullWidth
          className="py-2.5 gap-2"
          leftIcon={<MessageSquareQuote className="w-4 h-4" />}
          onClick={() => onSpeak(word.exampleZh || word.hanzi, 0.9)}
        >
          Đọc câu ví dụ
        </Button>
      </div>

      <label className="flex items-center justify-between p-3 bg-white/85 border border-[#141414] rounded-lg cursor-pointer select-none">
        <span className="font-mono text-xs font-bold text-[#141414]">
          Tự động đọc khi qua thẻ
        </span>
        <input
          type="checkbox"
          checked={autoRead}
          onChange={(e) => setAutoRead(e.target.checked)}
          className="w-4 h-4 accent-[#111111]"
        />
      </label>
    </aside>
  );
};
