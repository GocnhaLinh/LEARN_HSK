import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateExerciseDto {
  @IsInt()
  @Min(1)
  @Max(6)
  level: number;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsIn(['quiz', 'fill_blank', 'listen', 'translate'])
  exerciseType: 'quiz' | 'fill_blank' | 'listen' | 'translate';

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
  @Min(5)
  @Max(100)
  xpReward?: number;
}

export class SubmitExerciseDto {
  @IsString()
  @IsNotEmpty()
  answer: string;
}
