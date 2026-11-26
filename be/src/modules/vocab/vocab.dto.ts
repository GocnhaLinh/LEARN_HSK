import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { VocabStatus } from '../../schemas/vocab.schema';

export class CreateVocabDto {
  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsString()
  @IsNotEmpty()
  hanzi: string;

  @IsString()
  @IsNotEmpty()
  pinyin: string;

  @IsOptional()
  @IsString()
  hanviet?: string;

  @IsOptional()
  @IsString()
  english?: string;

  @IsString()
  @IsNotEmpty()
  meaning: string;

  @IsOptional()
  @IsString()
  pos?: string;

  @IsInt()
  @Min(1)
  @Max(6)
  level: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  exampleZh?: string;

  @IsOptional()
  @IsString()
  exampleVi?: string;
}

export class UpdateVocabDto {
  @IsOptional()
  @IsString()
  hanzi?: string;

  @IsOptional()
  @IsString()
  pinyin?: string;

  @IsOptional()
  @IsString()
  hanviet?: string;

  @IsOptional()
  @IsString()
  english?: string;

  @IsOptional()
  @IsString()
  meaning?: string;

  @IsOptional()
  @IsString()
  pos?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  level?: number;

  @IsOptional()
  @IsIn(['mastered', 'learning', 'review', 'new'])
  status?: VocabStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  exampleZh?: string;

  @IsOptional()
  @IsString()
  exampleVi?: string;
}

export class UpdateVocabStatusDto {
  @IsIn(['mastered', 'learning', 'review', 'new'])
  status: VocabStatus;

  @IsOptional()
  @IsBoolean()
  recordReview?: boolean;
}

export class BatchUpdateVocabStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  ids: string[];

  @IsIn(['mastered', 'learning', 'review', 'new'])
  status: VocabStatus;
}

export class BatchDeleteVocabDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  ids: string[];
}
