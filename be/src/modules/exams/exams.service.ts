import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import type { ExamMediaAsset, ExamSection } from '../../schemas/exam.schema';
import { sanitizeExerciseOptions } from '../../schemas/schema-options';
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
        // Omit heavy `sections` & internal `mediaAssets` (~95% less Atlas bandwidth)
        const docs = await lv.exams
          .find()
          .select('-_id -__v -mediaAssets -sections')
          .sort({ createdAt: -1 })
          .lean()
          .exec();

        return Promise.all(
          docs.map(async (doc: any) => {
            let sectionCounts: Record<string, number> =
              doc.sectionCounts && Object.keys(doc.sectionCounts).length > 0
                ? doc.sectionCounts
                : {};
            let totalQuestions = doc.totalQuestions || 0;

            // One-time lazy backfill for older exam documents saved before `sectionCounts` existed
            if (Object.keys(sectionCounts).length === 0) {
              const full = await lv.exams
                .findOne({ id: doc.id })
                .select('sections')
                .lean()
                .exec();
              const counts = countQuestions((full?.sections as ExamSection[]) || []);
              sectionCounts = counts.bySection;
              totalQuestions = totalQuestions || counts.total;
              await lv.exams
                .updateOne({ id: doc.id }, { $set: { sectionCounts, totalQuestions } })
                .exec()
                .catch(() => {});
            }

            return {
              id: doc.id,
              code: doc.code,
              level: doc.level,
              title: doc.title,
              description: doc.description || '',
              totalQuestions,
              totalDurationMin: doc.totalDurationMin || 120,
              audioUrl: doc.audioUrl,
              audioStorage: doc.audioStorage,
              audioDurationSec: doc.audioDurationSec,
              sectionCounts,
              createdAt: doc.createdAt,
            };
          }),
        );
      }),
    );

    return perLevel.flat();
  }

  async findOne(id: string) {
    const found = await this.hskCollections.findExamById(id);
    if (!found) {
      throw new NotFoundException(`Exam "${id}" not found`);
    }
    // Strip internal storage metadata (`mediaAssets`) before sending exam payload to client
    const { mediaAssets: _internalAssets, ...publicExam } = found.doc;
    return publicExam;
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

    const { total, bySection } = countQuestions(payload.sections);
    if (total <= 0) {
      throw new BadRequestException('Không tìm thấy câu hỏi nào trong đề thi.');
    }

    const uploadedAssets: ExamMediaAsset[] = [];
    const safeCode = code.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'exam';
    const examId = `hsk${level}-exam-${safeCode}-${Date.now()}`;

    try {
      const audioFile = files?.audio?.[0];
      const imageFiles = files?.images || [];

      // Upload audio and all images in parallel; use allSettled so any partial success rolls back cleanly
      const uploadTasks: Array<Promise<{ kind: 'audio' | 'image'; asset: ExamMediaAsset; qNum?: number }>> = [];
      if (audioFile) {
        uploadTasks.push(
          this.mediaService
            .uploadAudio(audioFile, { level, examCode: safeCode })
            .then((asset) => ({ kind: 'audio' as const, asset })),
        );
      }
      for (const imgFile of imageFiles) {
        const qNum = extractQuestionNumberFromFilename(imgFile.originalname);
        uploadTasks.push(
          this.mediaService
            .uploadImage(imgFile, { level, examCode: safeCode, questionNumber: qNum })
            .then((asset) => ({ kind: 'image' as const, asset, qNum })),
        );
      }

      const settled = await Promise.allSettled(uploadTasks);
      let audioAsset: ExamMediaAsset | undefined;
      const imageUrlByQuestion = new Map<number, string>();
      let firstError: unknown = null;

      for (const item of settled) {
        if (item.status === 'fulfilled') {
          const { kind, asset, qNum } = item.value;
          uploadedAssets.push(asset);
          if (kind === 'audio') {
            audioAsset = asset;
          } else if (qNum !== undefined) {
            imageUrlByQuestion.set(qNum, asset.url);
          }
        } else if (!firstError) {
          firstError = item.reason;
        }
      }

      if (firstError) {
        throw firstError;
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
              const cleanOpts = sanitizeExerciseOptions(q.options);
              const nextQ: any = {
                ...q,
                correctAnswer: String(q.correctAnswer || '').trim(),
              };
              if (cleanOpts) {
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
        sectionCounts: bySection,
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

      const { mediaAssets: _internalAssets, ...publicExam } = created.toObject();
      return publicExam;
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
    const mediaResult =
      assets.length > 0
        ? await this.mediaService.deleteAssets(assets)
        : { deletedCount: 0, failedCount: 0 };

    return {
      deleted: true,
      id,
      deletedAssets: mediaResult.deletedCount,
      failedAssets: mediaResult.failedCount,
    };
  }
}
