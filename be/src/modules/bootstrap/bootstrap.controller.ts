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
   * Single parallel bootstrap endpoint replacing separate startup requests
   * with 9 parallel queries + 1 gzipped JSON payload.
   */
  @Get()
  async getBootstrap() {
    const allModels = this.hskCollections.getAllModels();
    const [profileDoc, perLevelDocs, notes, handwriting] = await Promise.all([
      this.profileService.getOrCreate(),
      Promise.all(
        allModels.map(async ({ level, model }) => {
          const docs = await model
            .find()
            .select('-_id -__v')
            .sort({ order: 1, createdAt: -1 })
            .lean()
            .exec();
          return { level, docs };
        }),
      ),
      this.noteModel.find().select('-_id -__v').sort({ createdAt: -1 }).lean().exec(),
      this.handwritingModel.find().select('-_id -__v').sort({ createdAt: -1 }).limit(30).lean().exec(),
    ]);

    const lessons: any[] = [];
    const vocab: any[] = [];
    const exercises: any[] = [];

    for (const { docs } of perLevelDocs) {
      for (const d of docs) {
        if (d.category === 'lesson') {
          lessons.push(d);
        } else if (d.category === 'vocab') {
          vocab.push(d);
        } else if (d.category === 'exercise') {
          exercises.push(d);
        }
      }
    }

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
