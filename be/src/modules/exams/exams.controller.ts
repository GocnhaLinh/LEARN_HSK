import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { MediaService } from '../media/media.service';
import { ExamsService, ImportExamPayload } from './exams.service';

const EXAM_UPLOAD_INTERCEPTOR = FileFieldsInterceptor(
  [
    { name: 'audio', maxCount: 1 },
    { name: 'images', maxCount: 20 },
  ],
  {
    storage: memoryStorage(),
    limits: {
      fileSize: 95 * 1024 * 1024, // 95 MB max per file
      fieldSize: 20 * 1024 * 1024, // 20 MB max for JSON payload field
    },
  },
);

@Controller('exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly mediaService: MediaService,
  ) {}

  @Get('media/status')
  getMediaStatus() {
    return this.mediaService.getStatus(true);
  }

  @Get('media/gridfs/:fileId')
  streamGridFs(
    @Param('fileId') fileId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.mediaService.streamGridFsFile(fileId, req, res);
  }

  @Get()
  list(@Query('level') level?: string) {
    const parsedLevel = level ? Number(level) : undefined;
    if (level && (!Number.isInteger(parsedLevel) || parsedLevel! < 1 || parsedLevel! > 6)) {
      throw new BadRequestException('level must be an integer between 1 and 6');
    }
    return this.examsService.listByLevel(parsedLevel);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  @Post('import')
  @UseInterceptors(EXAM_UPLOAD_INTERCEPTOR)
  importExam(
    @Body('payload') rawPayload: string,
    @UploadedFiles()
    files: {
      audio?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    if (!rawPayload) {
      throw new BadRequestException('Thiếu trường "payload" (JSON cấu trúc đề thi).');
    }
    let parsed: ImportExamPayload;
    try {
      parsed = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    } catch {
      throw new BadRequestException('Trường "payload" không phải JSON hợp lệ.');
    }
    return this.examsService.importExam(parsed, files || {});
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examsService.remove(id);
  }
}
