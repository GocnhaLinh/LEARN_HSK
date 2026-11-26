import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsIn(['zine', 'diary'])
  theme?: 'zine' | 'diary';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  focusLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  dailyTarget?: number;
}

export class AddXpDto {
  @IsInt()
  @Min(1)
  @Max(1000)
  amount: number;
}

export class ToggleMissionDto {
  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
