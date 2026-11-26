import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getAllCourses() {
    return this.coursesService.getAllCourses();
  }

  @Get(':level')
  getCourseDetail(@Param('level', ParseIntPipe) level: number) {
    return this.coursesService.getCourseDetail(level);
  }
}
