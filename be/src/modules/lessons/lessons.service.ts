import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { sanitizeExerciseOptions } from '../../schemas/schema-options';
import { ProfileService } from '../profile/profile.service';
import { BulkImportLessonsDto, CreateLessonDto, ImportVocabItemDto } from './lessons.dto';

@Injectable()
export class LessonsService {
  constructor(
    private readonly hskCollections: HskCollectionsService,
    private readonly profileService: ProfileService,
  ) {}

  async findAll(level?: number) {
    if (level && level >= 1 && level <= 6) {
      return this.hskCollections
        .getLevel(level)
        .lessons.find()
        .select('-_id -__v')
        .sort({ order: 1, createdAt: -1 })
        .lean()
        .exec();
    }

    const perLevel = await Promise.all(
      this.hskCollections.getAllLevels().map((lv) =>
        lv.lessons.find().select('-_id -__v').sort({ order: 1, createdAt: -1 }).lean().exec(),
      ),
    );
    return perLevel.flat();
  }

  async findOne(id: string) {
    const found = await this.hskCollections.findLessonById(id);
    if (!found) {
      throw new NotFoundException(`Lesson "${id}" not found`);
    }
    const [words, exercises] = await Promise.all([
      found.models.vocab.find({ lessonId: id }).select('-_id -__v').sort({ order: 1 }).lean().exec(),
      found.models.exercises
        .find({ lessonId: id })
        .select('-_id -__v')
        .sort({ order: 1 })
        .lean()
        .exec(),
    ]);
    return { lesson: found.doc, words, exercises };
  }

  async create(dto: CreateLessonDto) {
    const lv = this.hskCollections.getLevel(dto.level);
    const id = dto.id || `hsk${dto.level}-custom-${Date.now()}`;
    const doc = await lv.lessons.create({
      id,
      level: dto.level,
      title: dto.title,
      desc: dto.desc || '',
      fromFile: !!dto.fromFile,
      order: -Date.now(),
    });
    return doc.toObject();
  }

  /**
   * Generates 100% typed-input exercises (ZERO multiple-choice options):
   *  1. If a word has both `exampleVi` and `exampleZh` -> prompt shows ONLY Vietnamese (`exampleVi`),
   *     hiding Chinese completely so the learner types the Chinese sentence (`exampleZh`).
   *  2. If a word has `exampleZh` containing `hanzi` without `exampleVi` -> typed fill-in-the-blank.
   *  3. Fallback if the chunk has no examples -> typed Hanzi recall from Vietnamese meaning.
   */
  private buildAutoExercisesForLesson(
    level: number,
    lessonId: string,
    lessonTitle: string,
    slice: ImportVocabItemDto[],
    stamp: number,
    chunkIdx: number,
  ) {
    const generated: any[] = [];
    const xpReward = level >= 4 ? 25 : 15;
    let exIdx = 0;

    for (const target of slice) {
      const exZh = (target.exampleZh || '').trim();
      const exVi = (target.exampleVi || '').trim();
      const hanzi = (target.hanzi || '').trim();
      const pinyin = (target.pinyin || '').trim();
      const meaning = (target.meaning || '').trim();

      // Priority 1: Bilingual example -> take whole Vietnamese sentence as prompt, whole Chinese sentence as answer (NO options!)
      if (exVi && exZh && /[\u4e00-\u9fff]/.test(exZh) && exZh !== hanzi) {
        generated.push({
          id: `ex_h${level}_${stamp}_${chunkIdx}_tr_${exIdx}`,
          level,
          lessonId,
          exerciseType: 'translate',
          title: `Dịch sang tiếng Trung (${lessonTitle})`,
          question: exVi,
          correctAnswer: exZh,
          explanation: `Từ trọng tâm: ${hanzi}${pinyin ? ` (${pinyin})` : ''}${meaning ? ` — ${meaning}` : ''}`,
          xpReward,
          completed: false,
          order: chunkIdx * 1000 + exIdx,
        });
        exIdx += 1;
        continue;
      }

      // Priority 2: Chinese-only example containing the target word -> typed fill-in-the-blank (NO options)
      if (exZh && hanzi && exZh.includes(hanzi) && exZh.length > hanzi.length + 2) {
        const blankedSentence = exZh.split(hanzi).join(' ____ ');
        generated.push({
          id: `ex_h${level}_${stamp}_${chunkIdx}_fb_${exIdx}`,
          level,
          lessonId,
          exerciseType: 'fill_blank',
          title: `Điền từ còn thiếu (${lessonTitle})`,
          question: blankedSentence,
          correctAnswer: hanzi,
          explanation: `${hanzi}${pinyin ? ` (${pinyin})` : ''}${meaning ? `: ${meaning}` : ''}. Câu gốc: ${exZh}`,
          xpReward,
          completed: false,
          order: chunkIdx * 1000 + exIdx,
        });
        exIdx += 1;
      }
    }

    // Fallback: if no example sentences existed in this slice, build typed-vocab prompts from meanings (NO options)
    if (generated.length === 0) {
      const vocabTargets = slice
        .filter((w) => w.hanzi && w.meaning && !w.meaning.startsWith('Chưa có nghĩa'))
        .slice(0, 15);

      vocabTargets.forEach((target, idx) => {
        generated.push({
          id: `ex_h${level}_${stamp}_${chunkIdx}_wr_${idx}`,
          level,
          lessonId,
          exerciseType: 'writing',
          title: `Nhập từ tiếng Trung theo nghĩa (${lessonTitle})`,
          question: target.meaning!.trim(),
          correctAnswer: target.hanzi.trim(),
          explanation: `${target.hanzi.trim()}${target.pinyin ? ` (${target.pinyin})` : ''} = ${target.meaning!.trim()}`,
          xpReward,
          completed: false,
          order: chunkIdx * 1000 + idx,
        });
      });
    }

    return generated;
  }

  async bulkImport(dto: BulkImportLessonsDto) {
    const { level, baseTitle, splitSize } = dto;
    const words = Array.isArray(dto.words) ? dto.words : [];
    const extractedExercises = Array.isArray(dto.extractedExercises) ? dto.extractedExercises : [];

    if (words.length === 0 && extractedExercises.length === 0) {
      throw new BadRequestException('Cần ít nhất 1 từ vựng hoặc 1 câu bài tập để nhập vào khóa học.');
    }

    const shouldGenerate = dto.autoGenerateExercises !== false;
    const lv = this.hskCollections.getLevel(level);
    const stamp = Date.now();

    const newLessons: any[] = [];
    const newWords: any[] = [];
    const newExercises: any[] = [];
    let totalChunks = 0;

    if (words.length > 0) {
      const chunkSize = splitSize > 0 ? splitSize : words.length;
      totalChunks = Math.ceil(words.length / chunkSize);

      for (let c = 0; c < totalChunks; c++) {
        const slice = words.slice(c * chunkSize, (c + 1) * chunkSize);
        const lessonId = `hsk${level}-doc-${stamp}-${c + 1}`;
        const title =
          totalChunks > 1 ? `${baseTitle} — Phần ${c + 1} (${slice.length} từ)` : baseTitle;

        newLessons.push({
          id: lessonId,
          level,
          title,
          desc: `Tự động trích xuất ${slice.length} từ vựng từ tài liệu tải lên.`,
          fromFile: true,
          order: -(stamp - c),
        });

        slice.forEach((item, i) => {
          newWords.push({
            id: `docw_${stamp}_${c}_${i}`,
            lessonId,
            hanzi: item.hanzi,
            pinyin: item.pinyin || '—',
            hanviet: 'TỪ GIÁO TRÌNH',
            english: item.english || '',
            meaning: item.meaning || 'Từ mới từ file tải lên',
            pos: 'Từ vựng',
            level,
            status: 'new',
            custom: true,
            note: `Nhập từ "${title}".`,
            exampleZh: item.exampleZh || '',
            exampleVi: item.exampleVi || '',
            order: -(stamp - c * 10000 - i),
          });
        });

        if (shouldGenerate) {
          const autoEx = this.buildAutoExercisesForLesson(level, lessonId, title, slice, stamp, c);
          newExercises.push(...autoEx);
        }
      }
    } else if (extractedExercises.length > 0) {
      // Exercise-only file import (0 vocab words): create a clean lesson container for grouping
      totalChunks = 1;
      newLessons.push({
        id: `hsk${level}-ex-${stamp}`,
        level,
        title: baseTitle,
        desc: `Bộ bài tập nhập trực tiếp từ tài liệu (${extractedExercises.length} câu, không kèm từ vựng).`,
        fromFile: true,
        order: -stamp,
      });
    }

    // Add exercises extracted directly from uploaded file:
    // ONLY persist `options` when the uploaded file explicitly contained A/B/C/D choices!
    if (extractedExercises.length > 0) {
      const targetLessonId = newLessons[0]?.id || `hsk${level}-ex-${stamp}`;
      extractedExercises.forEach((ex, idx) => {
        const options = sanitizeExerciseOptions(ex.options);
        const doc: Record<string, any> = {
          id: `ex_doc_h${level}_${stamp}_${idx}`,
          level,
          lessonId: targetLessonId,
          exerciseType: options
            ? 'quiz'
            : ex.exerciseType === 'quiz'
              ? 'writing'
              : ex.exerciseType || 'writing',
          title: ex.title,
          question: ex.question,
          correctAnswer: (ex.correctAnswer || '').trim(),
          explanation:
            ex.explanation ||
            (ex.correctAnswer?.trim()
              ? `Trích xuất từ "${baseTitle}".`
              : `Bài tập từ "${baseTitle}" (chưa có đáp án mẫu trong file).`),
          xpReward: ex.xpReward ?? 20,
          completed: false,
          order: -(stamp - 900000 - idx),
        };
        if (options) {
          doc.options = options;
        }
        newExercises.push(doc);
      });
    }

    const [createdLessonsDocs, createdWordsDocs, createdExercisesDocs, profile] =
      await Promise.all([
        newLessons.length ? lv.lessons.insertMany(newLessons) : Promise.resolve([]),
        newWords.length ? lv.vocab.insertMany(newWords) : Promise.resolve([]),
        newExercises.length ? lv.exercises.insertMany(newExercises) : Promise.resolve([]),
        this.profileService.addXp(30),
      ]);

    const createdLessons = createdLessonsDocs.map((l) => l.toObject());
    const createdWords = createdWordsDocs.map((w) => w.toObject());
    const createdExercises = createdExercisesDocs.map((e) => e.toObject());

    return {
      lessons: createdLessons,
      words: createdWords,
      exercises: createdExercises,
      totalChunks,
      totalWords: createdWords.length,
      totalExercises: createdExercises.length,
      profile,
    };
  }

  async remove(id: string) {
    const found = await this.hskCollections.findLessonById(id);
    if (!found) {
      throw new NotFoundException(`Lesson "${id}" not found`);
    }
    await Promise.all([
      found.models.lessons.deleteOne({ id }).exec(),
      found.models.vocab.deleteMany({ lessonId: id, custom: true }).exec(),
      found.models.exercises.deleteMany({ lessonId: id }).exec(),
    ]);
    return { deleted: true, id };
  }
}
