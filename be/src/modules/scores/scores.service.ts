import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { COURSES_META } from '../../data/seed.data';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { ScoreRecord, ScoreRecordDocument } from '../../schemas/score.schema';
import { CreateScoreDto } from './scores.dto';

@Injectable()
export class ScoresService {
  constructor(
    @InjectModel(ScoreRecord.name) private readonly scoreModel: Model<ScoreRecordDocument>,
    private readonly hskCollections: HskCollectionsService,
  ) {}

  async getOverview(level?: number) {
    const filter = level && level >= 1 && level <= 6 ? { level } : {};
    const [history, summaries] = await Promise.all([
      this.scoreModel.find(filter).sort({ createdAt: -1 }).limit(30).lean().exec(),
      Promise.all(
        this.hskCollections.getAllModels().map(async ({ level: lv, model }) => {
          const [summary, totalWords, masteredWords, totalExercises, completedExercises] =
            await Promise.all([
              model.findOne({ category: 'course_summary', level: lv }).lean().exec(),
              model.countDocuments({ category: 'vocab' }).exec(),
              model.countDocuments({ category: 'vocab', status: 'mastered' }).exec(),
              model.countDocuments({ category: 'exercise' }).exec(),
              model.countDocuments({ category: 'exercise', completed: true }).exec(),
            ]);
          const meta = COURSES_META.find((c) => c.level === lv) || COURSES_META[0];
          return {
            level: lv,
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
          };
        }),
      ),
    ]);

    return {
      byLevel: summaries,
      history,
    };
  }

  async recordScore(dto: CreateScoreDto) {
    const doc = await this.scoreModel.create({
      id: `score_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      level: dto.level,
      mode: dto.mode,
      score: dto.score,
      combo: dto.combo || 0,
      xpEarned: dto.xpEarned || 0,
      detail: dto.detail || '',
      playedAt: new Date().toISOString(),
    });

    if (dto.level >= 1 && dto.level <= 6) {
      const model = this.hskCollections.getModel(dto.level);
      const meta = COURSES_META.find((c) => c.level === dto.level) || COURSES_META[4];
      await model.findOneAndUpdate(
        { category: 'course_summary', level: dto.level },
        {
          $setOnInsert: {
            id: `hsk${dto.level}_summary`,
            category: 'course_summary',
            level: dto.level,
            code: meta.code,
            tier: meta.tier,
            title: meta.title,
            subtitle: meta.subtitle,
            badge: meta.badge,
            color: meta.color,
            emoji: meta.emoji,
            featured: !!meta.featured,
            exercisesCompleted: 0,
            order: 0,
          },
          $inc: {
            xpEarned: dto.xpEarned || 0,
            totalScore: dto.score,
            gamesPlayed: 1,
          },
          $max: {
            highScore: dto.score,
            bestCombo: dto.combo || 0,
          },
        },
        { upsert: true },
      );
    }

    return doc.toObject();
  }
}
