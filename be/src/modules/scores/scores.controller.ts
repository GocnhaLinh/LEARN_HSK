import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateScoreDto } from './scores.dto';
import { ScoresService } from './scores.service';

@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get()
  getOverview(@Query('level') level?: string) {
    const parsed = level ? Number(level) : undefined;
    return this.scoresService.getOverview(Number.isFinite(parsed) ? parsed : undefined);
  }

  @Post()
  recordScore(@Body() dto: CreateScoreDto) {
    return this.scoresService.recordScore(dto);
  }
}
