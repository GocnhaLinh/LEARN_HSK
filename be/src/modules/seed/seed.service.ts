import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { HSK_LEVELS, HskCollectionsService } from '../../database/hsk-collections.service';
import { Handwriting, HandwritingDocument } from '../../schemas/handwriting.schema';
import { Note, NoteDocument } from '../../schemas/note.schema';
import { Profile, ProfileDocument } from '../../schemas/profile.schema';
import { ScoreRecord, ScoreRecordDocument } from '../../schemas/score.schema';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly hskCollections: HskCollectionsService,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
    @InjectModel(Handwriting.name) private readonly handwritingModel: Model<HandwritingDocument>,
    @InjectModel(ScoreRecord.name) private readonly scoreModel: Model<ScoreRecordDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureEmptyCollections();
    } catch (err: any) {
      this.logger.warn(`Collection init skipped: ${err?.message || err}`);
    }
  }

  /**
   * Ensures clean collections HSK1..HSK6 exist in MongoDB (NO mock data inserted).
   */
  async ensureEmptyCollections() {
    if (this.connection.readyState !== 1 || !this.connection.db) return;

    const existing = await this.connection.db.listCollections().toArray();
    const existingNames = new Set(existing.map((c) => c.name));

    const requiredCollections = [
      ...HSK_LEVELS.map((lv) => `HSK${lv}`),
      'profiles',
      'scores',
      'notes',
      'handwriting',
    ];

    for (const name of requiredCollections) {
      if (!existingNames.has(name)) {
        await this.connection.db.createCollection(name).catch(() => {});
      }
    }
  }

  async clearAllData() {
    await Promise.all([
      ...this.hskCollections.getAllModels().map(({ model }) => model.deleteMany({}).exec()),
      this.profileModel.deleteMany({}).exec(),
      this.noteModel.deleteMany({}).exec(),
      this.handwritingModel.deleteMany({}).exec(),
      this.scoreModel.deleteMany({}).exec(),
    ]);
    await this.ensureEmptyCollections();
    return {
      cleared: true,
      message: 'Đã xóa toàn bộ dữ liệu mock, giữ lại cấu trúc collection trống HSK1–HSK6.',
    };
  }
}
