import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type HskItemCategory = 'course_summary' | 'lesson' | 'vocab' | 'exercise';
export type HskItemDocument = HydratedDocument<HskItem>;

/**
 * Unified flexible schema stored inside each per-level collection:
 *   HSK1, HSK2, HSK3, HSK4, HSK5, HSK6
 *
 * Each collection contains:
 *  - category: 'course_summary' -> Thông tin khóa học & điểm thi đua của cấp HSK đó
 *  - category: 'lesson'         -> Các bài học trong cấp HSK đó
 *  - category: 'vocab'          -> List từ vựng của cấp HSK đó
 *  - category: 'exercise'       -> Các bài tập trắc nghiệm / luyện nghe / điền từ của cấp HSK đó
 */
@Schema({ timestamps: true, strict: false })
export class HskItem {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({
    required: true,
    enum: ['course_summary', 'lesson', 'vocab', 'exercise'],
    index: true,
  })
  category: HskItemCategory;

  @Prop({ required: true, min: 1, max: 6, index: true })
  level: number;

  // --- Shared / Lesson fields ---
  @Prop({ index: true })
  lessonId?: string;

  @Prop()
  title?: string;

  @Prop()
  desc?: string;

  @Prop({ default: false })
  fromFile?: boolean;

  @Prop({ default: 0 })
  order?: number;

  // --- Vocab fields ---
  @Prop({ index: true })
  hanzi?: string;

  @Prop()
  pinyin?: string;

  @Prop()
  hanviet?: string;

  @Prop()
  english?: string;

  @Prop()
  meaning?: string;

  @Prop()
  pos?: string;

  @Prop({ enum: ['mastered', 'learning', 'review', 'new'], index: true })
  status?: 'mastered' | 'learning' | 'review' | 'new';

  @Prop({ default: false })
  custom?: boolean;

  @Prop()
  note?: string;

  @Prop()
  exampleZh?: string;

  @Prop()
  exampleVi?: string;

  // --- Exercise fields ---
  @Prop({ enum: ['quiz', 'fill_blank', 'listen', 'translate'] })
  exerciseType?: 'quiz' | 'fill_blank' | 'listen' | 'translate';

  @Prop()
  question?: string;

  @Prop({ type: [String] })
  options?: string[];

  @Prop()
  correctAnswer?: string;

  @Prop()
  explanation?: string;

  @Prop()
  xpReward?: number;

  @Prop({ default: false })
  completed?: boolean;

  // --- Course Summary & Điểm thi đua fields ---
  @Prop()
  code?: string;

  @Prop()
  tier?: 'primary' | 'intermediate';

  @Prop()
  subtitle?: string;

  @Prop()
  badge?: string;

  @Prop()
  color?: string;

  @Prop()
  emoji?: string;

  @Prop()
  featured?: boolean;

  @Prop({ default: 0 })
  xpEarned?: number;

  @Prop({ default: 0 })
  totalScore?: number;

  @Prop({ default: 0 })
  highScore?: number;

  @Prop({ default: 0 })
  bestCombo?: number;

  @Prop({ default: 0 })
  gamesPlayed?: number;

  @Prop({ default: 0 })
  exercisesCompleted?: number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  extra?: Record<string, any>;
}

export const HskItemSchema = SchemaFactory.createForClass(HskItem);
HskItemSchema.index({ category: 1, order: 1 });
HskItemSchema.index({ category: 1, lessonId: 1 });
