import { Injectable, NotFoundException } from '@nestjs/common';
import { COURSES_META } from '../../data/seed.data';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { ProfileService } from '../profile/profile.service';
import { BulkImportLessonsDto, CreateLessonDto, ImportVocabItemDto } from './lessons.dto';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

@Injectable()
export class LessonsService {
  constructor(
    private readonly hskCollections: HskCollectionsService,
    private readonly profileService: ProfileService,
  ) {}

  async findAll(level?: number) {
    if (level && level >= 1 && level <= 6) {
      return this.hskCollections
        .getModel(level)
        .find({ category: 'lesson' })
        .sort({ order: 1, createdAt: -1 })
        .lean()
        .exec();
    }

    const perLevel = await Promise.all(
      this.hskCollections.getAllModels().map(({ model }) =>
        model.find({ category: 'lesson' }).sort({ order: 1, createdAt: -1 }).lean().exec(),
      ),
    );
    return perLevel.flat();
  }

  async findOne(id: string) {
    const found = await this.hskCollections.findByIdAcrossLevels(id, 'lesson');
    if (!found) {
      throw new NotFoundException(`Lesson "${id}" not found`);
    }
    const [words, exercises] = await Promise.all([
      found.model.find({ category: 'vocab', lessonId: id }).sort({ order: 1 }).lean().exec(),
      found.model.find({ category: 'exercise', lessonId: id }).sort({ order: 1 }).lean().exec(),
    ]);
    return { lesson: found.doc, words, exercises };
  }

  async create(dto: CreateLessonDto) {
    const model = this.hskCollections.getModel(dto.level);
    const id = dto.id || `hsk${dto.level}-custom-${Date.now()}`;
    const doc = await model.create({
      id,
      category: 'lesson',
      level: dto.level,
      title: dto.title,
      desc: dto.desc || '',
      fromFile: !!dto.fromFile,
      order: -Date.now(),
    });
    return doc.toObject();
  }

  private buildAutoExercisesForLesson(
    level: number,
    lessonId: string,
    lessonTitle: string,
    slice: ImportVocabItemDto[],
    stamp: number,
    chunkIdx: number,
  ) {
    if (slice.length < 2) return [];
    const generated: any[] = [];
    const xpReward = level >= 4 ? 25 : 15;

    // 1. Fill-in-the-blank from real Chinese example sentences containing the target Hanzi
    const withBlankableExample = slice.filter(
      (w) => w.exampleZh && w.exampleZh.includes(w.hanzi) && w.exampleZh.length > w.hanzi.length + 2,
    );

    const blankTargets = withBlankableExample.slice(0, 3);
    blankTargets.forEach((target, idx) => {
      const distractors = shuffle(slice.filter((w) => w.hanzi !== target.hanzi))
        .slice(0, 3)
        .map((w) => w.hanzi);
      const options = shuffle([target.hanzi, ...distractors]);
      const blankedSentence = target.exampleZh!.split(target.hanzi).join(' ____ ');

      generated.push({
        id: `ex_h${level}_${stamp}_${chunkIdx}_fb_${idx}`,
        category: 'exercise',
        level,
        lessonId,
        exerciseType: 'fill_blank',
        title: `Điền từ vào câu (${lessonTitle})`,
        question: target.exampleVi
          ? `${blankedSentence} (${target.exampleVi})`
          : blankedSentence,
        options,
        correctAnswer: target.hanzi,
        explanation: `${target.hanzi} (${target.pinyin || '—'}): ${target.meaning || ''}. Câu gốc: ${target.exampleZh}`,
        xpReward,
        completed: false,
        order: chunkIdx * 100 + idx,
      });
    });

    // 2. Meaning + Pinyin multiple-choice quiz from imported vocab
    const quizTargets = slice.filter((w) => w.meaning && w.meaning !== 'Chưa có nghĩa').slice(0, 2);
    quizTargets.forEach((target, idx) => {
      const distractors = shuffle(
        slice.filter((w) => w.hanzi !== target.hanzi && w.meaning),
      )
        .slice(0, 3)
        .map((w) => `${w.meaning}${w.pinyin ? ` (${w.pinyin})` : ''}`);
      const correctOption = `${target.meaning}${target.pinyin ? ` (${target.pinyin})` : ''}`;
      if (distractors.length < 1) return;

      generated.push({
        id: `ex_h${level}_${stamp}_${chunkIdx}_qz_${idx}`,
        category: 'exercise',
        level,
        lessonId,
        exerciseType: 'quiz',
        title: `Trắc nghiệm từ vựng HSK ${level}`,
        question: `Từ "${target.hanzi}" có nghĩa tiếng Việt & Pinyin nào đúng nhất?`,
        options: shuffle([correctOption, ...distractors]),
        correctAnswer: correctOption,
        explanation: `${target.hanzi} (${target.pinyin || '—'}) = ${target.meaning}${target.exampleZh ? ` — VD: ${target.exampleZh}` : ''}`,
        xpReward,
        completed: false,
        order: chunkIdx * 100 + 20 + idx,
      });
    });

    // 3. Bilingual sentence translation quiz if both exampleZh and exampleVi exist
    const withBilingual = slice.filter(
      (w) => w.exampleZh && w.exampleVi && w.exampleZh.length >= 6 && w.exampleVi.length >= 8,
    );
    if (withBilingual.length >= 4) {
      const target = withBilingual[withBilingual.length - 1];
      const distractors = shuffle(withBilingual.filter((w) => w.hanzi !== target.hanzi))
        .slice(0, 3)
        .map((w) => w.exampleVi!);
      generated.push({
        id: `ex_h${level}_${stamp}_${chunkIdx}_tr_0`,
        category: 'exercise',
        level,
        lessonId,
        exerciseType: 'translate',
        title: `Đọc hiểu câu ví dụ HSK ${level}`,
        question: `Chọn bản dịch tiếng Việt đúng cho câu: "${target.exampleZh}"`,
        options: shuffle([target.exampleVi!, ...distractors]),
        correctAnswer: target.exampleVi!,
        explanation: `Từ khóa trọng tâm: ${target.hanzi} (${target.pinyin || '—'}) — ${target.meaning || ''}`,
        xpReward: xpReward + 5,
        completed: false,
        order: chunkIdx * 100 + 40,
      });
    }

    return generated;
  }

  async bulkImport(dto: BulkImportLessonsDto) {
    const { level, baseTitle, splitSize, words } = dto;
    const shouldGenerate = dto.autoGenerateExercises !== false;
    const model = this.hskCollections.getModel(level);
    const meta = COURSES_META.find((c) => c.level === level) || COURSES_META[4];

    const chunkSize = splitSize > 0 ? splitSize : words.length;
    const totalChunks = Math.ceil(words.length / chunkSize);
    const stamp = Date.now();

    const newLessons: any[] = [];
    const newWords: any[] = [];
    const newExercises: any[] = [];

    for (let c = 0; c < totalChunks; c++) {
      const slice = words.slice(c * chunkSize, (c + 1) * chunkSize);
      const lessonId = `hsk${level}-doc-${stamp}-${c + 1}`;
      const title =
        totalChunks > 1 ? `${baseTitle} — Phần ${c + 1} (${slice.length} từ)` : baseTitle;

      newLessons.push({
        id: lessonId,
        category: 'lesson',
        level,
        title,
        desc: `Tự động trích xuất ${slice.length} từ vựng từ tài liệu tải lên.`,
        fromFile: true,
        order: -(stamp - c),
      });

      slice.forEach((item, i) => {
        newWords.push({
          id: `docw_${stamp}_${c}_${i}`,
          category: 'vocab',
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
          exampleZh: item.exampleZh || item.hanzi,
          exampleVi: item.exampleVi || item.meaning || item.hanzi,
          order: -(stamp - c * 10000 - i),
        });
      });

      if (shouldGenerate) {
        const autoEx = this.buildAutoExercisesForLesson(level, lessonId, title, slice, stamp, c);
        newExercises.push(...autoEx);
      }
    }

    // Also include explicit Q&A exercises extracted directly from PDF/DOCX if present
    if (Array.isArray(dto.extractedExercises) && dto.extractedExercises.length > 0) {
      const firstLessonId = newLessons[0]?.id || `hsk${level}-doc-${stamp}-1`;
      dto.extractedExercises.forEach((ex, idx) => {
        newExercises.push({
          id: `ex_doc_h${level}_${stamp}_${idx}`,
          category: 'exercise',
          level,
          lessonId: firstLessonId,
          exerciseType: ex.exerciseType || 'quiz',
          title: ex.title,
          question: ex.question,
          options: ex.options,
          correctAnswer: ex.correctAnswer,
          explanation: ex.explanation || `Trích xuất trực tiếp từ "${baseTitle}".`,
          xpReward: ex.xpReward ?? 20,
          completed: false,
          order: -(stamp - 900000 - idx),
        });
      });
    }

    const [createdDocs, profile] = await Promise.all([
      model.insertMany([...newLessons, ...newWords, ...newExercises]),
      this.profileService.addXp(30),
    ]);

    // Upsert course_summary in HSK{level}
    await model.findOneAndUpdate(
      { category: 'course_summary', level },
      {
        $setOnInsert: {
          id: `hsk${level}_summary`,
          category: 'course_summary',
          level,
          code: meta.code,
          tier: meta.tier,
          title: meta.title,
          subtitle: meta.subtitle,
          badge: meta.badge,
          color: meta.color,
          emoji: meta.emoji,
          featured: !!meta.featured,
          totalScore: 0,
          highScore: 0,
          bestCombo: 0,
          gamesPlayed: 0,
          exercisesCompleted: 0,
          order: 0,
        },
        $inc: { xpEarned: 30 },
      },
      { upsert: true },
    );

    const createdLessons = createdDocs
      .filter((d) => d.category === 'lesson')
      .map((l) => l.toObject());
    const createdWords = createdDocs
      .filter((d) => d.category === 'vocab')
      .map((w) => w.toObject());
    const createdExercises = createdDocs
      .filter((d) => d.category === 'exercise')
      .map((e) => e.toObject());

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
    const found = await this.hskCollections.findByIdAcrossLevels(id, 'lesson');
    if (!found) {
      throw new NotFoundException(`Lesson "${id}" not found`);
    }
    await Promise.all([
      found.model.deleteOne({ id, category: 'lesson' }).exec(),
      found.model.deleteMany({ category: 'vocab', lessonId: id, custom: true }).exec(),
      found.model.deleteMany({ category: 'exercise', lessonId: id }).exec(),
    ]);
    return { deleted: true, id };
  }
}
