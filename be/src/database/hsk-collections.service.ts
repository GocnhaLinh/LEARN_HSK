import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { HskItem, HskItemSchema } from '../schemas/hsk-item.schema';

export const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const;

@Injectable()
export class HskCollectionsService implements OnModuleInit {
  private readonly logger = new Logger('MongoDB');
  private readonly models = new Map<number, Model<HskItem>>();

  constructor(@InjectConnection() private readonly connection: Connection) {
    for (const lv of HSK_LEVELS) {
      const colName = `HSK${lv}`;
      const existing = this.connection.models[colName] as Model<HskItem> | undefined;
      this.models.set(
        lv,
        existing || this.connection.model<HskItem>(colName, HskItemSchema, colName),
      );
    }

    this.connection.on('connected', () => {
      this.logConnected();
    });
    this.connection.on('error', (err) => {
      this.logger.error(`MongoDB connection error: ${err?.message || err}`);
    });
    this.connection.on('disconnected', () => {
      this.logger.warn('MongoDB disconnected');
    });
  }

  onModuleInit() {
    if (this.connection.readyState === 1) {
      this.logConnected();
    }
  }

  private loggedOnce = false;
  private logConnected() {
    if (this.loggedOnce) return;
    this.loggedOnce = true;
    const dbName = this.connection.name || 'HSK';
    const host = this.connection.host || 'MongoDB Atlas';
    console.log('');
    console.log('======================================================================');
    console.log('✅ You successfully connected to MongoDB Atlas!');
    console.log(`📦 Database   : ${dbName} (${host})`);
    console.log('📚 Collections: HSK1, HSK2, HSK3, HSK4, HSK5, HSK6, profiles, scores, notes, handwriting');
    console.log('======================================================================');
    console.log('');
  }

  getModel(level: number): Model<HskItem> {
    const safeLv = Math.min(6, Math.max(1, Number(level) || 5));
    return this.models.get(safeLv)!;
  }

  getAllModels(): Array<{ level: number; name: string; model: Model<HskItem> }> {
    return HSK_LEVELS.map((level) => ({
      level,
      name: `HSK${level}`,
      model: this.models.get(level)!,
    }));
  }

  async findByIdAcrossLevels(
    id: string,
    category?: 'course_summary' | 'lesson' | 'vocab' | 'exercise',
  ): Promise<{ level: number; model: Model<HskItem>; doc: any } | null> {
    const query = category ? { id, category } : { id };
    const results = await Promise.all(
      HSK_LEVELS.map(async (level) => {
        const model = this.models.get(level)!;
        const doc = await model.findOne(query).lean().exec();
        return doc ? { level, model, doc } : null;
      }),
    );
    return results.find(Boolean) || null;
  }
}
