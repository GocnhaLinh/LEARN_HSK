import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { Handwriting, HandwritingDocument } from '../../schemas/handwriting.schema';
import { Note, NoteDocument } from '../../schemas/note.schema';
import { Profile, ProfileDocument } from '../../schemas/profile.schema';

@Injectable()
export class SeedService {
  constructor(
    private readonly hskCollections: HskCollectionsService,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
    @InjectModel(Handwriting.name) private readonly handwritingModel: Model<HandwritingDocument>,
  ) {}

  async clearAllData() {
    await Promise.all([
      ...this.hskCollections.getAllLevels().flatMap((lv) => [
        lv.lessons.deleteMany({}).exec(),
        lv.vocab.deleteMany({}).exec(),
        lv.exercises.deleteMany({}).exec(),
      ]),
      this.profileModel.deleteMany({}).exec(),
      this.noteModel.deleteMany({}).exec(),
      this.handwritingModel.deleteMany({}).exec(),
    ]);
    await this.hskCollections.ensureAllDatabasesAndCollections(true);
    return {
      cleared: true,
      message:
        'Đã xóa toàn bộ dữ liệu và giữ lại cấu trúc database trống HSK1–HSK6 (lessons, vocab, exercises).',
    };
  }
}
