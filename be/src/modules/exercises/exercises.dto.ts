import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateExerciseDto {
  @IsInt()
  @Min(1)
  @Max(6)
  level: number;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsIn(['translate', 'fill_blank', 'writing', 'listen', 'quiz'])
  exerciseType?: 'translate' | 'fill_blank' | 'writing' | 'listen' | 'quiz';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  xpReward?: number;
}
