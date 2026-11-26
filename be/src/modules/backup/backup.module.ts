import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Handwriting, HandwritingSchema } from '../../schemas/handwriting.schema';
import { Note, NoteSchema } from '../../schemas/note.schema';
import { ScoreRecord, ScoreRecordSchema } from '../../schemas/score.schema';
import { ProfileModule } from '../profile/profile.module';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Note.name, schema: NoteSchema },
      { name: Handwriting.name, schema: HandwritingSchema },
      { name: ScoreRecord.name, schema: ScoreRecordSchema },
    ]),
    ProfileModule,
  ],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
