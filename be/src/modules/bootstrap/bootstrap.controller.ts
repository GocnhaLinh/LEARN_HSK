import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { Handwriting, HandwritingDocument } from '../../schemas/handwriting.schema';
import { Note, NoteDocument } from '../../schemas/note.schema';
import { ProfileService } from '../profile/profile.service';

@Controller('bootstrap')
export class BootstrapController {
  constructor(
    private readonly hskCollections: HskCollectionsService,
    private readonly profileService: ProfileService,
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
    @InjectModel(Handwriting.name) private readonly handwritingModel: Model<HandwritingDocument>,
  ) {}

  /**
   * Single parallel bootstrap endpoint loading profile/notes/handwriting from App DB
   * and separate lessons/vocab/exercises collections from HSK1..HSK6 databases.
   */
  @Get()
  async getBootstrap() {
    const allLevels = this.hskCollections.getAllLevels();

    const [profileDoc, perLevelData, notes, handwriting] = await Promise.all([
      this.profileService.getOrCreate(),
      Promise.all(
        allLevels.map(async (lv) => {
          const [lessons, vocab, exercises] = await Promise.all([
            lv.lessons.find().select('-_id -__v').sort({ order: 1, createdAt: -1 }).lean().exec(),
            lv.vocab.find().select('-_id -__v').sort({ order: 1, createdAt: -1 }).lean().exec(),
            lv.exercises.find().select('-_id -__v').sort({ order: 1, createdAt: -1 }).lean().exec(),
          ]);
          return { lessons, vocab, exercises };
        }),
      ),
      this.noteModel.find().select('-_id -__v').sort({ createdAt: -1 }).lean().exec(),
      this.handwritingModel
        .find()
        .select('-_id -__v')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean()
        .exec(),
    ]);

    const lessons = perLevelData.flatMap((d) => d.lessons);
    const vocab = perLevelData.flatMap((d) => d.vocab);
    const exercises = perLevelData.flatMap((d) => d.exercises);

    const profileObj =
      typeof (profileDoc as any).toObject === 'function'
        ? (profileDoc as any).toObject()
        : profileDoc;

    return {
      profile: profileObj,
      lessons,
      vocab,
      exercises,
      notes,
      handwriting,
    };
  }
}
