import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CreateExerciseDto, SubmitExerciseDto } from './exercises.dto';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  findAll(@Query('level') level?: string, @Query('lessonId') lessonId?: string) {
    const parsedLevel = level ? Number(level) : undefined;
    return this.exercisesService.findAll(
      Number.isFinite(parsedLevel) ? parsedLevel : undefined,
      lessonId,
    );
  }

  @Post()
  create(@Body() dto: CreateExerciseDto) {
    return this.exercisesService.create(dto);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() dto: SubmitExerciseDto) {
    return this.exercisesService.submit(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exercisesService.remove(id);
  }
}
