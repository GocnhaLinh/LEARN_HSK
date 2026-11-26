import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { ScoreRecord, ScoreRecordDocument } from '../../schemas/score.schema';
import { ProfileService } from '../profile/profile.service';
import { CreateExerciseDto, SubmitExerciseDto } from './exercises.dto';

@Injectable()
export class ExercisesService {
  constructor(
    private readonly hskCollections: HskCollectionsService,
    @InjectModel(ScoreRecord.name) private readonly scoreModel: Model<ScoreRecordDocument>,
    private readonly profileService: ProfileService,
  ) {}

  async findAll(level?: number, lessonId?: string) {
    const query: Record<string, any> = { category: 'exercise' };
    if (lessonId) query.lessonId = lessonId;

    if (level && level >= 1 && level <= 6) {
      return this.hskCollections
        .getModel(level)
        .find(query)
        .sort({ order: 1, createdAt: -1 })
        .lean()
        .exec();
    }

    const perLevel = await Promise.all(
      this.hskCollections.getAllModels().map(({ model }) =>
        model.find(query).sort({ order: 1, createdAt: -1 }).lean().exec(),
      ),
    );
    return perLevel.flat();
  }

  async create(dto: CreateExerciseDto) {
    const model = this.hskCollections.getModel(dto.level);
    const id = `ex_h${dto.level}_${Date.now()}`;
    const doc = await model.create({
      id,
      category: 'exercise',
      level: dto.level,
      lessonId: dto.lessonId || `hsk${dto.level}-l1`,
      exerciseType: dto.exerciseType,
      title: dto.title.trim(),
      question: dto.question.trim(),
      options: dto.options,
      correctAnswer: dto.correctAnswer,
      explanation: dto.explanation || '',
      xpReward: dto.xpReward ?? 20,
      completed: false,
      order: -Date.now(),
    });
    return doc.toObject();
  }

  async submit(id: string, dto: SubmitExerciseDto) {
    const found = await this.hskCollections.findByIdAcrossLevels(id, 'exercise');
    if (!found) {
      throw new NotFoundException(`Exercise "${id}" not found`);
    }

    const exercise = found.doc;
    const correct = dto.answer.trim() === String(exercise.correctAnswer || '').trim();
    const xpReward = exercise.xpReward || 20;
    const scorePoints = correct ? xpReward : 0;

    let profile = null;
    let updatedExercise = exercise;

    if (correct) {
      const alreadyDone = !!exercise.completed;
      updatedExercise = await found.model
        .findOneAndUpdate({ id, category: 'exercise' }, { $set: { completed: true } }, { new: true })
        .lean()
        .exec();

      // Upsert per-HSK course_summary competition stats in HSK{level}
      await found.model.findOneAndUpdate(
        { category: 'course_summary', level: found.level },
        {
          $setOnInsert: {
            id: `hsk${found.level}_summary`,
            category: 'course_summary',
            level: found.level,
            code: `HSK ${found.level}`,
            order: 0,
          },
          $inc: {
            xpEarned: xpReward,
            totalScore: scorePoints,
            exercisesCompleted: alreadyDone ? 0 : 1,
          },
        },
        { upsert: true },
      );

      // Record into global scores collection
      await this.scoreModel.create({
        id: `score_ex_${Date.now()}`,
        level: found.level,
        mode: 'exercise',
        score: scorePoints,
        combo: 1,
        xpEarned: xpReward,
        detail: `Hoàn thành bài tập: ${exercise.title}`,
        playedAt: new Date().toISOString(),
      });

      profile = await this.profileService.recordReview(xpReward, false);
    }

    return {
      correct,
      correctAnswer: exercise.correctAnswer,
      explanation: exercise.explanation || '',
      xpEarned: correct ? xpReward : 0,
      exercise: updatedExercise,
      profile,
    };
  }

  async remove(id: string) {
    const found = await this.hskCollections.findByIdAcrossLevels(id, 'exercise');
    if (!found) {
      throw new NotFoundException(`Exercise "${id}" not found`);
    }
    await found.model.deleteOne({ id, category: 'exercise' }).exec();
    return { deleted: true, id };
  }
}
