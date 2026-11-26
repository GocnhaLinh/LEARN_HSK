import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Note, NoteSchema } from '../../schemas/note.schema';
import { ProfileModule } from '../profile/profile.module';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Note.name, schema: NoteSchema }]),
    ProfileModule,
  ],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
