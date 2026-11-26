import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { ExtractedExerciseRow, ExtractedVocabRow } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfTextItem {
  x: number;
  y: number;
  w: number;
  txt: string;
}

interface ColumnBounds {
  hanziMin: number;
  pinyinMin: number;
  englishMin: number;
  meaningMin: number;
  exampleMin: number;
}

function isPinyinLike(str: string): boolean {
  if (!str) return false;
  const clean = str.replace(/[\s'’\-0-9,./]/g, '');
  if (!clean || clean.length > 32) return false;
  const hasTone = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüăĕĭŏŭ]/i.test(clean);
  const isAsciiAlpha = /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüăĕĭŏŭ]+$/.test(clean);
  return isAsciiAlpha && (hasTone || clean.length <= 16);
}

function splitBilingualExample(text: string): { exampleZh: string; exampleVi: string } {
  if (!text) return { exampleZh: '', exampleVi: '' };
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const idx = cleaned.search(/\s*[-–—]\s*(?=[^\u4e00-\u9fff])/);
  if (idx > 0) {
    return {
      exampleZh: cleaned.slice(0, idx).trim(),
      exampleVi: cleaned.slice(idx).replace(/^[\s\-–—]+/, '').trim(),
    };
  }
  return { exampleZh: cleaned, exampleVi: '' };
}

/**
 * Detects 6-column table X-boundaries (e.g. STT | Tiếng Trung | Pinyin | Tiếng Anh | Tiếng Việt | Câu ví dụ)
 */
function detectTableColumns(items: PdfTextItem[]): ColumnBounds | null {
  const findX = (rx: RegExp) => items.find((it) => rx.test(it.txt))?.x;
  const xHanzi = findX(/Tiếng\s*Trung|Hán\s*tự|Chữ\s*Hán|Hanzi/i);
  const xPinyin = findX(/Pinyin|Phiên\s*âm/i);
  const xEnglish = findX(/Tiếng\s*Anh|English/i);
  const xMeaning = findX(/Tiếng\s*Việt|Nghĩa/i);
  const xExample = findX(/Câu\s*ví\s*dụ|Ví\s*dụ|Example/i);

  if (xHanzi !== undefined && xPinyin !== undefined && xMeaning !== undefined) {
    const hanziMin = Math.max(55, xHanzi - 16);
    const pinyinMin = xPinyin - 24;
    const englishMin = xEnglish !== undefined ? xEnglish - 16 : xMeaning - 16;
    const meaningMin = xMeaning - 16;
    const exampleMin = xExample !== undefined ? Math.min(xExample - 75, xMeaning + 65) : xMeaning + 75;
    return { hanziMin, pinyinMin, englishMin, meaningMin, exampleMin };
  }
  return null;
}

/**
 * Extracts multi-line table rows accurately using PDF (x, y) coordinates.
 * Handles vertically centered STT/Hanzi/Pinyin/English/Vietnamese next to wrapped multi-line examples!
 */
function extractPageByColumns(
  items: PdfTextItem[],
  bounds: ColumnBounds,
  seen: Set<string>,
): ExtractedVocabRow[] {
  const skipHeaderY = items.find((it) => /^STT$/i.test(it.txt))?.y;
  const bodyItems = items.filter((it) => {
    if (skipHeaderY !== undefined && it.y >= skipHeaderY - 4) return false;
    if (/^(TỪ VỰNG|SOẠN BỞI|CÁC BẠN CẦN|ZALO|TIKTOK|VÌ LÀ TÀI LIỆU|RẤT MONG)/i.test(it.txt)) {
      return false;
    }
    return true;
  });

  // Anchors: Hanzi cells inside the Hanzi column
  const anchors = bodyItems
    .filter(
      (it) =>
        it.x >= bounds.hanziMin &&
        it.x < bounds.pinyinMin &&
        /^[\u4e00-\u9fff]{1,6}$/.test(it.txt),
    )
    .sort((a, b) => b.y - a.y);

  if (!anchors.length) return [];

  // Group example-column items into visual lines (sorted top-to-bottom)
  const exampleItems = bodyItems
    .filter((it) => it.x >= bounds.exampleMin)
    .sort((a, b) => {
      const dy = Math.round(b.y) - Math.round(a.y);
      if (Math.abs(dy) > 5) return dy;
      return a.x - b.x;
    });

  const exLines: Array<{ y: number; text: string }> = [];
  exampleItems.forEach((it) => {
    const last = exLines[exLines.length - 1];
    if (last && Math.abs(last.y - it.y) <= 5) {
      last.text = `${last.text} ${it.txt}`.trim();
    } else {
      exLines.push({ y: it.y, text: it.txt });
    }
  });

  // Group wrapped example lines into per-sentence blocks:
  // A new sentence starts when a line starts with Chinese right after a non-Chinese (Vietnamese) line
  const exBlocks: Array<{ yMid: number; text: string }> = [];
  let curLines: Array<{ y: number; text: string }> = [];
  let prevEndedWithLatin = false;

  exLines.forEach((line) => {
    const startsZh = /^[\u4e00-\u9fff“「（(]/.test(line.text);
    const hasLatin = /[a-zA-ZÀ-ỹ]/.test(line.text);
    const isPureZh = !hasLatin && /[\u4e00-\u9fff]/.test(line.text);

    if (curLines.length > 0 && startsZh && prevEndedWithLatin) {
      const yMid = (curLines[0].y + curLines[curLines.length - 1].y) / 2;
      exBlocks.push({
        yMid,
        text: curLines
          .map((l) => l.text)
          .join(' ')
          .replace(/([\u4e00-\u9fff，。！？、；：])\s+([\u4e00-\u9fff，。！？、；：])/g, '$1$2'),
      });
      curLines = [line];
      prevEndedWithLatin = hasLatin && !isPureZh;
    } else {
      curLines.push(line);
      if (hasLatin) prevEndedWithLatin = true;
    }
  });

  if (curLines.length > 0) {
    const yMid = (curLines[0].y + curLines[curLines.length - 1].y) / 2;
    exBlocks.push({
      yMid,
      text: curLines
        .map((l) => l.text)
        .join(' ')
        .replace(/([\u4e00-\u9fff，。！？、；：])\s+([\u4e00-\u9fff，。！？、；：])/g, '$1$2'),
    });
  }

  // Assign each non-example item to its nearest anchor row
  const rowCells = anchors.map((anchor) => ({
    anchor,
    pinyin: [] as PdfTextItem[],
    english: [] as PdfTextItem[],
    meaning: [] as PdfTextItem[],
    exampleText: '',
  }));

  const findRowIndexByY = (y: number): number => {
    for (let i = 0; i < anchors.length; i++) {
      const topLimit = i === 0 ? Infinity : (anchors[i - 1].y + anchors[i].y) / 2;
      const bottomLimit = i === anchors.length - 1 ? -Infinity : (anchors[i].y + anchors[i + 1].y) / 2;
      if (y <= topLimit && y > bottomLimit) return i;
    }
    return anchors.length - 1;
  };

  bodyItems.forEach((it) => {
    if (it.x < bounds.pinyinMin || it.x >= bounds.exampleMin) return;
    const rowIdx = findRowIndexByY(it.y);
    const cell = rowCells[rowIdx];
    if (!cell) return;

    if (it.x >= bounds.pinyinMin && it.x < bounds.englishMin) {
      cell.pinyin.push(it);
    } else if (it.x >= bounds.englishMin && it.x < bounds.meaningMin) {
      cell.english.push(it);
    } else if (it.x >= bounds.meaningMin && it.x < bounds.exampleMin) {
      cell.meaning.push(it);
    }
  });

  // Match example blocks to anchor rows (prefer direct 1-to-1 when counts match, else nearest yMid)
  if (exBlocks.length === rowCells.length) {
    exBlocks.forEach((blk, i) => {
      rowCells[i].exampleText = blk.text;
    });
  } else {
    exBlocks.forEach((blk) => {
      let bestIdx = 0;
      let bestDist = Infinity;
      rowCells.forEach((cell, idx) => {
        // Strong bonus if example block actually contains the row's Hanzi
        const containsBonus = blk.text.includes(cell.anchor.txt) ? -35 : 0;
        const dist = Math.abs(blk.yMid - cell.anchor.y) + containsBonus;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      rowCells[bestIdx].exampleText = rowCells[bestIdx].exampleText
        ? `${rowCells[bestIdx].exampleText} ${blk.text}`
        : blk.text;
    });
  }

  const sortCell = (arr: PdfTextItem[]) =>
    arr
      .sort((a, b) => {
        const dy = Math.round(b.y) - Math.round(a.y);
        if (Math.abs(dy) > 4) return dy;
        return a.x - b.x;
      })
      .map((i) => i.txt)
      .join(' ')
      .trim();

  const out: ExtractedVocabRow[] = [];
  rowCells.forEach((cell) => {
    const hanzi = cell.anchor.txt;
    if (seen.has(hanzi)) return;
    seen.add(hanzi);
    const pinyin = sortCell(cell.pinyin);
    const english = sortCell(cell.english);
    const meaning = sortCell(cell.meaning);
    const ex = splitBilingualExample(cell.exampleText);
    out.push({
      selected: true,
      hanzi,
      pinyin: pinyin || '—',
      english,
      meaning: meaning || english || 'Chưa có nghĩa',
      exampleZh: ex.exampleZh,
      exampleVi: ex.exampleVi,
    });
  });

  return out;
}

export function smartExtractChineseVocab(rawText: string): ExtractedVocabRow[] {
  const skipPatterns = [
    /^TỪ VỰNG TIẾNG TRUNG/i,
    /^TỪ VỰNG HSK/i,
    /SOẠN BỞI TIKTOK/i,
    /^STT\b/i,
    /CÁC BẠN CẦN TÀI LIỆU/i,
    /ZALO\s*:/i,
    /TIKTOK\s*:/i,
    /VÌ LÀ TÀI LIỆU MÌNH TỰ SOẠN/i,
    /RẤT MONG CÁC BẠN/i,
  ];

  const lines = (rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !skipPatterns.some((rx) => rx.test(l)));

  const results: ExtractedVocabRow[] = [];
  const seen = new Set<string>();

  lines.forEach((rawLine) => {
    if (!/[\u4e00-\u9fff]/.test(rawLine)) return;

    // Pattern 1: Tab or Pipe-delimited multi-column table
    const cols = rawLine
      .split(/\t|\|/)
      .map((c) => c.trim())
      .filter(Boolean);

    if (cols.length >= 4) {
      const offset = /^\d+(\s+\d+)*$/.test(cols[0]) ? 1 : 0;
      const hanziCol = cols[offset] || '';
      const hanziMatch = hanziCol.match(/^[\u4e00-\u9fff]{1,6}$/);
      if (hanziMatch && cols[offset + 1]) {
        const hanzi = hanziMatch[0];
        const pinyin = cols[offset + 1] || '';
        let english = '';
        let meaning = '';
        let exRaw = '';

        if (cols.length - offset >= 5) {
          english = cols[offset + 2];
          meaning = cols[offset + 3];
          exRaw = cols.slice(offset + 4).join(' ');
        } else if (cols.length - offset === 4) {
          english = cols[offset + 2];
          meaning = cols[offset + 3];
        } else {
          meaning = cols[offset + 2];
        }

        if (!seen.has(hanzi)) {
          seen.add(hanzi);
          const ex = splitBilingualExample(exRaw);
          results.push({
            selected: true,
            hanzi,
            pinyin,
            english,
            meaning: meaning || 'Chưa có nghĩa',
            exampleZh: ex.exampleZh,
            exampleVi: ex.exampleVi,
          });
        }
        return;
      }
    }

    // Pattern 2: Numbered table row flattened with spaces
    const mFlatTable = rawLine.match(
      /^(\d{1,4})\s+([\u4e00-\u9fff]{1,5})\s+([a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü'’]{1,24})\s+(.+)$/,
    );
    if (mFlatTable) {
      const hanzi = mFlatTable[2].trim();
      const pinyin = mFlatTable[3].trim();
      const rest = mFlatTable[4].trim();
      const zhExIdx = rest.search(/[\u4e00-\u9fff]{3,}/);
      const meaningPart = zhExIdx > 0 ? rest.slice(0, zhExIdx).trim() : rest;
      const exPart = zhExIdx > 0 ? rest.slice(zhExIdx).trim() : '';
      const mChunks = meaningPart.split(/\s{2,}/).filter(Boolean);
      const english = mChunks.length >= 2 ? mChunks[0] : '';
      const meaning = mChunks.length >= 2 ? mChunks.slice(1).join(' ') : meaningPart;
      const ex = splitBilingualExample(exPart);

      if (!seen.has(hanzi)) {
        seen.add(hanzi);
        results.push({
          selected: true,
          hanzi,
          pinyin,
          english,
          meaning: meaning || 'Chưa có nghĩa',
          exampleZh: ex.exampleZh,
          exampleVi: ex.exampleVi,
        });
      }
      return;
    }

    const line = rawLine.replace(/^(\d+[.)\-、]\s*|[-•*]\s*)/, '').trim();

    // Pattern 3: Hanzi (pinyin) - meaning
    const mParen = line.match(
      /([\u4e00-\u9fff]{1,6})\s*[([（]([^)）\]]+)[)）\]]\s*[-–—:：/|]?\s*(.*)/,
    );
    if (mParen) {
      const hanzi = mParen[1].trim();
      const pinyin = mParen[2].trim();
      const meaning = mParen[3].trim() || 'Chưa có nghĩa (bấm để sửa)';
      if (!seen.has(hanzi)) {
        seen.add(hanzi);
        results.push({
          selected: true,
          hanzi,
          pinyin,
          english: '',
          meaning,
          exampleZh: '',
          exampleVi: '',
        });
      }
      return;
    }

    // Pattern 4: Delimited by "/", "|", " - ", ":", or Tab
    const parts = line
      .split(/\s*(?:\t|\||\/|\s-\s|\s–\s|:|：)\s*/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const hanziPart =
        parts.find((p) => /^[\u4e00-\u9fff]{1,6}$/.test(p)) ||
        parts.find((p) => /[\u4e00-\u9fff]/.test(p));
      const hanziMatch = hanziPart ? hanziPart.match(/[\u4e00-\u9fff]{1,6}/) : null;
      if (hanziMatch && hanziPart && hanziPart.length <= 10) {
        const hanzi = hanziMatch[0];
        const rest = parts.filter((p) => p !== hanziPart);
        let pinyin = '';
        let meaning = '';
        if (rest.length >= 2) {
          pinyin = rest[0];
          meaning = rest.slice(1).join(' - ');
        } else if (rest.length === 1) {
          if (isPinyinLike(rest[0])) {
            pinyin = rest[0];
            meaning = 'Chưa có nghĩa (bấm để sửa)';
          } else {
            meaning = rest[0];
          }
        }
        if (!seen.has(hanzi)) {
          seen.add(hanzi);
          results.push({
            selected: true,
            hanzi,
            pinyin: pinyin || '—',
            english: '',
            meaning: meaning || 'Chưa có nghĩa',
            exampleZh: '',
            exampleVi: '',
          });
        }
      }
    }
  });

  return results;
}

/**
 * Also detects explicit multiple-choice questions inside PDF/DOCX/TXT documents:
 *   Câu 1: ... / 1. ...
 *   A. ...  B. ...  C. ...  D. ...
 *   Đáp án: A (or Answer: B)
 */
export function extractWrittenExercises(rawText: string): ExtractedExerciseRow[] {
  const exercises: ExtractedExerciseRow[] = [];
  const blockRegex =
    /(?:^|\n)\s*(?:Câu|Bài|Question)?\s*(\d+)[.:：)]\s*([^\n]+(?:\n(?![A-D][.):]\s)[^\n]+)*)\n\s*A[.):]\s*([^\n]+)\n\s*B[.):]\s*([^\n]+)(?:\n\s*C[.):]\s*([^\n]+))?(?:\n\s*D[.):]\s*([^\n]+))?(?:\n\s*(?:Đáp án|Answer|Key)\s*[:：]\s*([A-D]))?/gi;

  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(rawText || '')) !== null) {
    const qNum = m[1];
    const question = (m[2] || '').replace(/\s+/g, ' ').trim();
    const opts = [m[3], m[4], m[5], m[6]].filter(Boolean).map((s) => s.trim());
    if (!question || opts.length < 2) continue;

    const answerLetter = (m[7] || 'A').toUpperCase();
    const answerIdx = Math.max(0, Math.min(opts.length - 1, answerLetter.charCodeAt(0) - 65));

    exercises.push({
      exerciseType: 'quiz',
      title: `Bài tập trắc nghiệm #${qNum} (từ tài liệu)`,
      question,
      options: opts,
      correctAnswer: opts[answerIdx],
      explanation: `Trích xuất trực tiếp từ tài liệu tải lên (Đáp án ${answerLetter}).`,
      xpReward: 20,
    });
  }

  return exercises;
}

export async function parseCourseFile(
  file: File,
  onProgress?: (text: string) => void,
): Promise<{ words: ExtractedVocabRow[]; exercises: ExtractedExerciseRow[] }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  onProgress?.(`Đang đọc file "${file.name}"...`);

  let rawText = '';
  let tableExtracted: ExtractedVocabRow[] = [];

  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    rawText = result.value || '';
  } else if (ext === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pagesText: string[] = [];
    const seen = new Set<string>();
    let detectedBounds: ColumnBounds | null = null;

    for (let p = 1; p <= pdf.numPages; p++) {
      if (p === 1 || p % 5 === 0 || p === pdf.numPages) {
        onProgress?.(`Đang đọc trang ${p} / ${pdf.numPages} của file PDF...`);
      }
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = (content.items as any[])
        .filter((it) => (it.str || '').trim())
        .map((it) => ({
          x: it.transform[4],
          y: it.transform[5],
          w: it.width || 0,
          txt: (it.str || '').trim(),
        }));

      if (!detectedBounds) {
        detectedBounds = detectTableColumns(items);
      }

      if (detectedBounds) {
        const pageWords = extractPageByColumns(items, detectedBounds, seen);
        tableExtracted.push(...pageWords);
      }

      // Also reconstruct plain text for written exercise extraction or fallback parsing
      const sorted = [...items].sort((a, b) => {
        const dy = Math.round(b.y) - Math.round(a.y);
        if (Math.abs(dy) > 5) return dy;
        return a.x - b.x;
      });
      const rows: PdfTextItem[][] = [];
      let curRow: PdfTextItem[] = [];
      let curY: number | null = null;
      sorted.forEach((it) => {
        const y = Math.round(it.y);
        if (curY === null || Math.abs(y - curY) <= 6) {
          curRow.push(it);
          if (curY === null) curY = y;
        } else {
          rows.push(curRow);
          curRow = [it];
          curY = y;
        }
      });
      if (curRow.length) rows.push(curRow);

      rows.forEach((row) => {
        row.sort((a, b) => a.x - b.x);
        let lineStr = '';
        for (let i = 0; i < row.length; i++) {
          if (i > 0) {
            const gap = row[i].x - (row[i - 1].x + row[i - 1].w);
            lineStr += gap > 14 ? '\t' : ' ';
          }
          lineStr += row[i].txt;
        }
        pagesText.push(lineStr);
      });
    }
    rawText = pagesText.join('\n');
  } else if (ext === 'txt') {
    rawText = await file.text();
  } else {
    throw new Error('Chỉ hỗ trợ định dạng .docx, .pdf hoặc .txt!');
  }

  const words = tableExtracted.length > 0 ? tableExtracted : smartExtractChineseVocab(rawText);
  const exercises = extractWrittenExercises(rawText);
  return { words, exercises };
}
