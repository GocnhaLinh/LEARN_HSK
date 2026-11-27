import { Headphones, LayoutGrid, Zap } from "lucide-react";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Select } from "@/components/ui";
import { ListenArena } from "@/features/game/components/ListenArena";
import { MatchArena } from "@/features/game/components/MatchArena";
import { QuizArena } from "@/features/game/components/QuizArena";
import { useMiniGame } from "@/features/game/hooks/useMiniGame";
import {
  GAME_LEVEL_OPTIONS,
  useGameStore,
} from "@/features/game/stores/game.store";
import type { GameLevelFilter, GameMode } from "@/features/game/types";

const GAME_MODES: ReadonlyArray<
  [GameMode, string, React.FC<{ className?: string }>]
> = [
  ["quiz", "1. Trắc nghiệm nhanh (+15 XP)", Zap],
  ["listen", "2. Nghe & Chọn chữ (+15 XP)", Headphones],
  ["match", "3. Ghép cặp 5 thẻ (+25 XP)", LayoutGrid],
];

export const GamePage: React.FC = () => {
  const { mode } = useParams();
  const navigate = useNavigate();
  const gameMode: GameMode =
    mode === "listen" || mode === "match" ? mode : "quiz";

  const levelFilter = useGameStore((s) => s.levelFilter);
  const setLevelFilter = useGameStore((s) => s.setLevelFilter);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const {
    hasEnoughVocab,
    startRound,
    handleAnswerQuiz,
    handleSelectMatch,
    handleSpeakTarget,
  } = useMiniGame(gameMode);

  return (
    <section className="space-y-6">
      <Card
        variant="flat"
        padding="none"
        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
      >
        <div>
          <p className="font-mono text-[11px] uppercase opacity-65">
            [05] ARENA // LUYỆN PHẢN XẠ +XP
          </p>
          <h2 className="font-serif font-bold text-2xl">
            Đấu trường Mini-Game
          </h2>
        </div>

        <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs min-w-0">
          <Select
            selectSize="sm"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as GameLevelFilter)}
            className="flex-1 min-w-0 sm:flex-none bg-white px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs truncate"
          >
            {GAME_LEVEL_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Badge
            variant="yellow"
            className="px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs whitespace-nowrap shrink-0"
          >
            ĐIỂM: <span>{score}</span>
          </Badge>
          <Badge
            variant="pink"
            className="px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs whitespace-nowrap shrink-0"
          >
            COMBO: <span>{combo}</span>x
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GAME_MODES.map(([m, label, Icon]) => (
          <Button
            key={m}
            variant={gameMode === m ? "primary" : "default"}
            className="py-3 px-4 gap-2"
            leftIcon={<Icon className="w-4 h-4" />}
            onClick={() => navigate(`/game/${m}`)}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card padding="none" className="p-6 sm:p-8">
        {!hasEnoughVocab ? (
          <EmptyState
            className="max-w-lg mx-auto px-0 sm:px-0 py-6 sm:py-6"
            title="Chưa đủ từ vựng để bắt đầu Mini-Game"
            description={
              <>
                Cần ít nhất 4 từ vựng trong kho từ. Hãy vào{" "}
                <strong>Khóa học HSK</strong> để tải file{" "}
                <code>.PDF / .DOCX</code> hoặc thêm từ thủ công trong{" "}
                <strong>Kho từ</strong> nhé!
              </>
            }
            actions={
              <>
                <Button
                  variant="primary"
                  onClick={() => navigate("/courses/5")}
                >
                  Tải file PDF vào Khóa học →
                </Button>
                <Button variant="yellow" onClick={() => navigate("/vocab")}>
                  Thêm từ thủ công
                </Button>
              </>
            }
          />
        ) : gameMode === "quiz" ? (
          <QuizArena onAnswer={handleAnswerQuiz} />
        ) : gameMode === "listen" ? (
          <ListenArena
            onAnswer={handleAnswerQuiz}
            onSpeak={handleSpeakTarget}
          />
        ) : (
          <MatchArena onSelectSide={handleSelectMatch} onShuffle={startRound} />
        )}
      </Card>
    </section>
  );
};
