import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VocabDocument = HydratedDocument<Vocab>;
export type VocabStatus = 'mastered' | 'learning' | 'review' | 'new';

@Schema({ timestamps: true, collection: 'vocab' })
export class Vocab {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  lessonId: string;

  @Prop({ required: true, index: true })
  hanzi: string;

  @Prop({ required: true })
  pinyin: string;

  @Prop({ default: '' })
  hanviet: string;

  @Prop({ default: '' })
  english: string;

  @Prop({ required: true })
  meaning: string;

  @Prop({ default: 'Từ vựng' })
  pos: string;

  @Prop({ required: true, min: 1, max: 6, index: true })
  level: number;

  @Prop({
    enum: ['mastered', 'learning', 'review', 'new'],
    default: 'new',
    index: true,
  })
  status: VocabStatus;

  @Prop({ default: false })
  custom: boolean;

  @Prop({ default: '' })
  note: string;

  @Prop({ default: '' })
  exampleZh: string;

  @Prop({ default: '' })
  exampleVi: string;

  @Prop({ default: 0 })
  order: number;
}

export const VocabSchema = SchemaFactory.createForClass(Vocab);
