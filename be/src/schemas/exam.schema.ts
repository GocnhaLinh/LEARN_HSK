import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { CLEAN_SCHEMA_OPTIONS } from './schema-options';

export type ExamDocument = HydratedDocument<Exam>;
export type MediaStorageProvider = 'cloudinary' | 'gridfs';
export type ExamSectionKey = 'listening' | 'reading' | 'writing';
export type ExamQuestionFormat =
  | 'listening_mcq'
  | 'reading_cloze'
  | 'reading_short'
  | 'reading_long'
  | 'writing_reorder'
  | 'writing_keywords'
  | 'writing_picture';

export interface ExamMediaAsset {
  kind: 'audio' | 'image';
  storage: MediaStorageProvider;
  publicId: string;
  url: string;
  resourceType: 'video' | 'image' | 'raw';
  questionNumber?: number;
  bytes?: number;
}

export interface ExamQuestionItem {
  number: number;
  prompt?: string;
  options?: string[];
  correctAnswer: string;
  transcript?: string;
  explanation?: string;
  wordTiles?: string[];
  keywords?: string[];
  imageUrl?: string;
  minChars?: number;
  audioStartSec?: number;
  audioEndSec?: number;
}

export interface ExamQuestionGroup {
  groupId: string;
  rangeLabel?: string;
  passage?: string;
  transcript?: string;
  audioStartSec?: number;
  audioEndSec?: number;
  questions: ExamQuestionItem[];
}

export interface ExamPart {
  partNumber: number;
  title: string;
  instruction?: string;
  questionFormat: ExamQuestionFormat;
  groups: ExamQuestionGroup[];
}

export interface ExamSection {
  key: ExamSectionKey;
  title: string;
  durationMin: number;
  parts: ExamPart[];
}

@Schema({ ...CLEAN_SCHEMA_OPTIONS, collection: 'exams' })
export class Exam {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  code: string;

  @Prop({ required: true, min: 1, max: 6, index: true })
  level: number;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true, default: 0 })
  totalQuestions: number;

  @Prop({ required: true, default: 120 })
  totalDurationMin: number;

  @Prop({ default: undefined })
  audioUrl?: string;

  @Prop({ default: undefined })
  audioStorage?: MediaStorageProvider;

  @Prop({ default: undefined })
  audioDurationSec?: number;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  mediaAssets: ExamMediaAsset[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  sections: ExamSection[];
}

export const ExamSchema = SchemaFactory.createForClass(Exam);
ExamSchema.index({ level: 1, createdAt: -1 });
ExamSchema.index({ code: 1, level: 1 });
