import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Handwriting, HandwritingDocument } from '../../schemas/handwriting.schema';
import { ProfileService } from '../profile/profile.service';
import { CreateHandwritingDto } from './handwriting.dto';

@Injectable()
export class HandwritingService {
  constructor(
    @InjectModel(Handwriting.name)
    private readonly handwritingModel: Model<HandwritingDocument>,
    private readonly profileService: ProfileService,
  ) {}

  async findAll() {
    return this.handwritingModel.find().sort({ createdAt: -1 }).limit(30).lean().exec();
  }

  async create(dto: CreateHandwritingDto) {
    const caption =
      (dto.caption || '').trim() ||
      `Bài viết ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const doc = await this.handwritingModel.create({
      id: `hw_${Date.now()}`,
      img: dto.img,
      caption,
      date: dto.date || new Date().toLocaleDateString('vi-VN'),
    });

    const profile = await this.profileService.recordWritten(10);
    return { item: doc.toObject(), profile };
  }

  async remove(id: string) {
    const deleted = await this.handwritingModel.findOneAndDelete({ id }).lean().exec();
    if (!deleted) throw new NotFoundException(`Handwriting item "${id}" not found`);
    return { deleted: true, id };
  }
}
