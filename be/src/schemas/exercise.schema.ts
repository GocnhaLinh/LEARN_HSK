import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CLEAN_SCHEMA_OPTIONS } from './schema-options';

export type ExerciseDocument = HydratedDocument<Exercise>;
export type ExerciseType = 'translate' | 'fill_blank' | 'writing' | 'listen' | 'quiz';

@Schema({ ...CLEAN_SCHEMA_OPTIONS, collection: 'exercises' })
export class Exercise {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, min: 1, max: 6, index: true })
  level: number;

  @Prop({ required: true, index: true })
  lessonId: string;

  @Prop({
    required: true,
    enum: ['translate', 'fill_blank', 'writing', 'listen', 'quiz'],
    default: 'translate',
    index: true,
  })
  exerciseType: ExerciseType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  question: string;

  /** Only stored in MongoDB when an uploaded exercise file explicitly has A/B/C/D options */
  @Prop({ type: [String], default: undefined })
  options?: string[];

  @Prop({ default: '' })
  correctAnswer: string;

  @Prop({ default: '' })
  explanation: string;

  @Prop({ default: 20 })
  xpReward: number;

  @Prop({ default: false })
  completed: boolean;

  @Prop({ default: 0 })
  order: number;
}

export const ExerciseSchema = SchemaFactory.createForClass(Exercise);
ExerciseSchema.index({ order: 1, createdAt: -1 });
ExerciseSchema.index({ lessonId: 1, order: 1 });
