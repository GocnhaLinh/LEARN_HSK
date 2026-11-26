import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { BulkImportLessonsDto, CreateLessonDto } from './lessons.dto';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  findAll(@Query('level') level?: string) {
    const parsedLevel = level ? Number(level) : undefined;
    return this.lessonsService.findAll(Number.isFinite(parsedLevel) ? parsedLevel : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLessonDto) {
    return this.lessonsService.create(dto);
  }

  @Post('import')
  bulkImport(@Body() dto: BulkImportLessonsDto) {
    return this.lessonsService.bulkImport(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lessonsService.remove(id);
  }
}
