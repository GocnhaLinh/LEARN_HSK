import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  BatchDeleteVocabDto,
  BatchUpdateVocabStatusDto,
  CreateVocabDto,
  UpdateVocabDto,
  UpdateVocabStatusDto,
} from './vocab.dto';
import { VocabService } from './vocab.service';

@Controller('vocab')
export class VocabController {
  constructor(private readonly vocabService: VocabService) {}

  @Get()
  findAll(
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('lessonId') lessonId?: string,
    @Query('search') search?: string,
  ) {
    return this.vocabService.findAll({ level, status, lessonId, search });
  }

  @Patch('batch/status')
  batchUpdateStatus(@Body() dto: BatchUpdateVocabStatusDto) {
    return this.vocabService.batchUpdateStatus(dto.ids, dto.status);
  }

  @Post('batch/delete')
  batchRemove(@Body() dto: BatchDeleteVocabDto) {
    return this.vocabService.batchRemove(dto.ids);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vocabService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVocabDto) {
    return this.vocabService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVocabDto) {
    return this.vocabService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateVocabStatusDto) {
    return this.vocabService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vocabService.remove(id);
  }
}
