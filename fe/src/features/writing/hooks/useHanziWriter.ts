import HanziWriter, { CharacterJson } from 'hanzi-writer';
import { useCallback, useEffect, useRef, useState } from 'react';

const charDataCache = new Map<string, CharacterJson>();

const cachedCharDataLoader = (
  char: string,
  onLoad: (data: CharacterJson) => void,
  onError: (err?: unknown) => void,
) => {
  const cached = charDataCache.get(char);
  if (cached) {
    onLoad(cached);
    return;
  }
  HanziWriter.loadCharacterData(char)
    .then((data) => {
      if (data) {
        charDataCache.set(char, data);
        onLoad(data);
      } else {
        onError(new Error('No character data'));
      }
    })
    .catch((err) => onError(err));
};

export function useHanziWriter(
  activeChar: string,
  enabled: boolean,
  onQuizComplete: (char: string) => void,
) {
  const [statusText, setStatusText] = useState(
    'Nhấn "Xem nét mẫu" hoặc "Quiz (+10 XP)" để bắt đầu.',
  );
  const [showOutline, setShowOutline] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const writerBoxRef = useRef<HTMLDivElement | null>(null);
  const writerInstanceRef = useRef<HanziWriter | null>(null);
  const activeCharRef = useRef<string>(activeChar);
  activeCharRef.current = activeChar;

  const onQuizCompleteRef = useRef(onQuizComplete);
  onQuizCompleteRef.current = onQuizComplete;

  // Destroy cleanly only when switching away from HanziWriter mode or unmounting
  useEffect(() => {
    if (!enabled) {
      writerInstanceRef.current = null;
      return;
    }
    const target = writerBoxRef.current;
    return () => {
      if (target) target.innerHTML = '';
      writerInstanceRef.current = null;
    };
  }, [enabled]);

  // Reuse single HanziWriter instance via setCharacter() for instant flicker-free char switching
  useEffect(() => {
    if (!enabled) return;
    const target = writerBoxRef.current;
    if (!target) return;

    setShowOutline(true);
    setLoadError(null);
    if (!charDataCache.has(activeChar)) {
      setStatusText(`Đang tải bút thuận chữ "${activeChar}"...`);
    }

    const existing = writerInstanceRef.current;
    if (existing) {
      existing.setCharacter(activeChar).catch(() => {});
      existing.showOutline({ duration: 0 }).catch(() => {});
      return;
    }

    target.innerHTML = '';
    try {
      const instance = HanziWriter.create(target, activeChar, {
        width: 280,
        height: 280,
        padding: 18,
        showOutline: true,
        strokeColor: '#141414',
        radicalColor: '#A62626',
        outlineColor: '#DDD8CE',
        drawingColor: '#141414',
        drawingWidth: 18,
        charDataLoader: cachedCharDataLoader,
        onLoadCharDataSuccess: () => {
          const ch = activeCharRef.current;
          setLoadError(null);
          setStatusText(
            `Sẵn sàng luyện viết chữ "${ch}". Nhấn "Xem nét mẫu" hoặc "Quiz (+10 XP)".`,
          );
        },
        onLoadCharDataError: () => {
          const ch = activeCharRef.current;
          setLoadError(`Không tìm thấy nét vẽ cho "${ch}".`);
          setStatusText(`Ký tự "${ch}" không có trong kho nét viết.`);
        },
      });
      writerInstanceRef.current = instance;
    } catch {
      setStatusText('Lỗi khởi tạo HanziWriter.');
    }
  }, [activeChar, enabled]);

  const handleAnimate = useCallback(() => {
    const inst = writerInstanceRef.current;
    if (!inst) return;
    setStatusText(`Đang chiếu thứ tự nét chữ "${activeCharRef.current}"...`);
    inst.animateCharacter({
      onComplete: () => {
        setStatusText('Đã xong nét mẫu! Nhấn "Quiz (+10 XP)" để tự đồ nét.');
      },
    });
  }, []);

  const handleQuiz = useCallback(() => {
    const inst = writerInstanceRef.current;
    if (!inst) return;
    const ch = activeCharRef.current;
    setStatusText(`Chế độ Quiz chữ "${ch}": Hãy viết từng nét theo đúng bút thuận.`);
    inst.quiz({
      showHintAfterMisses: 2,
      onMistake: (d) => {
        setStatusText(`Nét ${d.strokeNum + 1} chưa đúng hướng, thử lại nhé!`);
      },
      onCorrectStroke: (d) => {
        if (d.strokesRemaining > 0) {
          setStatusText(`Chính xác! Còn ${d.strokesRemaining} nét nữa.`);
        }
      },
      onComplete: (summary) => {
        setStatusText(`Hoàn thành chữ "${ch}" (nhầm ${summary.totalMistakes} nét)!`);
        onQuizCompleteRef.current(ch);
      },
    });
  }, []);

  const handleToggleOutline = useCallback(() => {
    const inst = writerInstanceRef.current;
    if (!inst) return;
    setShowOutline((prev) => {
      const next = !prev;
      if (next) inst.showOutline();
      else inst.hideOutline();
      return next;
    });
  }, []);

  return {
    writerBoxRef,
    statusText,
    showOutline,
    loadError,
    handleAnimate,
    handleQuiz,
    handleToggleOutline,
  };
}
