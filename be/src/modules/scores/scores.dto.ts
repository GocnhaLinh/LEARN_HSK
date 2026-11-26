import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateScoreDto {
  @IsInt()
  @Min(0)
  @Max(6)
  level: number;

  @IsIn(['quiz', 'listen', 'match', 'exercise', 'writing'])
  mode: 'quiz' | 'listen' | 'match' | 'exercise' | 'writing';

  @IsInt()
  @Min(0)
  score: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  combo?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  xpEarned?: number;

  @IsOptional()
  @IsString()
  detail?: string;
}
