import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateHandwritingDto {
  @IsString()
  @IsNotEmpty()
  img: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  date?: string;
}
