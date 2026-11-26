import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CreateHandwritingDto } from './handwriting.dto';
import { HandwritingService } from './handwriting.service';

@Controller('handwriting')
export class HandwritingController {
  constructor(private readonly handwritingService: HandwritingService) {}

  @Get()
  findAll() {
    return this.handwritingService.findAll();
  }

  @Post()
  create(@Body() dto: CreateHandwritingDto) {
    return this.handwritingService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.handwritingService.remove(id);
  }
}
