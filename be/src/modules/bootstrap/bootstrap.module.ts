import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Handwriting, HandwritingSchema } from '../../schemas/handwriting.schema';
import { Note, NoteSchema } from '../../schemas/note.schema';
import { ProfileModule } from '../profile/profile.module';
import { BootstrapController } from './bootstrap.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Note.name, schema: NoteSchema },
      { name: Handwriting.name, schema: HandwritingSchema },
    ]),
    ProfileModule,
  ],
  controllers: [BootstrapController],
})
export class BootstrapModule {}
