import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScoreRecordDocument = HydratedDocument<ScoreRecord>;

@Schema({ timestamps: true, collection: 'scores' })
export class ScoreRecord {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, min: 0, max: 6, index: true })
  level: number; // 1-6, or 0 for "all"

  @Prop({ required: true, enum: ['quiz', 'listen', 'match', 'exercise', 'writing'] })
  mode: 'quiz' | 'listen' | 'match' | 'exercise' | 'writing';

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ default: 0 })
  combo: number;

  @Prop({ default: 0 })
  xpEarned: number;

  @Prop({ default: '' })
  detail: string;

  @Prop({ required: true })
  playedAt: string;
}

export const ScoreRecordSchema = SchemaFactory.createForClass(ScoreRecord);
