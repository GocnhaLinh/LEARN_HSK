import type {
  ClassifiedExamFiles,
  CroppedQuestionImage,
  ExamPart,
  ExamQuestionGroup,
  ExamQuestionItem,
  ExamSection,
  ParsedExamBundleResult,
  ParsedExamWarning,
  ParsedTranscriptData,
  PdfExtractedPage,
  PdfRawTextItem,
} from '@/features/exams/types';

const CJK_CHAR = '[\u4e00-\u9fff]';
const CJK_OR_PUNCT = '[\u4e00-\u9fff，。！？、；：“”‘’（）《》【】—…]';

/**
 * Normalizes OCR quirks common in scanned official Hanban HSK PDFs:
 *  - Cyrillic homoglyphs (В -> B, А -> A, С -> C, Е -> E)
 *  - Spaced digits around dots/dashes ("1 0 ." -> "10.", "4 9 - 5 2 ." -> "49-52.")
 *  - Random spaces between Chinese characters ("在 高速 行驶" -> "在高速行驶")
 */
export function normalizeOcrText(raw: string): string {
  if (!raw) return '';
  let text = raw
    .replace(/\u0412/g, 'B') // Cyrillic В -> Latin B
    .replace(/\u0410/g, 'A') // Cyrillic А -> Latin A
    .replace(/\u0421/g, 'C') // Cyrillic С -> Latin C
    .replace(/\u0415/g, 'E') // Cyrillic Е -> Latin E
    .replace(/\u3000/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '');

  // Collapse spaces between Chinese characters & CJK punctuation (repeat to handle 1-char runs)
  const cjkSpaceRx = new RegExp(`(${CJK_OR_PUNCT})\\s+(?=${CJK_OR_PUNCT})`, 'g');
  for (let i = 0; i < 3; i++) {
    text = text.replace(cjkSpaceRx, '$1');
  }

  // Collapse spaced multi-digit numbers ("1 0 ." -> "10.", "1 5 届" -> "15届", "8 0 字" -> "80字")
  text = text
    .replace(/(\d)\s+(\d)(?=\s*[\d.\-–—、：:）)题到个万亿年元月日号%届字岁米天次遍本名])/g, '$1$2')
    .replace(/(\d)\s+(\d)(?=\s*[\d.\-–—、：:）)题到个万亿年元月日号%届字岁米天次遍本名])/g, '$1$2')
    .replace(/(\d)\s+\./g, '$1.')
    .replace(/(\d)\s*[-–—]\s*(\d)/g, '$1-$2')
    .replace(/第\s+(\d)/g, '第$1')
    .replace(/(\d)\s+题/g, '$1题')
    .replace(/(\d)\s+到\s+(\d)/g, '$1到$2')
    .replace(/第\s*([一二三四五])\s*部\s*分/g, '第$1部分')
    .replace(/([一二三])\s*、\s*(听\s*力|阅\s*读|书\s*写)/g, (_, num, sec) => `${num}、${sec.replace(/\s+/g, '')}`);

  return text.replace(/[ \t]{2,}/g, ' ').trim();
}

function isFooterLine(y: number, text: string): boolean {
  const clean = text.replace(/\s+/g, '');
  if (y < 78 && /^-?\d{1,3}-?$/.test(clean)) return true;
  if (/^-\d{1,3}-$/.test(clean)) return true;
  return false;
}

interface VisualLine {
  y: number;
  items: PdfRawTextItem[];
  text: string;
  /** Text with wide X-gaps (>12px) preserved as "\t" for column/option/word-tile separation */
  tabbedText: string;
}

function groupItemsIntoLines(items: PdfRawTextItem[], yTolerance = 6): VisualLine[] {
  const clean = items.filter((it) => it.str && it.str.trim());
  const sorted = [...clean].sort((a, b) => {
    if (Math.abs(b.y - a.y) > yTolerance) return b.y - a.y;
    return a.x - b.x;
  });

  const rows: Array<{ y: number; items: PdfRawTextItem[] }> = [];
  for (const it of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - it.y) <= yTolerance) {
      last.items.push(it);
    } else {
      rows.push({ y: it.y, items: [it] });
    }
  }

  const lines: VisualLine[] = [];
  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x);
    let plain = '';
    let tabbed = '';
    for (let i = 0; i < row.items.length; i++) {
      const cur = row.items[i];
      if (i > 0) {
        const prev = row.items[i - 1];
        const gap = cur.x - (prev.x + (prev.w || 0));
        plain += ' ';
        tabbed += gap > 10 ? '\t' : ' ';
      }
      plain += cur.str.trim();
      tabbed += cur.str.trim();
    }
    const text = normalizeOcrText(plain);
    if (!text || isFooterLine(row.y, text)) continue;
    const normTabbed = tabbed
      .split('\t')
      .map((seg) => normalizeOcrText(seg))
      .filter(Boolean)
      .join('\t');
    lines.push({ y: row.y, items: row.items, text, tabbedText: normTabbed });
  }
  return lines;
}

/**
 * Splits a 2-column Listening page into Left column top-to-bottom followed by Right column top-to-bottom.
 * Full-width header lines (like "一、听力" or "第 1-20 题...") are kept at the top in order.
 */
function extractListeningPageLines(page: PdfExtractedPage): VisualLine[] {
  const midX = page.width * 0.47;
  const allLines = groupItemsIntoLines(page.items, 6);

  const headerLines: VisualLine[] = [];
  const leftItems: PdfRawTextItem[] = [];
  const rightItems: PdfRawTextItem[] = [];

  for (const line of allLines) {
    const isHeader = /^(?:一、听力|第一部分|第二部分|第\s*\d+[-–—]\d+\s*题)/.test(line.text);
    if (isHeader) {
      headerLines.push(line);
      continue;
    }
    for (const it of line.items) {
      if (it.x < midX) leftItems.push(it);
      else rightItems.push(it);
    }
  }

  return [
    ...headerLines,
    ...groupItemsIntoLines(leftItems, 6),
    ...groupItemsIntoLines(rightItems, 6),
  ];
}

function parseInlineOptions(line: string): Array<{ letter: string; text: string }> {
  const norm = normalizeOcrText(line);
  // Match option tokens like "A 浪费 B 伤心 C 可惜 D 痛苦" or "A. xxx B. xxx"
  const rx = /(?:^|\s|\t)([A-D])(?:\s*[.)、:：]?\s+|\s+)(.+?)(?=(?:\s|\t)+[A-D](?:\s*[.)、:：]?\s+|\s+)|$)/g;
  const found: Array<{ letter: string; text: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(norm)) !== null) {
    found.push({ letter: m[1].toUpperCase(), text: m[2].trim() });
  }
  return found;
}

function buildOptionsArray(optMap: Map<string, string>): string[] {
  const letters = ['A', 'B', 'C', 'D'];
  return letters.map((l) => (optMap.get(l) || '').trim()).filter(Boolean);
}

/**
 * Parses H50000 答案.pdf (or any standard HSK answer sheet):
 *  - Q1-90: "1. D  2. C ... 26 A ... 90. B"
 *  - Q91-98: "91. 他忍不住大笑起来。"
 */
export function parseAnswerKeyText(rawText: string): Map<number, string> {
  const answers = new Map<number, string>();
  const text = normalizeOcrText(rawText);

  // Split around writing section ("三、书写" or Q91+)
  const writingIdx = text.search(/三、书写|91\s*[.、]/);
  const mcqPart = writingIdx >= 0 ? text.slice(0, writingIdx) : text;
  const writingPart = writingIdx >= 0 ? text.slice(writingIdx) : '';

  // Match "1. D", "21. A", "26 A" (missing dot)
  const mcqRx = /(?:^|\s)(\d{1,2})\s*[.、:：]?\s*([A-D])(?=\s|$|\d)/g;
  let m: RegExpExecArray | null;
  while ((m = mcqRx.exec(mcqPart)) !== null) {
    const qNum = Number(m[1]);
    if (qNum >= 1 && qNum <= 95 && !answers.has(qNum)) {
      answers.set(qNum, m[2].toUpperCase());
    }
  }

  // Match writing sentences: "91. 他忍不住大笑起来。"
  if (writingPart) {
    const lines = writingPart
      .split(/\n/)
      .map((l) => normalizeOcrText(l))
      .filter(Boolean);
    for (const line of lines) {
      const wm = line.match(/^(\d{2,3})\s*[.、:：]\s*(.+)$/);
      if (wm) {
        const qNum = Number(wm[1]);
        const ans = wm[2]
          .replace(/\s*第[一二三四]部分.*$/, '')
          .replace(/\s*[（(]略[）)].*$/, '')
          .trim();
        if (qNum >= 80 && qNum <= 105 && ans && !/^[（(]略[）)]$/.test(ans)) {
          answers.set(qNum, ans);
        }
      }
    }
    // Fallback if all writing answers were flattened onto one line
    const inlineWrRx = /(\d{2})\s*[.、]\s*([\u4e00-\u9fff][^\d\n]{2,80}?[。！？?!])/g;
    while ((m = inlineWrRx.exec(writingPart)) !== null) {
      const qNum = Number(m[1]);
      if (qNum >= 85 && qNum <= 100 && !answers.has(qNum)) {
        answers.set(qNum, m[2].trim());
      }
    }
  }

  return answers;
}

/**
 * Parses H50000 听力材料.pdf (sorted by page + Y coordinate):
 *  - Individual dialogues: "1. 女：... 男：... 问：..." (also handles missing dot like "8 男：...")
 *  - Grouped passages: "第31到32题是根据下面一段对话： ... 31. ... 32. ..."
 */
export function parseListeningScriptPages(pages: PdfExtractedPage[]): ParsedTranscriptData {
  const byQuestion = new Map<number, { transcript: string; spokenQuestion?: string }>();
  const groups: ParsedTranscriptData['groups'] = [];

  const allLines: string[] = [];
  for (const page of pages) {
    for (const line of groupItemsIntoLines(page.items, 6)) {
      allLines.push(line.text);
    }
  }

  let curSingleNum: number | null = null;
  let curSingleLines: string[] = [];
  let curGroup: {
    start: number;
    end: number;
    passageLines: string[];
    questions: Map<number, string>;
    inQuestions: boolean;
    lastSubQ: number | null;
  } | null = null;

  const flushSingle = () => {
    if (curSingleNum !== null && curSingleLines.length > 0) {
      const joined = curSingleLines.join('\n').trim();
      const askMatch = joined.match(/(?:^|\n)问\s*[：:]\s*([^\n]+)/);
      byQuestion.set(curSingleNum, {
        transcript: joined,
        spokenQuestion: askMatch ? askMatch[1].trim() : undefined,
      });
    }
    curSingleNum = null;
    curSingleLines = [];
  };

  const flushGroup = () => {
    if (curGroup && curGroup.passageLines.length > 0) {
      groups.push({
        start: curGroup.start,
        end: curGroup.end,
        transcript: curGroup.passageLines.join('\n').trim(),
        questions: curGroup.questions,
      });
    }
    curGroup = null;
  };

  for (const line of allLines) {
    if (
      /^(?:HSK|（音乐|\(音乐|大家好|听力考试|请大家注意|第一部分|第二部分|第\d+到\d+题[，,]请选出)/.test(
        line,
      )
    ) {
      continue;
    }

    // Group header: "第31到32题是根据下面一段对话：" or "第35到36题是根据下面一段话："
    const groupHdr = line.match(/^第\s*(\d{1,2})\s*[到至\-–—]\s*(\d{1,2})\s*题.*是根据下面/);
    if (groupHdr) {
      flushSingle();
      flushGroup();
      curGroup = {
        start: Number(groupHdr[1]),
        end: Number(groupHdr[2]),
        passageLines: [],
        questions: new Map(),
        inQuestions: false,
        lastSubQ: null,
      };
      continue;
    }

    if (curGroup) {
      // Sub-question inside a group: "31. 儿子今天晚上想要做什么？"
      const subQ = line.match(/^(\d{1,2})\s*[.、]\s*(.+)$/);
      if (subQ) {
        const qn = Number(subQ[1]);
        if (qn >= curGroup.start && qn <= curGroup.end) {
          curGroup.inQuestions = true;
          curGroup.lastSubQ = qn;
          curGroup.questions.set(qn, subQ[2].trim());
          continue;
        }
      }
      if (curGroup.inQuestions && curGroup.lastSubQ !== null) {
        const prev = curGroup.questions.get(curGroup.lastSubQ) || '';
        curGroup.questions.set(curGroup.lastSubQ, `${prev}${line}`);
      } else {
        // Dialogue speaker lines start on new line, wrapped prose continues previous line
        if (/^(?:男|女|问)\s*[：:]/.test(line) || curGroup.passageLines.length === 0) {
          curGroup.passageLines.push(line);
        } else {
          curGroup.passageLines[curGroup.passageLines.length - 1] += line;
        }
      }
      continue;
    }

    // Single dialogue start: "1. 女：..." or "8 男：..." (handles OCR missing dot)
    const singleStart = line.match(/^(\d{1,2})\s*(?:[.、]\s*|\s+(?=(?:男|女)\s*[：:]))(.+)$/);
    if (singleStart) {
      const qn = Number(singleStart[1]);
      if (qn >= 1 && qn <= 45) {
        flushSingle();
        curSingleNum = qn;
        curSingleLines = [singleStart[2].trim()];
        continue;
      }
    }

    if (curSingleNum !== null) {
      if (/^(?:男|女|问)\s*[：:]/.test(line)) {
        curSingleLines.push(line);
      } else if (curSingleLines.length > 0) {
        curSingleLines[curSingleLines.length - 1] += line;
      }
    }
  }

  flushSingle();
  flushGroup();

  return { byQuestion, groups };
}

function detectExamMeta(
  firstPagesText: string,
  fallbackFilename?: string,
  fallbackLevel = 5,
): { code: string; level: number; title: string } {
  const clean = normalizeOcrText(firstPagesText);
  const codeMatch =
    /(H[1-6]\d{4,5})/i.exec(fallbackFilename || '') || /(H[1-6]\d{4,5})/i.exec(clean);
  const code = codeMatch ? codeMatch[1].toUpperCase() : `HSK${fallbackLevel}-${Date.now().toString().slice(-4)}`;

  const zhLevelMap: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
  };
  let level = fallbackLevel;
  const zhLv = /HSK\s*[（(]?\s*([一二三四五六])级/.exec(clean);
  if (zhLv && zhLevelMap[zhLv[1]]) {
    level = zhLevelMap[zhLv[1]];
  } else if (codeMatch) {
    level = Number(codeMatch[1][1]) || fallbackLevel;
  }

  const zhNames = ['', '一级', '二级', '三级', '四级', '五级', '六级'];
  const title = `HSK (${zhNames[level] || `Level ${level}`}) 样卷 ${code}`;
  return { code, level, title };
}

function parseListeningSection(
  pages: PdfExtractedPage[],
  answers: Map<number, string>,
  transcriptData: ParsedTranscriptData | null,
): ExamSection {
  const questionMap = new Map<number, ExamQuestionItem>();
  let curQNum: number | null = null;
  let curOpts = new Map<string, string>();
  let lastOptLetter: string | null = null;

  const flushQuestion = () => {
    if (curQNum !== null && curOpts.size > 0) {
      const tInfo = transcriptData?.byQuestion.get(curQNum);
      questionMap.set(curQNum, {
        number: curQNum,
        prompt: tInfo?.spokenQuestion || `Nghe audio và chọn đáp án đúng cho câu ${curQNum}`,
        options: buildOptionsArray(curOpts),
        correctAnswer: answers.get(curQNum) || '',
        ...(tInfo?.transcript ? { transcript: tInfo.transcript } : {}),
      });
    }
    curQNum = null;
    curOpts = new Map();
    lastOptLetter = null;
  };

  for (const page of pages) {
    const lines = extractListeningPageLines(page);
    for (const line of lines) {
      if (/^(?:一、听力|第一部分|第二部分|第\d+[-–—]\d+题)/.test(line.text)) continue;

      // Question start + Option A on same line: "1. A 9点太早了" or "21. A 他们在饭店"
      const qStart = line.text.match(/^(\d{1,2})\s*[.、]?\s+([A-D])(?:\s*[.)、]?\s+|\s+)(.+)$/);
      if (qStart) {
        const num = Number(qStart[1]);
        if (num >= 1 && num <= 45) {
          flushQuestion();
          curQNum = num;
          const inlineOpts = parseInlineOptions(line.text.replace(/^\d{1,2}\s*[.、]?\s+/, ''));
          if (inlineOpts.length > 0) {
            inlineOpts.forEach((o) => curOpts.set(o.letter, o.text));
            lastOptLetter = inlineOpts[inlineOpts.length - 1].letter;
          } else {
            curOpts.set(qStart[2].toUpperCase(), qStart[3].trim());
            lastOptLetter = qStart[2].toUpperCase();
          }
          continue;
        }
      }

      // Option line: "B 他不会迟到" or "C 可能不参加 D 应该早点儿来"
      const optMatch = line.text.match(/^([A-D])(?:\s*[.)、]?\s+|\s+)(.+)$/);
      if (optMatch && curQNum !== null) {
        const inlineOpts = parseInlineOptions(line.text);
        if (inlineOpts.length > 0) {
          inlineOpts.forEach((o) => curOpts.set(o.letter, o.text));
          lastOptLetter = inlineOpts[inlineOpts.length - 1].letter;
        } else {
          curOpts.set(optMatch[1].toUpperCase(), optMatch[2].trim());
          lastOptLetter = optMatch[1].toUpperCase();
        }
        continue;
      }

      // Wrapped continuation of last option
      if (curQNum !== null && lastOptLetter) {
        curOpts.set(lastOptLetter, `${curOpts.get(lastOptLetter) || ''}${line.text}`);
      }
    }
  }
  flushQuestion();

  const sortedAll = Array.from(questionMap.values()).sort((a, b) => a.number - b.number);
  const part1Questions = sortedAll.filter((q) => q.number <= 20);
  const part2Questions = sortedAll.filter((q) => q.number >= 21);

  const part2Groups: ExamQuestionGroup[] = [];
  const groupedNums = new Set<number>();

  // First add single questions Q21-30 (or any not covered by transcript groups)
  const transcriptGroups = transcriptData?.groups || [];
  for (const tg of transcriptGroups) {
    for (let n = tg.start; n <= tg.end; n++) groupedNums.add(n);
  }

  const part2Singles = part2Questions.filter((q) => !groupedNums.has(q.number));
  if (part2Singles.length > 0) {
    part2Groups.push({
      groupId: 'listening_p2_singles',
      rangeLabel: `${part2Singles[0].number}-${part2Singles[part2Singles.length - 1].number}`,
      questions: part2Singles,
    });
  }

  for (const tg of transcriptGroups) {
    const qs = part2Questions
      .filter((q) => q.number >= tg.start && q.number <= tg.end)
      .map((q) => ({
        ...q,
        prompt: tg.questions.get(q.number) || q.prompt,
      }));
    if (qs.length > 0) {
      part2Groups.push({
        groupId: `listening_${tg.start}_${tg.end}`,
        rangeLabel: `${tg.start}-${tg.end}`,
        transcript: tg.transcript,
        questions: qs,
      });
    }
  }

  const parts: ExamPart[] = [];
  if (part1Questions.length > 0) {
    parts.push({
      partNumber: 1,
      title: `第一部分 (第 1-${part1Questions[part1Questions.length - 1].number} 题)`,
      instruction: '请选出正确答案。',
      questionFormat: 'listening_mcq',
      groups: [
        {
          groupId: 'listening_p1',
          rangeLabel: `1-${part1Questions[part1Questions.length - 1].number}`,
          questions: part1Questions,
        },
      ],
    });
  }
  if (part2Groups.length > 0) {
    parts.push({
      partNumber: 2,
      title: `第二部分 (第 21-${part2Questions[part2Questions.length - 1]?.number || 45} 题)`,
      instruction: '请选出正确答案。',
      questionFormat: 'listening_mcq',
      groups: part2Groups,
    });
  }

  return {
    key: 'listening',
    title: '一、听力',
    durationMin: 35, // 30 min listening + 5 min transfer
    parts,
  };
}

function parseReadingSection(
  pages: PdfExtractedPage[],
  answers: Map<number, string>,
): ExamSection {
  const allLines: VisualLine[] = [];
  for (const page of pages) {
    allLines.push(...groupItemsIntoLines(page.items, 6));
  }

  // Segment lines into Reading Part 1 (Cloze Q46-60), Part 2 (Short Q61-70), Part 3 (Long Q71-90)
  let currentPartNum = 1;
  const partLines: Record<number, VisualLine[]> = { 1: [], 2: [], 3: [] };

  for (const line of allLines) {
    if (/^二、阅读/.test(line.text)) continue;
    if (/^第一部分/.test(line.text) || /^第46[-–—]60题/.test(line.text)) {
      currentPartNum = 1;
      continue;
    }
    if (/^第二部分/.test(line.text) || /^第61[-–—]70题/.test(line.text)) {
      currentPartNum = 2;
      continue;
    }
    if (/^第三部分/.test(line.text) || /^第71[-–—]90题/.test(line.text)) {
      currentPartNum = 3;
      continue;
    }
    partLines[currentPartNum].push(line);
  }

  const parts: ExamPart[] = [];

  // ---- Part 1: Cloze (Q46-60) ----
  const clozeGroups: ExamQuestionGroup[] = [];
  {
    let curGroup: {
      start: number;
      end: number;
      passageLines: string[];
      questions: ExamQuestionItem[];
      inQuestions: boolean;
      curQ: { num: number; opts: Map<string, string> } | null;
    } | null = null;

    const flushCurClozeQ = () => {
      if (curGroup?.curQ && curGroup.curQ.opts.size > 0) {
        curGroup.questions.push({
          number: curGroup.curQ.num,
          prompt: `Chọn từ phù hợp điền vào chỗ trống [${curGroup.curQ.num}]`,
          options: buildOptionsArray(curGroup.curQ.opts),
          correctAnswer: answers.get(curGroup.curQ.num) || '',
        });
      }
      if (curGroup) curGroup.curQ = null;
    };

    const flushCurClozeGroup = () => {
      flushCurClozeQ();
      if (curGroup && curGroup.questions.length > 0) {
        // Highlight blank numbers inside passage cleanly as [46], [47]... (handles spaced OCR digits like "4 6")
        let passage = curGroup.passageLines.join('\n').trim();
        for (const q of curGroup.questions) {
          const digitsPattern = String(q.number).split('').join('\\s*');
          const rx = new RegExp(`(?<!\\d)${digitsPattern}(?!\\d)`, 'g');
          passage = passage.replace(rx, `[${q.number}]`);
        }
        clozeGroups.push({
          groupId: `cloze_${curGroup.start}_${curGroup.end}`,
          rangeLabel: `${curGroup.start}-${curGroup.end}`,
          passage,
          questions: curGroup.questions.sort((a, b) => a.number - b.number),
        });
      }
      curGroup = null;
    };

    for (const line of partLines[1]) {
      const grpHdr = line.text.match(/^(\d{2})\s*[-–—]\s*(\d{2})\s*[.、]?$/);
      if (grpHdr) {
        flushCurClozeGroup();
        curGroup = {
          start: Number(grpHdr[1]),
          end: Number(grpHdr[2]),
          passageLines: [],
          questions: [],
          inQuestions: false,
          curQ: null,
        };
        continue;
      }
      if (!curGroup) continue;

      const qOptLine = line.text.match(/^(\d{2})\s*[.、]\s*(A(?:\s*[.)、]?\s+|\s+).+)$/);
      if (qOptLine) {
        const qn = Number(qOptLine[1]);
        if (qn >= curGroup.start && qn <= curGroup.end) {
          flushCurClozeQ();
          curGroup.inQuestions = true;
          const opts = new Map<string, string>();
          parseInlineOptions(qOptLine[2]).forEach((o) => opts.set(o.letter, o.text));
          curGroup.curQ = { num: qn, opts };
          continue;
        }
      }

      if (curGroup.inQuestions && curGroup.curQ) {
        const moreOpts = parseInlineOptions(line.text);
        if (moreOpts.length > 0) {
          moreOpts.forEach((o) => curGroup!.curQ!.opts.set(o.letter, o.text));
          continue;
        }
      }

      if (!curGroup.inQuestions) {
        // Detect indented paragraph break (x > 95 on standard A4)
        const firstX = line.items[0]?.x ?? 0;
        if (curGroup.passageLines.length === 0 || firstX > 92) {
          curGroup.passageLines.push(line.text);
        } else {
          curGroup.passageLines[curGroup.passageLines.length - 1] += line.text;
        }
      }
    }
    flushCurClozeGroup();
  }

  if (clozeGroups.length > 0) {
    parts.push({
      partNumber: 1,
      title: '第一部分 (第 46-60 题 · 完形填空)',
      instruction: '请选出正确答案。',
      questionFormat: 'reading_cloze',
      groups: clozeGroups,
    });
  }

  // ---- Part 2: Short Passages (Q61-70) ----
  const shortQuestions: ExamQuestionItem[] = [];
  {
    let curNum: number | null = null;
    let promptLines: string[] = [];
    let opts = new Map<string, string>();
    let inOpts = false;
    let lastOpt: string | null = null;

    const flushShort = () => {
      if (curNum !== null && opts.size > 0) {
        shortQuestions.push({
          number: curNum,
          prompt: promptLines.join('').trim(),
          options: buildOptionsArray(opts),
          correctAnswer: answers.get(curNum) || '',
        });
      }
      curNum = null;
      promptLines = [];
      opts = new Map();
      inOpts = false;
      lastOpt = null;
    };

    for (const line of partLines[2]) {
      const qStart = line.text.match(/^(\d{2})\s*[.、]\s*(.+)$/);
      if (qStart) {
        const qn = Number(qStart[1]);
        if (qn >= 55 && qn <= 75) {
          flushShort();
          curNum = qn;
          promptLines = [qStart[2].trim()];
          continue;
        }
      }
      if (curNum === null) continue;

      const optLine = line.text.match(/^([A-D])(?:\s*[.)、]?\s+|\s+)(.+)$/);
      if (optLine) {
        inOpts = true;
        const parsed = parseInlineOptions(line.text);
        if (parsed.length > 0) {
          parsed.forEach((o) => opts.set(o.letter, o.text));
          lastOpt = parsed[parsed.length - 1].letter;
        } else {
          opts.set(optLine[1].toUpperCase(), optLine[2].trim());
          lastOpt = optLine[1].toUpperCase();
        }
        continue;
      }

      if (inOpts && lastOpt) {
        opts.set(lastOpt, `${opts.get(lastOpt) || ''}${line.text}`);
      } else {
        promptLines.push(line.text);
      }
    }
    flushShort();
  }

  if (shortQuestions.length > 0) {
    parts.push({
      partNumber: 2,
      title: '第二部分 (第 61-70 题 · 短文选择)',
      instruction: '请选出与试题内容一致的一项。',
      questionFormat: 'reading_short',
      groups: [
        {
          groupId: 'reading_p2',
          rangeLabel: `${shortQuestions[0].number}-${shortQuestions[shortQuestions.length - 1].number}`,
          questions: shortQuestions.sort((a, b) => a.number - b.number),
        },
      ],
    });
  }

  // ---- Part 3: Long Passages (Q71-90) ----
  const longGroups: ExamQuestionGroup[] = [];
  {
    let curGroup: {
      start: number;
      end: number;
      passageLines: string[];
      questions: ExamQuestionItem[];
      inQuestions: boolean;
      curQ: { num: number; prompt: string; opts: Map<string, string> } | null;
      lastSeenQNum: number;
    } | null = null;

    const flushLongQ = () => {
      if (curGroup?.curQ && curGroup.curQ.opts.size > 0) {
        curGroup.questions.push({
          number: curGroup.curQ.num,
          prompt: curGroup.curQ.prompt.trim(),
          options: buildOptionsArray(curGroup.curQ.opts),
          correctAnswer: answers.get(curGroup.curQ.num) || '',
        });
      }
      if (curGroup) curGroup.curQ = null;
    };

    const flushLongGroup = () => {
      flushLongQ();
      if (curGroup && curGroup.questions.length > 0) {
        longGroups.push({
          groupId: `reading_${curGroup.start}_${curGroup.end}`,
          rangeLabel: `${curGroup.start}-${curGroup.end}`,
          passage: curGroup.passageLines.join('\n').trim(),
          questions: curGroup.questions.sort((a, b) => a.number - b.number),
        });
      }
      curGroup = null;
    };

    for (const line of partLines[3]) {
      const grpHdr = line.text.match(/^(\d{2})\s*[-–—]\s*(\d{2})\s*[.、]?$/);
      if (grpHdr) {
        flushLongGroup();
        const start = Number(grpHdr[1]);
        curGroup = {
          start,
          end: Number(grpHdr[2]),
          passageLines: [],
          questions: [],
          inQuestions: false,
          curQ: null,
          lastSeenQNum: start - 1,
        };
        continue;
      }
      if (!curGroup) continue;

      // Normal numbered sub-question: "71. 作者和朋友为什么会很害怕?"
      const subQ = line.text.match(/^(\d{2})\s*[.、]\s*(.+)$/);
      if (subQ) {
        const qn = Number(subQ[1]);
        if (qn >= curGroup.start && qn <= curGroup.end) {
          flushLongQ();
          curGroup.inQuestions = true;
          curGroup.lastSeenQNum = qn;
          curGroup.curQ = { num: qn, prompt: subQ[2].trim(), opts: new Map() };
          continue;
        }
      }

      // OCR recovery for garbled question number inside known range (e.g. Q90 OCR'd as "% . 上文主要谈什么？")
      if (
        curGroup.inQuestions &&
        curGroup.curQ &&
        curGroup.curQ.opts.size >= 4 &&
        curGroup.lastSeenQNum < curGroup.end
      ) {
        const garbledQ = line.text.match(/^[^A-D\u4e00-\u9fff]{1,3}\s*[.、]\s*([\u4e00-\u9fff].+)$/);
        if (garbledQ) {
          const recoveredNum = curGroup.lastSeenQNum + 1;
          flushLongQ();
          curGroup.lastSeenQNum = recoveredNum;
          curGroup.curQ = { num: recoveredNum, prompt: garbledQ[1].trim(), opts: new Map() };
          continue;
        }
      }

      if (curGroup.inQuestions && curGroup.curQ) {
        const optsFound = parseInlineOptions(line.text);
        if (optsFound.length > 0 && /^[A-D](?:\s*[.)、]?\s+|\s+)/.test(line.text)) {
          optsFound.forEach((o) => curGroup!.curQ!.opts.set(o.letter, o.text));
          continue;
        }
        // Continuation of sub-question prompt before options arrive
        if (curGroup.curQ.opts.size === 0) {
          curGroup.curQ.prompt += line.text;
          continue;
        }
      }

      if (!curGroup.inQuestions) {
        const firstX = line.items[0]?.x ?? 0;
        if (curGroup.passageLines.length === 0 || firstX > 92) {
          curGroup.passageLines.push(line.text);
        } else {
          curGroup.passageLines[curGroup.passageLines.length - 1] += line.text;
        }
      }
    }
    flushLongGroup();
  }

  if (longGroups.length > 0) {
    parts.push({
      partNumber: 3,
      title: '第三部分 (第 71-90 题 · 长篇阅读)',
      instruction: '请选出正确答案。',
      questionFormat: 'reading_long',
      groups: longGroups,
    });
  }

  return {
    key: 'reading',
    title: '二、阅读',
    durationMin: 45,
    parts,
  };
}

function parseWritingSection(
  pages: PdfExtractedPage[],
  answers: Map<number, string>,
): ExamSection {
  const allLines: VisualLine[] = [];
  for (const page of pages) {
    allLines.push(...groupItemsIntoLines(page.items, 6));
  }

  const reorderQuestions: ExamQuestionItem[] = [];
  let q99Keywords: string[] = [];
  let q99Prompt = '请结合下列词语（要全部使用），写一篇 80 字左右的短文。';
  let q100Prompt = '请结合这张图片写一篇 80 字左右的短文。';
  let hasQ99 = false;
  let hasQ100 = false;
  let waitingForQ99Words = false;

  for (const line of allLines) {
    if (
      /^(?:三、书写|第一部分|第二部分|第\d+[-–—]\d+题|例如|这篇论文)/.test(line.text)
    ) {
      continue;
    }

    if (waitingForQ99Words && !/^\d{2,3}\s*[.、]/.test(line.text)) {
      const kws = line.text
        .split(/[、,，\s]+/)
        .map((w) => w.trim())
        .filter((w) => /[\u4e00-\u9fff]/.test(w));
      if (kws.length >= 2) {
        q99Keywords = kws;
        waitingForQ99Words = false;
        continue;
      }
    }

    // Q99 keyword essay
    const q99Match = line.text.match(/^99\s*[.、]\s*(.+)$/);
    if (q99Match) {
      hasQ99 = true;
      q99Prompt = q99Match[1].trim();
      waitingForQ99Words = true;
      continue;
    }

    // Q100 picture essay
    const q100Match = line.text.match(/^100\s*[.、]\s*(.+)$/);
    if (q100Match) {
      hasQ100 = true;
      waitingForQ99Words = false;
      q100Prompt = q100Match[1].trim();
      continue;
    }

    // Q91-98 word-reordering lines: use tabbedText (preserves wide X-gaps between word tiles!)
    const reorderMatch = line.tabbedText.match(/^(\d{2})\s*[.、]?\s*[\t ](.+)$/);
    if (reorderMatch) {
      const qn = Number(reorderMatch[1]);
      if (qn >= 91 && qn <= 98) {
        const rawBody = reorderMatch[2];
        // Clean stray OCR colons/semicolons while splitting on tabs or multi-spaces
        const rawTiles = rawBody
          .split(/\t+/)
          .flatMap((seg) => seg.split(/\s+/))
          .map((t) => t.replace(/^[：:；;，,]+|[：:；;，,]+$/g, '').trim())
          .filter(Boolean);

        const expectedAns = answers.get(qn) || '';
        const tiles = autoHealReorderTiles(rawTiles, expectedAns);

        reorderQuestions.push({
          number: qn,
          prompt: tiles.join('  /  '),
          wordTiles: tiles,
          correctAnswer: expectedAns,
        });
      }
    }
  }

  const parts: ExamPart[] = [];
  if (reorderQuestions.length > 0) {
    parts.push({
      partNumber: 1,
      title: `第一部分 (第 ${reorderQuestions[0].number}-${reorderQuestions[reorderQuestions.length - 1].number} 题 · 完成句子)`,
      instruction: '请将下列词语连成完整的句子。',
      questionFormat: 'writing_reorder',
      groups: [
        {
          groupId: 'writing_p1',
          rangeLabel: `${reorderQuestions[0].number}-${reorderQuestions[reorderQuestions.length - 1].number}`,
          questions: reorderQuestions.sort((a, b) => a.number - b.number),
        },
      ],
    });
  }

  if (hasQ99) {
    parts.push({
      partNumber: 2,
      title: '第二部分 (第 99 题 · 词语写短文)',
      instruction: '请结合下列词语（要全部使用），写一篇 80 字左右的短文。',
      questionFormat: 'writing_keywords',
      groups: [
        {
          groupId: 'writing_p2_q99',
          rangeLabel: '99',
          questions: [
            {
              number: 99,
              prompt: q99Prompt,
              keywords: q99Keywords,
              correctAnswer: '',
              minChars: 80,
            },
          ],
        },
      ],
    });
  }

  if (hasQ100) {
    parts.push({
      partNumber: 3,
      title: '第二部分 (第 100 题 · 看图写短文)',
      instruction: '请结合这张图片写一篇 80 字左右的短文。',
      questionFormat: 'writing_picture',
      groups: [
        {
          groupId: 'writing_p2_q100',
          rangeLabel: '100',
          questions: [
            {
              number: 100,
              prompt: q100Prompt,
              correctAnswer: '',
              minChars: 80,
            },
          ],
        },
      ],
    });
  }

  return {
    key: 'writing',
    title: '三、书写',
    durationMin: 40,
    parts,
  };
}

function getHanziMultiset(text: string): Map<string, number> {
  const map = new Map<string, number>();
  const chars = (text || '').match(new RegExp(CJK_CHAR, 'g')) || [];
  for (const ch of chars) {
    map.set(ch, (map.get(ch) || 0) + 1);
  }
  return map;
}

/**
 * Automatically heals unambiguous 1-to-1 PDF hidden-OCR-layer typos in Q91-98 word tiles
 * using the verified Answer Key sentence (e.g. scanned PDF hidden text "陂" -> "被").
 */
function autoHealReorderTiles(tiles: string[], correctAnswer: string): string[] {
  if (!tiles.length || !correctAnswer) return tiles;

  const tileChars = getHanziMultiset(tiles.join(''));
  const ansChars = getHanziMultiset(correctAnswer);
  const extra: string[] = [];
  const missing: string[] = [];

  tileChars.forEach((cnt, ch) => {
    for (let i = 0; i < cnt - (ansChars.get(ch) || 0); i++) extra.push(ch);
  });
  ansChars.forEach((cnt, ch) => {
    for (let i = 0; i < cnt - (tileChars.get(ch) || 0); i++) missing.push(ch);
  });

  // Unambiguous single-character OCR swap (same total Hanzi count, 1 char differs)
  if (extra.length === 1 && missing.length === 1) {
    const [badChar] = extra;
    const [goodChar] = missing;
    let replaced = false;
    const healed = tiles.map((tile) => {
      if (!replaced && tile.includes(badChar)) {
        const candidate = tile.replace(badChar, goodChar);
        if (correctAnswer.includes(candidate)) {
          replaced = true;
          return candidate;
        }
      }
      return tile;
    });
    if (replaced) return healed;

    // Fallback: replace the single tile containing badChar even if multi-char tile spans words
    return tiles.map((tile) => {
      if (!replaced && tile.includes(badChar)) {
        replaced = true;
        return tile.replace(badChar, goodChar);
      }
      return tile;
    });
  }

  return tiles;
}

function validateParsedExam(sections: ExamSection[]): {
  warnings: ParsedExamWarning[];
  stats: ParsedExamBundleResult['stats'];
} {
  const warnings: ParsedExamWarning[] = [];
  let totalQuestions = 0;
  let listeningCount = 0;
  let readingCount = 0;
  let writingCount = 0;
  let answersMatched = 0;
  let transcriptsMatched = 0;

  for (const sec of sections) {
    for (const part of sec.parts) {
      for (const group of part.groups) {
        for (const q of group.questions) {
          totalQuestions++;
          if (sec.key === 'listening') listeningCount++;
          if (sec.key === 'reading') readingCount++;
          if (sec.key === 'writing') writingCount++;

          const isEssay =
            part.questionFormat === 'writing_keywords' ||
            part.questionFormat === 'writing_picture';
          const isMcq =
            part.questionFormat === 'listening_mcq' ||
            part.questionFormat === 'reading_cloze' ||
            part.questionFormat === 'reading_short' ||
            part.questionFormat === 'reading_long';

          if (q.correctAnswer) answersMatched++;
          if (sec.key === 'listening' && (q.transcript || group.transcript)) {
            transcriptsMatched++;
          }

          if (isMcq && (!q.options || q.options.length < 4)) {
            warnings.push({
              questionNumber: q.number,
              severity: 'error',
              message: `Chỉ đọc được ${q.options?.length || 0}/4 lựa chọn A-D — hãy bổ sung trong Preview.`,
            });
          }

          if (!isEssay && !q.correctAnswer) {
            warnings.push({
              questionNumber: q.number,
              severity: 'warning',
              message: 'Chưa khớp được đáp án mẫu (kiểm tra file 答案.pdf hoặc nhập tay).',
            });
          }

          if (sec.key === 'listening' && !q.transcript && !group.transcript) {
            warnings.push({
              questionNumber: q.number,
              severity: 'warning',
              message: 'Chưa có kịch bản nghe (transcript) cho câu này.',
            });
          }

          // Cross-validate Q91-98 word tiles vs Answer Key to catch OCR typos (e.g. 陂 vs 被)
          if (
            part.questionFormat === 'writing_reorder' &&
            q.wordTiles?.length &&
            q.correctAnswer
          ) {
            const tileChars = getHanziMultiset(q.wordTiles.join(''));
            const ansChars = getHanziMultiset(q.correctAnswer);
            const extra: string[] = [];
            const missing: string[] = [];

            tileChars.forEach((cnt, ch) => {
              const diff = cnt - (ansChars.get(ch) || 0);
              if (diff > 0) extra.push(ch);
            });
            ansChars.forEach((cnt, ch) => {
              const diff = cnt - (tileChars.get(ch) || 0);
              if (diff > 0) missing.push(ch);
            });

            if (extra.length > 0 || missing.length > 0) {
              warnings.push({
                questionNumber: q.number,
                severity: 'warning',
                message: `Phát hiện lệch chữ OCR giữa đề & đáp án${
                  extra.length ? ` (đề dư: ${extra.join(', ')})` : ''
                }${missing.length ? ` (đề thiếu: ${missing.join(', ')})` : ''} — nên sửa lại thẻ từ.`,
                sourceText: `${q.number}. ${q.wordTiles.join('  ')}`,
                ...(extra.length === 1 && missing.length === 1
                  ? { suggestedFix: { from: extra[0], to: missing[0] } }
                  : {}),
              });
            }
          }
        }
      }
    }
  }

  return {
    warnings: warnings.sort((a, b) => a.questionNumber - b.questionNumber),
    stats: {
      totalQuestions,
      listeningCount,
      readingCount,
      writingCount,
      answersMatched,
      transcriptsMatched,
      imagesCropped: 0,
    },
  };
}

/**
 * Pure core parser operating on pre-extracted PDF pages (100% testable in Node & Browser).
 */
export function parseHskExamFromExtractedPages(params: {
  examPages: PdfExtractedPage[];
  answerPages?: PdfExtractedPage[];
  transcriptPages?: PdfExtractedPage[];
  examFilename?: string;
  fallbackLevel?: number;
}): ParsedExamBundleResult {
  const { examPages, answerPages, transcriptPages, examFilename, fallbackLevel = 5 } = params;

  const firstPagesText = examPages
    .slice(0, 3)
    .map((p) => groupItemsIntoLines(p.items, 6).map((l) => l.text).join('\n'))
    .join('\n');
  const meta = detectExamMeta(firstPagesText, examFilename, fallbackLevel);

  const answerText = (answerPages || [])
    .map((p) => groupItemsIntoLines(p.items, 6).map((l) => l.text).join('\n'))
    .join('\n');
  const answers = answerText ? parseAnswerKeyText(answerText) : new Map<number, string>();

  const transcriptData =
    transcriptPages && transcriptPages.length > 0
      ? parseListeningScriptPages(transcriptPages)
      : null;

  // Split exam pages into Listening / Reading / Writing buckets by section headers
  const listeningPages: PdfExtractedPage[] = [];
  const readingPages: PdfExtractedPage[] = [];
  const writingPages: PdfExtractedPage[] = [];
  let activeSection: 'cover' | 'listening' | 'reading' | 'writing' = 'cover';

  for (const page of examPages) {
    const pageText = groupItemsIntoLines(page.items, 6)
      .map((l) => l.text)
      .join('\n');
    if (!pageText) continue;

    // Cover page check (contains "注意" & overview of all 3 sections)
    if (page.pageNumber <= 2 && /注意/.test(pageText) && /听力.*阅读.*书写/s.test(pageText)) {
      continue;
    }

    if (/一、听力/.test(pageText)) activeSection = 'listening';
    else if (/二、阅读/.test(pageText)) activeSection = 'reading';
    else if (/三、书写/.test(pageText)) activeSection = 'writing';

    if (activeSection === 'listening') listeningPages.push(page);
    else if (activeSection === 'reading') readingPages.push(page);
    else if (activeSection === 'writing') writingPages.push(page);
  }

  const sections: ExamSection[] = [];
  if (listeningPages.length > 0) {
    sections.push(parseListeningSection(listeningPages, answers, transcriptData));
  }
  if (readingPages.length > 0) {
    sections.push(parseReadingSection(readingPages, answers));
  }
  if (writingPages.length > 0) {
    sections.push(parseWritingSection(writingPages, answers));
  }

  const { warnings, stats } = validateParsedExam(sections);

  return {
    code: meta.code,
    level: meta.level,
    title: meta.title,
    description: `Bộ đề thi chuẩn HSK ${meta.level} (${stats.totalQuestions} câu · Nghe ${stats.listeningCount}, Đọc ${stats.readingCount}, Viết ${stats.writingCount}).`,
    totalDurationMin: 120,
    sections,
    warnings,
    stats,
    croppedImages: [],
  };
}

/**
 * Classifies multiple dropped/selected files automatically into the 4 HSK Exam Bundle slots.
 */
export function classifyExamBundleFiles(
  files: File[],
  existing: ClassifiedExamFiles = {
    examPdf: null,
    answerPdf: null,
    transcriptPdf: null,
    audioFile: null,
  },
): ClassifiedExamFiles {
  const next: ClassifiedExamFiles = { ...existing };
  for (const file of files) {
    const name = file.name.toLowerCase();
    if (/\.(mp3|m4a|wav|ogg|aac)$/i.test(name) || file.type.startsWith('audio/')) {
      next.audioFile = file;
    } else if (/\.pdf$/i.test(name)) {
      if (/答案|answer|key|dap.?an/i.test(file.name)) {
        next.answerPdf = file;
      } else if (/听力|材料|transcript|script|kich.?ban/i.test(file.name)) {
        next.transcriptPdf = file;
      } else {
        next.examPdf = file;
      }
    }
  }
  return next;
}

export function readAudioFileDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(undefined);
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (val?: number) => {
      URL.revokeObjectURL(url);
      resolve(val);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const dur = Number.isFinite(audio.duration) ? Math.round(audio.duration) : undefined;
      done(dur);
    };
    audio.onerror = () => done(undefined);
    audio.src = url;
  });
}

async function loadPdfDocument(file: File) {
  const [pdfjsLib, workerMod] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.js?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerMod.default;
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

async function extractPagesFromPdfFile(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<{ pdf: any; pages: PdfExtractedPage[] }> {
  const pdf = await loadPdfDocument(file);
  const pages: PdfExtractedPage[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    if (p === 1 || p % 4 === 0 || p === pdf.numPages) {
      onProgress?.(`Đang đọc "${file.name}" (trang ${p}/${pdf.numPages})...`);
    }
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: PdfRawTextItem[] = (content.items as any[])
      .filter((it) => (it.str || '').trim())
      .map((it) => ({
        x: it.transform[4],
        y: it.transform[5],
        w: it.width || 0,
        str: String(it.str || '').trim(),
      }));
    pages.push({ pageNumber: p, width: vp.width, height: vp.height, items });
  }
  return { pdf, pages };
}

/**
 * Automatically crops the embedded picture for Q100 (or any picture writing question)
 * directly from the rendered PDF page canvas, trims surrounding white margins, and exports WebP.
 */
async function autoCropWritingPicture(
  pdf: any,
  examPages: PdfExtractedPage[],
): Promise<CroppedQuestionImage | null> {
  if (typeof document === 'undefined') return null;

  // Find the page containing "100." + "图片"
  let targetPageInfo: PdfExtractedPage | null = null;
  let promptBottomPdfY = 0;

  for (const page of [...examPages].reverse()) {
    const lines = groupItemsIntoLines(page.items, 6);
    const q100Line = lines.find((l) => /^100\s*[.、]/.test(l.text) && /图/.test(l.text));
    if (q100Line) {
      targetPageInfo = page;
      promptBottomPdfY = q100Line.y - 16;
      break;
    }
  }

  if (!targetPageInfo || promptBottomPdfY <= 120) return null;

  try {
    const scale = 2;
    const page = await pdf.getPage(targetPageInfo.pageNumber);
    const viewport = page.getViewport({ scale });
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = Math.round(viewport.width);
    fullCanvas.height = Math.round(viewport.height);
    const ctx = fullCanvas.getContext('2d');
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert PDF coordinates (bottom-left origin) -> Canvas coordinates (top-left origin)
    const cropTop = Math.max(0, Math.round((targetPageInfo.height - promptBottomPdfY) * scale));
    const cropBottom = Math.min(
      fullCanvas.height,
      Math.round((targetPageInfo.height - 85) * scale),
    );
    const cropLeft = Math.round(55 * scale);
    const cropRight = Math.round((targetPageInfo.width - 55) * scale);
    const regionW = cropRight - cropLeft;
    const regionH = cropBottom - cropTop;
    if (regionW < 60 || regionH < 60) return null;

    // Auto-trim white margins around the actual photo inside the region
    const imgData = ctx.getImageData(cropLeft, cropTop, regionW, regionH).data;
    let minX = regionW;
    let minY = regionH;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < regionH; y += 2) {
      for (let x = 0; x < regionW; x += 2) {
        const idx = (y * regionW + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        if (r < 242 || g < 242 || b < 242) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX - minX < 40 || maxY - minY < 40) return null;

    const pad = 12;
    const sx = cropLeft + Math.max(0, minX - pad);
    const sy = cropTop + Math.max(0, minY - pad);
    const sw = Math.min(fullCanvas.width - sx, maxX - minX + pad * 2);
    const sh = Math.min(fullCanvas.height - sy, maxY - minY + pad * 2);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = sw;
    outCanvas.height = sh;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return null;
    outCtx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

    const blob = await new Promise<Blob | null>((resolve) =>
      outCanvas.toBlob((b) => resolve(b), 'image/webp', 0.88),
    );
    if (!blob) return null;

    return {
      questionNumber: 100,
      blob,
      previewUrl: URL.createObjectURL(blob),
      filename: 'q100.webp',
    };
  } catch {
    return null;
  }
}

/**
 * Full browser entrypoint: parses the 4-file HSK exam bundle (Exam PDF + Answer PDF + Transcript PDF + MP3),
 * auto-crops Q100 image from PDF canvas, reads MP3 duration, and runs OCR cross-validation.
 */
export async function parseExamBundleFiles(
  files: ClassifiedExamFiles,
  fallbackLevel: number,
  onProgress?: (msg: string) => void,
): Promise<ParsedExamBundleResult> {
  if (!files.examPdf) {
    throw new Error('Cần ít nhất file Đề thi PDF (ví dụ H50000.pdf) để bắt đầu phân tích.');
  }

  const [{ pdf: examPdfDoc, pages: examPages }, answerRes, transcriptRes, audioDurationSec] =
    await Promise.all([
      extractPagesFromPdfFile(files.examPdf, onProgress),
      files.answerPdf ? extractPagesFromPdfFile(files.answerPdf, onProgress) : Promise.resolve(null),
      files.transcriptPdf
        ? extractPagesFromPdfFile(files.transcriptPdf, onProgress)
        : Promise.resolve(null),
      files.audioFile ? readAudioFileDuration(files.audioFile) : Promise.resolve(undefined),
    ]);

  onProgress?.('Đang ghép đáp án, kịch bản nghe & kiểm tra lỗi OCR...');
  const parsed = parseHskExamFromExtractedPages({
    examPages,
    answerPages: answerRes?.pages,
    transcriptPages: transcriptRes?.pages,
    examFilename: files.examPdf.name,
    fallbackLevel,
  });

  if (audioDurationSec) {
    parsed.audioDurationSec = audioDurationSec;
  }

  onProgress?.('Đang trích xuất hình ảnh câu viết (nếu có)...');
  const q100Img = await autoCropWritingPicture(examPdfDoc, examPages);
  if (q100Img) {
    parsed.croppedImages.push(q100Img);
    parsed.stats.imagesCropped = parsed.croppedImages.length;
  }

  return parsed;
}
