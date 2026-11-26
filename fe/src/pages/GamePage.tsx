import { Headphones, LayoutGrid, Trophy, Volume2, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { VocabWord } from '../types';
import { speakChinese } from '../utils/helpers';

type GameMode = 'quiz' | 'listen' | 'match';

export const GamePage: React.FC = () => {
  const { mode: modeParam } = useParams();
  const navigate = useNavigate();
  const { vocab, scoreSummaries, scoreHistory, recordGameWin, showToast } = useApp();

  const gameMode: GameMode =
    modeParam === 'listen' || modeParam === 'match' ? modeParam : 'quiz';

  const [levelFilter, setLevelFilter] = useState<string>('5');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  // Quiz & Listen round state
  const [choices, setChoices] = useState<VocabWord[]>([]);
  const [target, setTarget] = useState<VocabWord | null>(null);
  const [locked, setLocked] = useState(false);
  const [pickedResult, setPickedResult] = useState<{ id: string; correct: boolean } | null>(null);

  // Match game state
  const [matchPairs, setMatchPairs] = useState<VocabWord[]>([]);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [selRight, setSelRight] = useState<string | null>(null);

  const pickRandomWords = useCallback(
    (count: number) => {
      let base = vocab;
      if (levelFilter === 'primary') {
        base = vocab.filter((w) => w.level <= 3);
      } else if (levelFilter !== 'all') {
        base = vocab.filter((w) => String(w.level) === levelFilter);
      }
      if (base.length < count) base = vocab;
      const pool = [...base];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, Math.min(count, pool.length));
    },
    [vocab, levelFilter],
  );

  const startNewRound = useCallback(() => {
    setLocked(false);
    setPickedResult(null);
    if (gameMode === 'match') {
      const pairs = pickRandomWords(5);
      setMatchPairs(pairs);
      setSolvedIds([]);
      setSelLeft(null);
      setSelRight(null);
    } else {
      const picked = pickRandomWords(4);
      const chosen = picked[Math.floor(Math.random() * picked.length)] || null;
      setChoices(picked);
      setTarget(chosen);
      if (gameMode === 'listen' && chosen) {
        window.setTimeout(() => speakChinese(chosen.hanzi, 0.88), 250);
      }
    }
  }, [gameMode, pickRandomWords]);

  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  const answerQuiz = async (pickedId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (locked || !target) return;
    setLocked(true);
    const correct = pickedId === target.id;
    setPickedResult({ id: pickedId, correct });

    if (correct) {
      const nextCombo = combo + 1;
      const nextScore = score + 15;
      setScore(nextScore);
      setCombo(nextCombo);
      await recordGameWin(
        15,
        `Chính xác! Combo ${nextCombo}x`,
        { clientX: e.clientX, clientY: e.clientY },
        {
          level: target.level,
          mode: gameMode === 'listen' ? 'listen' : 'quiz',
          score: nextScore,
          combo: nextCombo,
        },
      );
    } else {
      setCombo(0);
      showToast(`Chưa đúng! Đáp án: ${target.hanzi} (${target.meaning})`, 'pink');
    }

    window.setTimeout(() => startNewRound(), 850);
  };

  const evaluateMatch = async (
    nextLeft: string | null,
    nextRight: string | null,
    ev: { clientX: number; clientY: number },
  ) => {
    if (!nextLeft || !nextRight) return;
    if (nextLeft === nextRight) {
      const nextSolved = [...solvedIds, nextLeft];
      setSolvedIds(nextSolved);
      setScore((s) => s + 10);
      setCombo((c) => c + 1);
      const matchedWord = matchPairs.find((w) => w.id === nextLeft);
      if (matchedWord) speakChinese(matchedWord.hanzi, 0.95);

      if (nextSolved.length === matchPairs.length) {
        const parsedLv = Number(levelFilter);
        await recordGameWin(25, 'Hoàn thành bảng ghép cặp thẻ!', ev, {
          level: Number.isFinite(parsedLv) ? parsedLv : matchedWord?.level ?? 5,
          mode: 'match',
          score: score + 10,
          combo: combo + 1,
        });
        window.setTimeout(() => startNewRound(), 900);
      }
    } else {
      setCombo(0);
      showToast('Cặp thẻ chưa khớp, thử lại nhé!', 'pink');
    }
    setSelLeft(null);
    setSelRight(null);
  };

  const rightList = useMemo(
    () => [...matchPairs].sort((a, b) => a.meaning.localeCompare(b.meaning)),
    [matchPairs],
  );

  return (
    <section className="space-y-6">
      <div className="t-card-flat p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase opacity-65">[05] ARENA // LUYỆN PHẢN XẠ +XP</p>
          <h2 className="font-serif font-bold text-2xl">Đấu trường Mini-Game</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white text-[#111111] border-[1.5px] border-[#141414] rounded font-mono text-xs font-bold outline-none"
          >
            <option value="all">Tất cả HSK (1–6)</option>
            <option value="5">Chỉ HSK 5 (Đang học)</option>
            <option value="4">Chỉ HSK 4</option>
            <option value="6">Chỉ HSK 6</option>
            <option value="primary">Sơ cấp (HSK 1–3)</option>
          </select>
          <span className="px-3 py-1.5 bg-[#EFE078] text-[#111111] t-badge font-bold">
            ĐIỂM: <span>{score}</span>
          </span>
          <span className="px-3 py-1.5 bg-[#F4C2D7] text-[#111111] t-badge font-bold">
            COMBO: <span>{combo}</span>x
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs font-bold">
        <button
          type="button"
          onClick={() => navigate('/game/quiz')}
          className={`t-btn py-3 px-4 flex items-center justify-center gap-2 ${
            gameMode === 'quiz'
              ? 'bg-[#111111] text-white'
              : 'bg-white text-[#111111] hover:bg-[#EFE078]'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>1. Trắc nghiệm nhanh (+15 XP)</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/game/listen')}
          className={`t-btn py-3 px-4 flex items-center justify-center gap-2 ${
            gameMode === 'listen'
              ? 'bg-[#111111] text-white'
              : 'bg-white text-[#111111] hover:bg-[#EFE078]'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>2. Nghe &amp; Chọn chữ (+15 XP)</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/game/match')}
          className={`t-btn py-3 px-4 flex items-center justify-center gap-2 ${
            gameMode === 'match'
              ? 'bg-[#111111] text-white'
              : 'bg-white text-[#111111] hover:bg-[#EFE078]'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>3. Ghép cặp 5 thẻ (+25 XP)</span>
        </button>
      </div>

      <div className="t-card p-6 sm:p-8">
        {vocab.length < 4 ? (
          <div className="max-w-lg mx-auto text-center space-y-3 py-6">
            <h3 className="font-serif font-bold text-xl">Chưa đủ từ vựng để bắt đầu Mini-Game</h3>
            <p className="text-sm opacity-75">
              Cần ít nhất 4 từ vựng trong kho từ. Hãy vào <strong>Khóa học HSK</strong> để tải file{' '}
              <code>.PDF / .DOCX</code> hoặc thêm từ thủ công trong <strong>Kho từ</strong> nhé!
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/courses/5')}
                className="t-btn-black px-4 py-2 font-mono text-xs font-bold"
              >
                Tải file PDF vào Khóa học →
              </button>
              <button
                type="button"
                onClick={() => navigate('/vocab')}
                className="t-btn px-4 py-2 bg-[#EFE078] text-[#111111] font-mono text-xs font-bold"
              >
                Thêm từ thủ công
              </button>
            </div>
          </div>
        ) : null}

        {vocab.length >= 4 && gameMode === 'quiz' && target && (
          <div className="max-w-xl mx-auto text-center space-y-6">
            <span className="px-2.5 py-1 bg-[#EFE078] text-[#111111] font-mono text-xs font-bold t-badge">
              TRẮC NGHIỆM NHANH
            </span>
            <div className="py-4">
              <div className="font-serifcn text-6xl sm:text-7xl font-bold">{target.hanzi}</div>
              <p className="font-mono text-xs opacity-65 mt-2">
                Chọn đúng nghĩa tiếng Việt &amp; Pinyin tương ứng
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {choices.map((c) => {
                const isPicked = pickedResult?.id === c.id;
                const bgClass = isPicked
                  ? pickedResult.correct
                    ? 'bg-[#CBEAD8]'
                    : 'bg-[#F4C2D7]'
                  : 'bg-white hover:bg-[#F8F6F1]';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => answerQuiz(c.id, e)}
                    className={`t-btn p-4 text-[#111111] text-left ${bgClass}`}
                  >
                    <div className="font-bold text-sm sm:text-base">{c.meaning}</div>
                    <div className="font-mono text-xs opacity-65 mt-0.5">{c.pinyin}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {vocab.length >= 4 && gameMode === 'listen' && target && (
          <div className="max-w-xl mx-auto text-center space-y-6">
            <span className="px-2.5 py-1 bg-[#F4C2D7] text-[#111111] font-mono text-xs font-bold t-badge">
              NGHE &amp; CHỌN CHỮ
            </span>
            <div className="py-3 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => speakChinese(target.hanzi, 0.88, (m) => showToast(m, 'pink'))}
                className="t-btn-black w-20 h-20 rounded-full flex items-center justify-center hover:scale-105 transition"
              >
                <Volume2 className="w-8 h-8" />
              </button>
              <p className="font-mono text-xs opacity-70">
                Bấm vào loa để nghe phát âm tiếng Trung (ZH-CN)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {choices.map((c) => {
                const isPicked = pickedResult?.id === c.id;
                const bgClass = isPicked
                  ? pickedResult.correct
                    ? 'bg-[#CBEAD8]'
                    : 'bg-[#F4C2D7]'
                  : 'bg-white hover:bg-[#EFE078]';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => answerQuiz(c.id, e)}
                    className={`t-btn p-5 text-[#111111] text-center ${bgClass}`}
                  >
                    <div className="font-serifcn text-3xl sm:text-4xl font-bold">{c.hanzi}</div>
                    <div className="text-xs opacity-65 mt-1">{c.meaning}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {vocab.length >= 4 && gameMode === 'match' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-[#DCD2F5] text-[#111111] font-mono text-xs font-bold t-badge">
                GHÉP CẶP 5 THẺ (+25 XP)
              </span>
              <button
                type="button"
                onClick={startNewRound}
                className="t-btn px-3 py-1 bg-white text-[#111111] font-mono text-xs font-bold"
              >
                Đổi bộ thẻ
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                {matchPairs.map((w) => {
                  const solved = solvedIds.includes(w.id);
                  const sel = selLeft === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      disabled={solved}
                      onClick={(e) => {
                        setSelLeft(w.id);
                        evaluateMatch(w.id, selRight, { clientX: e.clientX, clientY: e.clientY });
                      }}
                      className={`t-btn w-full py-3.5 px-3 font-serifcn text-2xl font-bold ${
                        solved
                          ? 'bg-[#CBEAD8] opacity-50 line-through'
                          : sel
                            ? 'bg-[#111111] text-white'
                            : 'bg-white text-[#111111] hover:bg-[#EFE078]'
                      }`}
                    >
                      {w.hanzi}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2.5">
                {rightList.map((w) => {
                  const solved = solvedIds.includes(w.id);
                  const sel = selRight === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      disabled={solved}
                      onClick={(e) => {
                        setSelRight(w.id);
                        evaluateMatch(selLeft, w.id, { clientX: e.clientX, clientY: e.clientY });
                      }}
                      className={`t-btn w-full py-3.5 px-3 text-sm font-semibold ${
                        solved
                          ? 'bg-[#CBEAD8] opacity-50 line-through'
                          : sel
                            ? 'bg-[#111111] text-white'
                            : 'bg-white text-[#111111] hover:bg-[#F4C2D7]'
                      }`}
                    >
                      {w.meaning}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BẢNG ĐIỂM THI ĐUA HSK 1–6 (SYNC MONGODB) */}
      {scoreSummaries.length > 0 && (
        <div className="t-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              <h3 className="font-serif font-bold text-xl">Bảng điểm thi đua theo cấp HSK</h3>
            </div>
            <span className="px-2.5 py-0.5 bg-[#EFE078] text-[#111111] font-mono text-[10px] font-bold t-badge">
              MONGODB LEADERBOARD
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {scoreSummaries.map((s) => (
              <div
                key={s.level}
                className="p-3 rounded-xl bg-[#F8F6F1] border-[1.5px] border-[#141414] space-y-1 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{s.code}</span>
                  <span>{s.emoji}</span>
                </div>
                <div className="font-serif text-xl font-extrabold">{s.totalScore} đ</div>
                <div className="text-[10px] opacity-75">
                  Max: {s.highScore} • {s.bestCombo}x
                </div>
                <div className="text-[10px] opacity-65">
                  BT: {s.completedExercises}/{s.totalExercises}
                </div>
              </div>
            ))}
          </div>

          {scoreHistory.length > 0 && (
            <div className="pt-3 border-t border-dashed border-current/20 space-y-1.5">
              <p className="font-mono text-[11px] font-bold uppercase opacity-65">
                Lịch sử thi đua gần nhất
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {scoreHistory.slice(0, 6).map((h) => (
                  <div
                    key={h.id}
                    className="px-3 py-2 rounded-lg bg-white border border-[#141414]/30 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate">{h.detail || `HSK ${h.level}`}</div>
                      <div className="font-mono text-[10px] opacity-60">
                        HSK {h.level} • {h.mode.toUpperCase()} • Combo {h.combo}x
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-[#CBEAD8] text-[#111111] font-mono text-[11px] font-bold t-badge shrink-0">
                      +{h.xpEarned} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
