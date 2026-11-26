import { IsArray, IsInt, IsOptional } from 'class-validator';

export class ImportBackupDto {
  @IsOptional()
  @IsInt()
  xp?: number;

  @IsOptional()
  @IsInt()
  streak?: number;

  @IsOptional()
  @IsInt()
  dailyTarget?: number;

  @IsOptional()
  @IsArray()
  weeklyLog?: number[];

  @IsOptional()
  @IsArray()
  lessons?: any[];

  @IsOptional()
  @IsArray()
  vocab?: any[];

  @IsOptional()
  @IsArray()
  notes?: any[];
}
