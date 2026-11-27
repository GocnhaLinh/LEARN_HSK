import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { Handwriting, HandwritingDocument } from '../../schemas/handwriting.schema';
import { Note, NoteDocument } from '../../schemas/note.schema';
import { ProfileService } from '../profile/profile.service';
import { ImportBackupDto } from './backup.dto';

@Injectable()
export class BackupService {
  constructor(
    private readonly hskCollections: HskCollectionsService,
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
    @InjectModel(Handwriting.name) private readonly handwritingModel: Model<HandwritingDocument>,
    private readonly profileService: ProfileService,
  ) {}

  async exportData() {
    const allModels = this.hskCollections.getAllModels();
    const [profile, perLevelLessons, perLevelVocab, perLevelExercises, notes, handwriting] =
      await Promise.all([
        this.profileService.getOrCreate(),
        Promise.all(
          allModels.map(({ model }) =>
            model.find({ category: 'lesson' }).sort({ order: 1 }).lean().exec(),
          ),
        ),
        Promise.all(
          allModels.map(({ model }) =>
            model.find({ category: 'vocab' }).sort({ order: 1 }).lean().exec(),
          ),
        ),
        Promise.all(
          allModels.map(({ model }) =>
            model.find({ category: 'exercise' }).sort({ order: 1 }).lean().exec(),
          ),
        ),
        this.noteModel.find().sort({ createdAt: -1 }).lean().exec(),
        this.handwritingModel.find().sort({ createdAt: -1 }).lean().exec(),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      xp: profile.xp,
      streak: profile.streak,
      dailyTarget: profile.dailyTarget,
      weeklyLog: profile.weeklyLog,
      lessons: perLevelLessons.flat(),
      vocab: perLevelVocab.flat(),
      exercises: perLevelExercises.flat(),
      notes,
      handwriting,
    };
  }

  async importData(dto: ImportBackupDto) {
    const profile = await this.profileService.getOrCreate();

    if (typeof dto.xp === 'number') profile.xp = dto.xp;
    if (typeof dto.streak === 'number') profile.streak = dto.streak;
    if (typeof dto.dailyTarget === 'number') {
      profile.dailyTarget = Math.max(5, Math.min(100, dto.dailyTarget));
    }
    if (Array.isArray(dto.weeklyLog) && dto.weeklyLog.length === 7) {
      profile.weeklyLog = dto.weeklyLog;
      profile.markModified('weeklyLog');
    }
    await profile.save();

    if (Array.isArray(dto.lessons) && dto.lessons.length > 0) {
      await Promise.all(
        this.hskCollections.getAllModels().map(async ({ level, model }) => {
          await model.deleteMany({ category: 'lesson' }).exec();
          const lvLessons = dto.lessons!
            .filter((l) => (Number(l.level) || 1) === level)
            .map((l, idx) => ({
              id: l.id,
              category: 'lesson' as const,
              level,
              title: l.title || 'Bài học',
              desc: l.desc || '',
              fromFile: !!l.fromFile,
              order: typeof l.order === 'number' ? l.order : idx + 1,
            }));
          if (lvLessons.length) {
            await model.insertMany(lvLessons, { ordered: false }).catch(() => {});
          }
        }),
      );
    }

    if (Array.isArray(dto.vocab) && dto.vocab.length > 0) {
      await Promise.all(
        this.hskCollections.getAllModels().map(async ({ level, model }) => {
          await model.deleteMany({ category: 'vocab' }).exec();
          const lvVocab = dto.vocab!
            .filter((w) => (Number(w.level) || 1) === level)
            .map((w, idx) => ({
              id: w.id,
              category: 'vocab' as const,
              lessonId: w.lessonId || `hsk${level}-l1`,
              hanzi: w.hanzi,
              pinyin: w.pinyin || '—',
              hanviet: w.hanviet || '',
              english: w.english || '',
              meaning: w.meaning || '',
              pos: w.pos || 'Từ vựng',
              level,
              status: ['mastered', 'learning', 'review', 'new'].includes(w.status)
                ? w.status
                : 'new',
              custom: !!w.custom,
              note: w.note || '',
              exampleZh: w.exampleZh || '',
              exampleVi: w.exampleVi || '',
              order: typeof w.order === 'number' ? w.order : idx + 1,
            }));
          if (lvVocab.length) {
            await model.insertMany(lvVocab, { ordered: false }).catch(() => {});
          }
        }),
      );
    }

    if (Array.isArray(dto.notes)) {
      await this.noteModel.deleteMany({}).exec();
      if (dto.notes.length > 0) {
        const cleanedNotes = dto.notes.map((n, idx) => ({
          id: n.id || `note_${Date.now()}_${idx}`,
          title: n.title || 'Ghi chú',
          tag: n.tag || 'Nhật ký',
          date: n.date || new Date().toLocaleDateString('vi-VN'),
          content: n.content || '',
        }));
        await this.noteModel.insertMany(cleanedNotes, { ordered: false }).catch(() => {});
      }
    }

    return this.exportData();
  }
}
