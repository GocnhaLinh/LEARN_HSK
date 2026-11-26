import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateLessonDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  @Max(6)
  level: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsBoolean()
  fromFile?: boolean;
}

export class ImportVocabItemDto {
  @IsString()
  @IsNotEmpty()
  hanzi: string;

  @IsOptional()
  @IsString()
  pinyin?: string;

  @IsOptional()
  @IsString()
  english?: string;

  @IsOptional()
  @IsString()
  meaning?: string;

  @IsOptional()
  @IsString()
  exampleZh?: string;

  @IsOptional()
  @IsString()
  exampleVi?: string;
}

export class ImportExerciseItemDto {
  @IsOptional()
  @IsIn(['quiz', 'fill_blank', 'listen', 'translate'])
  exerciseType?: 'quiz' | 'fill_blank' | 'listen' | 'translate';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  options: string[];

  @IsString()
  @IsNotEmpty()
  correctAnswer: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  xpReward?: number;
}

export class BulkImportLessonsDto {
  @IsInt()
  @Min(1)
  @Max(6)
  level: number;

  @IsString()
  @IsNotEmpty()
  baseTitle: string;

  @IsInt()
  @Min(0)
  @Max(500)
  splitSize: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportVocabItemDto)
  words: ImportVocabItemDto[];

  @IsOptional()
  @IsBoolean()
  autoGenerateExercises?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportExerciseItemDto)
  extractedExercises?: ImportExerciseItemDto[];
}
