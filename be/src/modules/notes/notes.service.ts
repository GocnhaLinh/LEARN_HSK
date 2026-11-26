import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from '../../schemas/note.schema';
import { ProfileService } from '../profile/profile.service';
import { CreateNoteDto, UpdateNoteDto } from './notes.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
    private readonly profileService: ProfileService,
  ) {}

  async findAll(tag?: string) {
    const filter = tag && tag !== 'all' ? { tag } : {};
    return this.noteModel.find(filter).sort({ createdAt: -1 }).lean().exec();
  }

  async findOne(id: string) {
    const note = await this.noteModel.findOne({ id }).lean().exec();
    if (!note) throw new NotFoundException(`Note "${id}" not found`);
    return note;
  }

  async create(dto: CreateNoteDto) {
    const doc = await this.noteModel.create({
      id: `note_${Date.now()}`,
      title: dto.title.trim(),
      tag: dto.tag || 'Nhật ký',
      content: dto.content.trim(),
      date: dto.date || new Date().toLocaleDateString('vi-VN'),
    });
    const profile = await this.profileService.addXp(10);
    return { note: doc.toObject(), profile };
  }

  async update(id: string, dto: UpdateNoteDto) {
    const updated = await this.noteModel
      .findOneAndUpdate({ id }, { $set: dto }, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException(`Note "${id}" not found`);
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.noteModel.findOneAndDelete({ id }).lean().exec();
    if (!deleted) throw new NotFoundException(`Note "${id}" not found`);
    return { deleted: true, id };
  }
}
