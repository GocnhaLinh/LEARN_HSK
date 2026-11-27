import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CLEAN_SCHEMA_OPTIONS } from './schema-options';

export type LessonDocument = HydratedDocument<Lesson>;

@Schema({ ...CLEAN_SCHEMA_OPTIONS, collection: 'lessons' })
export class Lesson {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, min: 1, max: 6, index: true })
  level: number;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  desc: string;

  @Prop({ default: false })
  fromFile: boolean;

  @Prop({ default: 0 })
  order: number;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);
LessonSchema.index({ order: 1, createdAt: -1 });
