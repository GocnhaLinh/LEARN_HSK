import { PenTool, Pointer, Volume2 } from "lucide-react";
import React from "react";
import { Card } from "@/components/ui";
import { VOCAB_STATUS_LABELS } from "@/data/defaults";
import { useFlashcardStore } from "@/features/flashcard/stores/flashcard.store";
import type { VocabWord } from "@/types";

interface FlashcardDigicamCardProps {
  word: VocabWord;
  cardIndex: number;
  onFlip: () => void;
  onSpeakExample: (text: string) => void;
  onPracticeWrite: (char: string) => void;
  children?: React.ReactNode;
}

export const FlashcardDigicamCard: React.FC<FlashcardDigicamCardProps> = ({
  word,
  cardIndex,
  onFlip,
  onSpeakExample,
  onPracticeWrite,
  children,
}) => {
  const flipped = useFlashcardStore((s) => s.flipped);
  const cardAnim = useFlashcardStore((s) => s.cardAnim);
  const setCardAnim = useFlashcardStore((s) => s.setCardAnim);

  const handleAnimEnd = () => {
    if (!cardAnim.includes("out")) setCardAnim("");
  };

  return (
    <Card
      padding="none"
      className="lg:col-span-8 bg-[#E6E3DC] p-4 sm:p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-[#141414]" />
          <span className="font-bold tracking-wider text-[#141414]">
            Y2K DIGICAM // HANZI LENS 3.0x
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-white text-[#141414] border border-[#141414] rounded-[3px] font-bold">
            FLASH: AUTO
          </span>
          <button
            type="button"
            onClick={onFlip}
            className="px-2.5 py-0.5 bg-[#111111] text-white border border-[#111111] rounded-[3px] font-bold hover:bg-neutral-800"
          >
            LẬT THẺ [SPACE]
          </button>
        </div>
      </div>

      {/* Digicam LCD Screen (2-stage 3D flip + crisp non-blurry resting text) */}
      <div onClick={onFlip} className="cursor-pointer overflow-hidden">
        {!flipped ? (
          <div
            key={`front-${word.id}-${cardIndex}`}
            onAnimationEnd={handleAnimEnd}
            className={`${cardAnim} min-h-[340px] sm:min-h-[360px] bg-[#F9F7F2] border-2 border-[#141414] rounded-xl p-5 sm:p-7 flex flex-col justify-between shadow-inner`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-[#111111] text-white font-mono text-xs font-bold rounded-[4px]">
                HSK {word.level}
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-[#F4C2D7] text-[#111111] border border-[#141414] font-mono text-[11px] font-bold rounded-[4px]">
                  {VOCAB_STATUS_LABELS[word.status] || "Mới"}
                </span>
                <span className="px-2.5 py-1 bg-[#EFE078] text-[#111111] border border-[#141414] font-mono text-xs font-bold rounded-[4px]">
                  {word.pos || "Từ vựng"}
                </span>
              </div>
            </div>

            <div className="my-auto text-center py-6">
              <div className="font-serifcn text-6xl sm:text-8xl font-bold text-[#141414] tracking-wider select-none">
                {word.hanzi}
              </div>
            </div>

            <div className="pt-3 border-t border-dashed border-[#141414]/30 flex items-center justify-between font-mono text-[11px] text-[#57534E]">
              <span className="flex items-center gap-1.5">
                <Pointer className="w-3.5 h-3.5 shrink-0" />
                Bấm vào màn hình hoặc nhấn Space để lật xem nghĩa
              </span>
              <span className="font-serifcn text-sm text-[#141414] shrink-0">
                〔 汉 〕
              </span>
            </div>
          </div>
        ) : (
          <div
            key={`back-${word.id}-${cardIndex}`}
            onAnimationEnd={handleAnimEnd}
            className={`${cardAnim} min-h-[340px] sm:min-h-[360px] bg-[#FFFDF9] border-2 border-[#141414] rounded-xl p-5 sm:p-7 flex flex-col justify-between`}
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-dashed border-[#141414]/30">
                <div className="min-w-0">
                  <div className="flex items-baseline flex-wrap gap-2.5">
                    <span className="font-serifcn text-3xl sm:text-4xl font-bold text-[#141414]">
                      {word.hanzi}
                    </span>
                    <span className="font-mono text-base sm:text-lg font-semibold text-[#A62626]">
                      {word.pinyin}
                    </span>
                  </div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#EFE078] text-[#111111] border border-[#141414] font-mono text-[11px] font-bold rounded-[4px]">
                    HÁN VIỆT: {word.hanviet || "—"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const firstChar = Array.from(word.hanzi)[0];
                    if (firstChar) onPracticeWrite(firstChar);
                  }}
                  className="t-btn px-3 py-1.5 bg-white text-[#111111] font-mono text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 hover:bg-[#F4C2D7]"
                >
                  <PenTool className="w-3.5 h-3.5 shrink-0" />
                  <span>Tập viết</span>
                </button>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase text-[#57534E]">
                  Nghĩa tiếng Việt
                </p>
                <p className="text-lg sm:text-xl font-bold text-[#141414] mt-0.5">
                  {word.meaning}
                </p>
                {word.english && (
                  <p className="font-mono text-xs text-[#57534E] mt-0.5">
                    EN: {word.english}
                  </p>
                )}
              </div>

              <div className="p-2.5 bg-[#F8F6F1] border-l-4 border-[#141414] text-xs text-[#292524]">
                <span className="font-mono font-bold uppercase text-[10px] block mb-0.5">
                  Chiết tự &amp; Mẹo nhớ
                </span>
                <span>
                  {word.note ||
                    "Ghi nhớ qua ví dụ thực tế và luyện phát âm nhiều lần."}
                </span>
              </div>

              <div className="p-3 bg-white border border-[#141414] rounded-lg">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold uppercase text-[#57534E]">
                    Ví dụ ngữ cảnh
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSpeakExample(word.exampleZh || word.hanzi);
                    }}
                    className="px-2 py-0.5 bg-[#111111] text-white font-mono text-[10px] rounded inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Volume2 className="w-3 h-3" /> Nghe câu
                  </button>
                </div>
                <p className="font-serifcn text-base sm:text-lg text-[#141414]">
                  {word.exampleZh || word.hanzi}
                </p>
                <p className="text-xs sm:text-sm text-[#57534E] mt-0.5">
                  {word.exampleVi || word.meaning}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {children}
    </Card>
  );
};
