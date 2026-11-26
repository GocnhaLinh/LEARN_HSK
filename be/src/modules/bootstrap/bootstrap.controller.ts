import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { COURSES_META } from '../../data/seed.data';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { Handwriting, HandwritingDocument } from '../../schemas/handwriting.schema';
import { Note, NoteDocument } from '../../schemas/note.schema';
import { ScoreRecord, ScoreRecordDocument } from '../../schemas/score.schema';
import { ProfileService } from '../profile/profile.service';

@Controller('bootstrap')
export class BootstrapController {
  constructor(
    private readonly hskCollections: HskCollectionsService,
    private readonly profileService: ProfileService,
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
    @InjectModel(Handwriting.name) private readonly handwritingModel: Model<HandwritingDocument>,
    @InjectModel(ScoreRecord.name) private readonly scoreModel: Model<ScoreRecordDocument>,
  ) {}

  /**
   * Single parallel bootstrap endpoint replacing 7 separate startup requests
   * and 48 DB queries with 10 parallel queries + 1 gzipped JSON payload.
   */
  @Get()
  async getBootstrap() {
    const allModels = this.hskCollections.getAllModels();
    const [profileDoc, perLevelDocs, notes, handwriting, history] = await Promise.all([
      this.profileService.getOrCreate(),
      Promise.all(
        allModels.map(async ({ level, model }) => {
          const docs = await model
            .find()
            .select('-_id -__v')
            .sort({ order: 1, createdAt: -1 })
            .lean()
            .exec();
          return { level, docs };
        }),
      ),
      this.noteModel.find().select('-_id -__v').sort({ createdAt: -1 }).lean().exec(),
      this.handwritingModel.find().select('-_id -__v').sort({ createdAt: -1 }).limit(30).lean().exec(),
      this.scoreModel.find().select('-_id -__v').sort({ createdAt: -1 }).limit(30).lean().exec(),
    ]);

    const lessons: any[] = [];
    const vocab: any[] = [];
    const exercises: any[] = [];
    const byLevel: any[] = [];

    for (const { level, docs } of perLevelDocs) {
      let summary: any = null;
      let totalWords = 0;
      let masteredWords = 0;
      let totalExercises = 0;
      let completedExercises = 0;

      for (const d of docs) {
        if (d.category === 'lesson') {
          lessons.push(d);
        } else if (d.category === 'vocab') {
          vocab.push(d);
          totalWords++;
          if (d.status === 'mastered') masteredWords++;
        } else if (d.category === 'exercise') {
          exercises.push(d);
          totalExercises++;
          if (d.completed) completedExercises++;
        } else if (d.category === 'course_summary') {
          summary = d;
        }
      }

      const meta = COURSES_META.find((c) => c.level === level) || COURSES_META[0];
      byLevel.push({
        level,
        code: meta.code,
        title: summary?.title || meta.title,
        emoji: summary?.emoji || meta.emoji,
        xpEarned: summary?.xpEarned || 0,
        totalScore: summary?.totalScore || 0,
        highScore: summary?.highScore || 0,
        bestCombo: summary?.bestCombo || 0,
        gamesPlayed: summary?.gamesPlayed || 0,
        totalWords,
        masteredWords,
        totalExercises,
        completedExercises,
      });
    }

    const profileObj =
      typeof (profileDoc as any).toObject === 'function'
        ? (profileDoc as any).toObject()
        : profileDoc;

    return {
      profile: profileObj,
      lessons,
      vocab,
      exercises,
      scores: { byLevel, history },
      notes,
      handwriting,
    };
  }
}
