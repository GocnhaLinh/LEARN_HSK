import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Handwriting, HandwritingSchema } from '../../schemas/handwriting.schema';
import { Note, NoteSchema } from '../../schemas/note.schema';
import { Profile, ProfileSchema } from '../../schemas/profile.schema';
import { ScoreRecord, ScoreRecordSchema } from '../../schemas/score.schema';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: Note.name, schema: NoteSchema },
      { name: Handwriting.name, schema: HandwritingSchema },
      { name: ScoreRecord.name, schema: ScoreRecordSchema },
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
