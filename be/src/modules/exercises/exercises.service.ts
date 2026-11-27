import { Injectable, NotFoundException } from '@nestjs/common';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { sanitizeExerciseOptions } from '../../schemas/schema-options';
import { CreateExerciseDto } from './exercises.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly hskCollections: HskCollectionsService) {}

  async findAll(level?: number, lessonId?: string) {
    const query: Record<string, any> = {};
    if (lessonId) query.lessonId = lessonId;

    if (level && level >= 1 && level <= 6) {
      return this.hskCollections
        .getLevel(level)
        .exercises.find(query)
        .select('-_id -__v')
        .sort({ order: 1, createdAt: -1 })
        .lean()
        .exec();
    }

    const perLevel = await Promise.all(
      this.hskCollections.getAllLevels().map((lv) =>
        lv.exercises.find(query).select('-_id -__v').sort({ order: 1, createdAt: -1 }).lean().exec(),
      ),
    );
    return perLevel.flat();
  }

  async create(dto: CreateExerciseDto) {
    const lv = this.hskCollections.getLevel(dto.level);
    const id = `ex_h${dto.level}_${Date.now()}`;
    const options = sanitizeExerciseOptions(dto.options);
    const doc = await lv.exercises.create({
      id,
      level: dto.level,
      lessonId: dto.lessonId || `hsk${dto.level}-l1`,
      exerciseType: options ? 'quiz' : dto.exerciseType || 'writing',
      title: dto.title.trim(),
      question: dto.question.trim(),
      ...(options ? { options } : {}),
      correctAnswer: (dto.correctAnswer || '').trim(),
      explanation: dto.explanation || '',
      xpReward: dto.xpReward ?? 20,
      completed: false,
      order: -Date.now(),
    });
    return doc.toObject();
  }

  async remove(id: string) {
    const found = await this.hskCollections.findExerciseById(id);
    if (!found) {
      throw new NotFoundException(`Exercise "${id}" not found`);
    }
    await found.models.exercises.deleteOne({ id }).exec();
    return { deleted: true, id };
  }
}
