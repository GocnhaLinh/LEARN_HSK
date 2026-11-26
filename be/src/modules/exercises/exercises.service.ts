import { Injectable, NotFoundException } from '@nestjs/common';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { ProfileService } from '../profile/profile.service';
import { CreateExerciseDto, SubmitExerciseDto } from './exercises.dto';

@Injectable()
export class ExercisesService {
  constructor(
    private readonly hskCollections: HskCollectionsService,
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

    let profile = null;
    let updatedExercise = exercise;
    let xpEarned = 0;
    let alreadyCompleted = !!exercise.completed;

    if (correct) {
      // Atomic conditional update: only the very first completion claims XP & score
      const claimed = await found.model
        .findOneAndUpdate(
          { id, category: 'exercise', completed: { $ne: true } },
          { $set: { completed: true } },
          { new: true },
        )
        .lean()
        .exec();

      if (claimed) {
        updatedExercise = claimed;
        xpEarned = xpReward;
        alreadyCompleted = false;

        // Upsert per-HSK exercise completion count in HSK{level} (without writing to `scores` collection)
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
              exercisesCompleted: 1,
            },
          },
          { upsert: true },
        );

        profile = await this.profileService.recordReview(xpReward, false);
      } else {
        alreadyCompleted = true;
      }
    }

    return {
      correct,
      alreadyCompleted,
      correctAnswer: exercise.correctAnswer,
      explanation: exercise.explanation || '',
      xpEarned,
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
