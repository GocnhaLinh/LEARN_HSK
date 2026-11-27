import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { Handwriting, HandwritingDocument } from '../../schemas/handwriting.schema';
import { Note, NoteDocument } from '../../schemas/note.schema';
import { sanitizeExerciseOptions } from '../../schemas/schema-options';
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
    const allLevels = this.hskCollections.getAllLevels();
    const [profile, perLevelLessons, perLevelVocab, perLevelExercises, notes, handwriting] =
      await Promise.all([
        this.profileService.getOrCreate(),
        Promise.all(
          allLevels.map((lv) => lv.lessons.find().select('-_id -__v').sort({ order: 1 }).lean().exec()),
        ),
        Promise.all(
          allLevels.map((lv) => lv.vocab.find().select('-_id -__v').sort({ order: 1 }).lean().exec()),
        ),
        Promise.all(
          allLevels.map((lv) => lv.exercises.find().select('-_id -__v').sort({ order: 1 }).lean().exec()),
        ),
        this.noteModel.find().select('-_id -__v').sort({ createdAt: -1 }).lean().exec(),
        this.handwritingModel.find().select('-_id -__v').sort({ createdAt: -1 }).lean().exec(),
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
        this.hskCollections.getAllLevels().map(async (lv) => {
          await lv.lessons.deleteMany({}).exec();
          const lvLessons = dto.lessons!
            .filter((l) => (Number(l.level) || 1) === lv.level)
            .map((l, idx) => ({
              id: l.id,
              level: lv.level,
              title: l.title || 'Bài học',
              desc: l.desc || '',
              fromFile: !!l.fromFile,
              order: typeof l.order === 'number' ? l.order : idx + 1,
            }));
          if (lvLessons.length) {
            await lv.lessons.insertMany(lvLessons, { ordered: false }).catch(() => {});
          }
        }),
      );
    }

    if (Array.isArray(dto.vocab) && dto.vocab.length > 0) {
      await Promise.all(
        this.hskCollections.getAllLevels().map(async (lv) => {
          await lv.vocab.deleteMany({}).exec();
          const lvVocab = dto.vocab!
            .filter((w) => (Number(w.level) || 1) === lv.level)
            .map((w, idx) => ({
              id: w.id,
              lessonId: w.lessonId || `hsk${lv.level}-l1`,
              hanzi: w.hanzi,
              pinyin: w.pinyin || '—',
              hanviet: w.hanviet || '',
              english: w.english || '',
              meaning: w.meaning || '',
              pos: w.pos || 'Từ vựng',
              level: lv.level,
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
            await lv.vocab.insertMany(lvVocab, { ordered: false }).catch(() => {});
          }
        }),
      );
    }

    if (Array.isArray(dto.exercises) && dto.exercises.length > 0) {
      const rawExercises = dto.exercises;
      await Promise.all(
        this.hskCollections.getAllLevels().map(async (lv) => {
          await lv.exercises.deleteMany({}).exec();
          const lvExercises = rawExercises
            .filter((ex) => (Number(ex.level) || 1) === lv.level)
            .map((ex, idx) => {
              const options = sanitizeExerciseOptions(ex.options);
              return {
                id: ex.id || `ex_h${lv.level}_imp_${idx}`,
                level: lv.level,
                lessonId: ex.lessonId || `hsk${lv.level}-l1`,
                exerciseType: ['translate', 'fill_blank', 'writing', 'listen', 'quiz'].includes(
                  ex.exerciseType,
                )
                  ? ex.exerciseType
                  : 'translate',
                title: ex.title || 'Bài tập',
                question: ex.question || '',
                ...(options ? { options } : {}),
                correctAnswer: ex.correctAnswer || '',
                explanation: ex.explanation || '',
                xpReward: typeof ex.xpReward === 'number' ? ex.xpReward : 20,
                completed: !!ex.completed,
                order: typeof ex.order === 'number' ? ex.order : idx + 1,
              };
            });
          if (lvExercises.length) {
            await lv.exercises.insertMany(lvExercises, { ordered: false }).catch(() => {});
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
