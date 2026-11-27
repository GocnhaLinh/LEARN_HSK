import { Injectable, NotFoundException } from '@nestjs/common';
import { COURSES_META } from '../../data/seed.data';
import { HskCollectionsService } from '../../database/hsk-collections.service';

@Injectable()
export class CoursesService {
  constructor(private readonly hskCollections: HskCollectionsService) {}

  async getAllCourses() {
    return Promise.all(
      COURSES_META.map(async (course) => {
        const lv = this.hskCollections.getLevel(course.level);
        const [lessonCount, wordCount, exerciseCount] = await Promise.all([
          lv.lessons.countDocuments().exec(),
          lv.vocab.countDocuments().exec(),
          lv.exercises.countDocuments().exec(),
        ]);

        // Skip secondary filtered counts on empty HSK levels
        const [masteredCount, completedExercises] = await Promise.all([
          wordCount > 0 ? lv.vocab.countDocuments({ status: 'mastered' }).exec() : Promise.resolve(0),
          exerciseCount > 0
            ? lv.exercises.countDocuments({ completed: true }).exec()
            : Promise.resolve(0),
        ]);

        const progressPct = wordCount ? Math.round((masteredCount / wordCount) * 100) : 0;

        return {
          ...course,
          lessonCount,
          wordCount,
          masteredCount,
          progressPct,
          exerciseCount,
          completedExercises,
        };
      }),
    );
  }

  async getCourseDetail(level: number) {
    const meta = COURSES_META.find((c) => c.level === level);
    if (!meta) {
      throw new NotFoundException(`HSK course level ${level} not found`);
    }

    const lv = this.hskCollections.getLevel(level);
    const [lessons, words, exercises] = await Promise.all([
      lv.lessons.find().select('-_id -__v').sort({ order: 1, createdAt: -1 }).lean().exec(),
      lv.vocab.find().select('-_id -__v').sort({ order: 1, createdAt: -1 }).lean().exec(),
      lv.exercises.find().select('-_id -__v').sort({ order: 1, createdAt: -1 }).lean().exec(),
    ]);

    const masteredCount = words.filter((w) => w.status === 'mastered').length;
    const completedExercises = exercises.filter((e) => e.completed).length;
    const progressPct = words.length ? Math.round((masteredCount / words.length) * 100) : 0;

    return {
      course: {
        ...meta,
        lessonCount: lessons.length,
        wordCount: words.length,
        masteredCount,
        progressPct,
        exerciseCount: exercises.length,
        completedExercises,
      },
      lessons,
      words,
      exercises,
    };
  }
}
