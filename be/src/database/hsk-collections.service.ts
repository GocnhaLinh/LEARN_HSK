import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Exam, ExamSchema } from '../schemas/exam.schema';
import { Exercise, ExerciseSchema } from '../schemas/exercise.schema';
import { Lesson, LessonSchema } from '../schemas/lesson.schema';
import { Vocab, VocabSchema } from '../schemas/vocab.schema';

export const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export const HSK_LEVEL_COLLECTIONS = ['lessons', 'vocab', 'exercises', 'exams'] as const;
export const APP_COLLECTIONS = ['profiles', 'notes', 'handwriting'] as const;

export type HskCollectionKey = (typeof HSK_LEVEL_COLLECTIONS)[number];

export interface HskLevelModels {
  level: number;
  dbName: string;
  lessons: Model<Lesson>;
  vocab: Model<Vocab>;
  exercises: Model<Exercise>;
  exams: Model<Exam>;
}

const LEVEL_ID_HINT_REGEX = /(?:^|_)h(?:sk)?([1-6])(?=[_-])/i;

function inferLevelFromId(id: string): number | null {
  const match = LEVEL_ID_HINT_REGEX.exec(id || '');
  return match ? Number(match[1]) : null;
}

/**
 * Multi-database HSK registry sharing a single Mongoose connection pool (`useDb(..., { useCache: true })`):
 *  - Default app database (`HSK`): `profiles`, `notes`, `handwriting`
 *  - Per-level databases (`HSK1` .. `HSK6`): separate `lessons`, `vocab`, `exercises` collections
 */
@Injectable()
export class HskCollectionsService implements OnModuleInit {
  private readonly logger = new Logger('MongoDB');
  private readonly levels = new Map<number, HskLevelModels>();
  private loggedOnce = false;
  private initializedStructure = false;
  private initPromise: Promise<void> | null = null;

  constructor(@InjectConnection() private readonly connection: Connection) {
    for (const lv of HSK_LEVELS) {
      const dbName = `HSK${lv}`;
      const levelConn = this.connection.useDb(dbName, { useCache: true });

      const lessons =
        (levelConn.models.Lesson as Model<Lesson> | undefined) ||
        levelConn.model<Lesson>('Lesson', LessonSchema, 'lessons');
      const vocab =
        (levelConn.models.Vocab as Model<Vocab> | undefined) ||
        levelConn.model<Vocab>('Vocab', VocabSchema, 'vocab');
      const exercises =
        (levelConn.models.Exercise as Model<Exercise> | undefined) ||
        levelConn.model<Exercise>('Exercise', ExerciseSchema, 'exercises');
      const exams =
        (levelConn.models.Exam as Model<Exam> | undefined) ||
        levelConn.model<Exam>('Exam', ExamSchema, 'exams');

      this.levels.set(lv, { level: lv, dbName, lessons, vocab, exercises, exams });
    }

    this.connection.on('connected', () => {
      this.logConnected();
      if (!this.initializedStructure) {
        void this.ensureAllDatabasesAndCollections();
      }
    });
    this.connection.on('error', (err) => {
      this.logger.error(`MongoDB connection error: ${err?.message || err}`);
    });
    this.connection.on('disconnected', () => {
      this.logger.warn('MongoDB disconnected');
    });
  }

  async onModuleInit() {
    if (this.connection.readyState === 1) {
      this.logConnected();
      await this.ensureAllDatabasesAndCollections();
    }
  }

  private logConnected() {
    if (this.loggedOnce) return;
    this.loggedOnce = true;
    const appDbName = this.connection.name || 'HSK';
    const host = this.connection.host || 'MongoDB Atlas';
    console.log('');
    console.log('======================================================================');
    console.log('✅ You successfully connected to MongoDB Atlas!');
    console.log(`📦 App DB     : ${appDbName} (${host}) -> [${APP_COLLECTIONS.join(', ')}]`);
    console.log(
      `📚 HSK DBs    : HSK1..HSK6 -> each has separate [${HSK_LEVEL_COLLECTIONS.join(', ')}]`,
    );
    console.log('======================================================================');
    console.log('');
  }

  getLevel(level: number): HskLevelModels {
    const safeLv = Math.min(6, Math.max(1, Number(level) || 5));
    return this.levels.get(safeLv)!;
  }

  getAllLevels(): HskLevelModels[] {
    return HSK_LEVELS.map((lv) => this.levels.get(lv)!);
  }

  async ensureAllDatabasesAndCollections(force = false): Promise<void> {
    if (this.connection.readyState !== 1) return;
    if (this.initializedStructure && !force) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const client = this.connection.getClient();

        // 1. Ensure default app database collections (profiles, notes, handwriting)
        const appDb = this.connection.db || client.db(this.connection.name || 'HSK');
        const existingAppCols = new Set(
          (await appDb.listCollections().toArray()).map((c) => c.name),
        );
        for (const colName of APP_COLLECTIONS) {
          if (!existingAppCols.has(colName)) {
            await appDb.createCollection(colName).catch(() => {});
          }
        }

        // 2. Sequentially ensure HSK1..HSK6 databases, collections, and schema indexes
        //    (avoids TLS handshake bursts on Atlas M0 free-tier clusters)
        for (const lv of HSK_LEVELS) {
          const levelDb = client.db(`HSK${lv}`);
          const existingCols = new Set(
            (await levelDb.listCollections().toArray()).map((c) => c.name),
          );
          for (const colName of HSK_LEVEL_COLLECTIONS) {
            if (!existingCols.has(colName)) {
              await levelDb.createCollection(colName).catch(() => {});
            }
          }

          const models = this.levels.get(lv)!;
          await models.lessons.createIndexes().catch(() => {});
          await models.vocab.createIndexes().catch(() => {});
          await models.exercises.createIndexes().catch(() => {});
          await models.exams.createIndexes().catch(() => {});
        }

        this.initializedStructure = true;
      } catch (err: any) {
        this.logger.warn(`Database structure init skipped: ${err?.message || err}`);
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  async listHskDatabaseCollections(): Promise<Record<string, string[]>> {
    const summary: Record<string, string[]> = {};
    if (this.connection.readyState !== 1) return summary;
    const client = this.connection.getClient();
    for (const lv of HSK_LEVELS) {
      const dbName = `HSK${lv}`;
      const cols = await client.db(dbName).listCollections().toArray();
      summary[dbName] = cols.map((c) => c.name).sort();
    }
    return summary;
  }

  /**
   * Generic cross-database lookup by `id` with O(1) prefix-hint fast path
   * (e.g. `hsk5-...` or `ex_h5_...` checks HSK5 first before scanning other levels).
   */
  async findAcrossLevels(
    collection: HskCollectionKey,
    id: string,
  ): Promise<{ level: number; models: HskLevelModels; doc: any } | null> {
    const hintedLevel = inferLevelFromId(id);
    if (hintedLevel) {
      const hintedModels = this.getLevel(hintedLevel);
      const hintedDoc = await (hintedModels[collection] as Model<any>)
        .findOne({ id })
        .select('-_id -__v')
        .lean()
        .exec();
      if (hintedDoc) {
        return { level: hintedLevel, models: hintedModels, doc: hintedDoc };
      }
    }

    const remaining = this.getAllLevels().filter((m) => m.level !== hintedLevel);
    const results = await Promise.all(
      remaining.map(async (models) => {
        const doc = await (models[collection] as Model<any>)
          .findOne({ id })
          .select('-_id -__v')
          .lean()
          .exec();
        return doc ? { level: models.level, models, doc } : null;
      }),
    );
    return results.find(Boolean) || null;
  }

  findLessonById(id: string) {
    return this.findAcrossLevels('lessons', id);
  }

  findVocabById(id: string) {
    return this.findAcrossLevels('vocab', id);
  }

  findExerciseById(id: string) {
    return this.findAcrossLevels('exercises', id);
  }

  findExamById(id: string) {
    return this.findAcrossLevels('exams', id);
  }
}
