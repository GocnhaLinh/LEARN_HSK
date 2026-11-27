import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import type { ExamMediaAsset, ExamSection } from '../../schemas/exam.schema';
import { MediaService } from '../media/media.service';

export interface ImportExamPayload {
  code: string;
  level: number;
  title: string;
  description?: string;
  totalDurationMin?: number;
  audioDurationSec?: number;
  sections: ExamSection[];
}

export interface ExamSummaryDto {
  id: string;
  code: string;
  level: number;
  title: string;
  description: string;
  totalQuestions: number;
  totalDurationMin: number;
  audioUrl?: string;
  audioStorage?: string;
  audioDurationSec?: number;
  sectionCounts: Record<string, number>;
  createdAt?: string;
}

function countQuestions(sections: ExamSection[]): {
  total: number;
  bySection: Record<string, number>;
} {
  let total = 0;
  const bySection: Record<string, number> = {};
  for (const sec of sections || []) {
    let secTotal = 0;
    for (const part of sec.parts || []) {
      for (const group of part.groups || []) {
        secTotal += Array.isArray(group.questions) ? group.questions.length : 0;
      }
    }
    bySection[sec.key] = secTotal;
    total += secTotal;
  }
  return { total, bySection };
}

function extractQuestionNumberFromFilename(name: string): number | undefined {
  const match = /(?:^|[^a-z0-9])q(\d{1,3})(?:[^0-9]|$)/i.exec(name || '');
  return match ? Number(match[1]) : undefined;
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly hskCollections: HskCollectionsService,
    private readonly mediaService: MediaService,
  ) {}

  async listByLevel(level?: number): Promise<ExamSummaryDto[]> {
    const targets = level
      ? [this.hskCollections.getLevel(level)]
      : this.hskCollections.getAllLevels();

    const perLevel = await Promise.all(
      targets.map(async (lv) => {
        const docs = await lv.exams
          .find()
          .select('-_id -__v -mediaAssets')
          .sort({ createdAt: -1 })
          .lean()
          .exec();

        return docs.map((doc: any) => {
          const counts = countQuestions(doc.sections || []);
          return {
            id: doc.id,
            code: doc.code,
            level: doc.level,
            title: doc.title,
            description: doc.description || '',
            totalQuestions: doc.totalQuestions || counts.total,
            totalDurationMin: doc.totalDurationMin || 120,
            audioUrl: doc.audioUrl,
            audioStorage: doc.audioStorage,
            audioDurationSec: doc.audioDurationSec,
            sectionCounts: counts.bySection,
            createdAt: doc.createdAt,
          };
        });
      }),
    );

    return perLevel.flat();
  }

  async findOne(id: string) {
    const found = await this.hskCollections.findExamById(id);
    if (!found) {
      throw new NotFoundException(`Exam "${id}" not found`);
    }
    return found.doc;
  }

  async importExam(
    payload: ImportExamPayload,
    files: { audio?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const level = Number(payload?.level);
    if (!Number.isInteger(level) || level < 1 || level > 6) {
      throw new BadRequestException('Cấp độ HSK phải từ 1 đến 6.');
    }
    const code = String(payload?.code || '').trim();
    const title = String(payload?.title || '').trim();
    if (!code || !title) {
      throw new BadRequestException('Thiếu mã đề (code) hoặc tiêu đề đề thi (title).');
    }
    if (!Array.isArray(payload?.sections) || payload.sections.length === 0) {
      throw new BadRequestException('Đề thi phải có ít nhất 1 phần (sections).');
    }

    const { total } = countQuestions(payload.sections);
    if (total <= 0) {
      throw new BadRequestException('Không tìm thấy câu hỏi nào trong đề thi.');
    }

    const uploadedAssets: ExamMediaAsset[] = [];
    const safeCode = code.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'exam';
    const examId = `hsk${level}-exam-${safeCode}-${Date.now()}`;

    try {
      const audioFile = files?.audio?.[0];
      let audioAsset: ExamMediaAsset | undefined;
      if (audioFile) {
        audioAsset = await this.mediaService.uploadAudio(audioFile, {
          level,
          examCode: safeCode,
        });
        uploadedAssets.push(audioAsset);
      }

      const imageFiles = files?.images || [];
      const imageUrlByQuestion = new Map<number, string>();
      for (const imgFile of imageFiles) {
        const qNum = extractQuestionNumberFromFilename(imgFile.originalname);
        const imgAsset = await this.mediaService.uploadImage(imgFile, {
          level,
          examCode: safeCode,
          questionNumber: qNum,
        });
        uploadedAssets.push(imgAsset);
        if (qNum !== undefined) {
          imageUrlByQuestion.set(qNum, imgAsset.url);
        }
      }

      // Attach uploaded image URLs to matching question numbers (e.g. q100.png -> question 100)
      const sections: ExamSection[] = payload.sections.map((sec) => ({
        ...sec,
        parts: (sec.parts || []).map((part) => ({
          ...part,
          groups: (part.groups || []).map((group) => ({
            ...group,
            questions: (group.questions || []).map((q) => {
              const matchedImg = imageUrlByQuestion.get(q.number);
              const cleanOpts = Array.isArray(q.options)
                ? q.options.map((o) => String(o).trim()).filter(Boolean)
                : [];
              const nextQ: any = {
                ...q,
                correctAnswer: String(q.correctAnswer || '').trim(),
              };
              if (cleanOpts.length >= 2) {
                nextQ.options = cleanOpts;
              } else {
                delete nextQ.options;
              }
              if (matchedImg) {
                nextQ.imageUrl = matchedImg;
              }
              return nextQ;
            }),
          })),
        })),
      }));

      const lv = this.hskCollections.getLevel(level);
      const created = await lv.exams.create({
        id: examId,
        code,
        level,
        title,
        description: String(payload.description || '').trim(),
        totalQuestions: total,
        totalDurationMin: Number(payload.totalDurationMin) || 120,
        ...(audioAsset
          ? {
              audioUrl: audioAsset.url,
              audioStorage: audioAsset.storage,
            }
          : {}),
        ...(payload.audioDurationSec ? { audioDurationSec: Number(payload.audioDurationSec) } : {}),
        mediaAssets: uploadedAssets,
        sections,
      });

      return created.toObject();
    } catch (err) {
      // Roll back uploaded Cloudinary/GridFS assets so failed imports never leak storage
      if (uploadedAssets.length > 0) {
        await this.mediaService.deleteAssets(uploadedAssets);
      }
      throw err;
    }
  }

  async remove(id: string) {
    const found = await this.hskCollections.findExamById(id);
    if (!found) {
      throw new NotFoundException(`Exam "${id}" not found`);
    }

    const assets: ExamMediaAsset[] = Array.isArray(found.doc?.mediaAssets)
      ? found.doc.mediaAssets
      : [];

    await found.models.exams.deleteOne({ id }).exec();
    if (assets.length > 0) {
      await this.mediaService.deleteAssets(assets);
    }

    return { deleted: true, id, deletedAssets: assets.length };
  }
}
