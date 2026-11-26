import { Injectable, NotFoundException } from '@nestjs/common';
import { COURSES_META } from '../../data/seed.data';
import { HskCollectionsService } from '../../database/hsk-collections.service';

@Injectable()
export class CoursesService {
  constructor(private readonly hskCollections: HskCollectionsService) {}

  async getAllCourses() {
    return Promise.all(
      COURSES_META.map(async (course) => {
        const model = this.hskCollections.getModel(course.level);
        const [summary, lessonCount, wordCount, masteredCount, exerciseCount, completedExercises] =
          await Promise.all([
            model.findOne({ category: 'course_summary', level: course.level }).lean().exec(),
            model.countDocuments({ category: 'lesson' }).exec(),
            model.countDocuments({ category: 'vocab' }).exec(),
            model.countDocuments({ category: 'vocab', status: 'mastered' }).exec(),
            model.countDocuments({ category: 'exercise' }).exec(),
            model.countDocuments({ category: 'exercise', completed: true }).exec(),
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
          xpEarned: summary?.xpEarned || 0,
          totalScore: summary?.totalScore || 0,
          highScore: summary?.highScore || 0,
          bestCombo: summary?.bestCombo || 0,
          gamesPlayed: summary?.gamesPlayed || 0,
        };
      }),
    );
  }

  async getCourseDetail(level: number) {
    const meta = COURSES_META.find((c) => c.level === level);
    if (!meta) {
      throw new NotFoundException(`HSK course level ${level} not found`);
    }

    const model = this.hskCollections.getModel(level);
    const [summary, lessons, words, exercises] = await Promise.all([
      model.findOne({ category: 'course_summary', level }).lean().exec(),
      model.find({ category: 'lesson' }).sort({ order: 1, createdAt: -1 }).lean().exec(),
      model.find({ category: 'vocab' }).sort({ order: 1, createdAt: -1 }).lean().exec(),
      model.find({ category: 'exercise' }).sort({ order: 1, createdAt: -1 }).lean().exec(),
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
        xpEarned: summary?.xpEarned || 0,
        totalScore: summary?.totalScore || 0,
        highScore: summary?.highScore || 0,
        bestCombo: summary?.bestCombo || 0,
        gamesPlayed: summary?.gamesPlayed || 0,
      },
      lessons,
      words,
      exercises,
    };
  }
}
