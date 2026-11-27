import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import type { Request, Response } from 'express';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Connection } from 'mongoose';
import { Readable } from 'stream';
import type { ExamMediaAsset, MediaStorageProvider } from '../../schemas/exam.schema';
import { MediaOptimizerService } from './media-optimizer.service';

export interface MediaStorageStatus {
  provider: MediaStorageProvider;
  configured: boolean;
  connected: boolean;
  cloudName?: string;
  folder: string;
  error?: string;
}

const MAX_AUDIO_BYTES = 95 * 1024 * 1024; // 95 MB (Cloudinary Free video/audio cap is 100 MB)
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB (Cloudinary Free image cap)
const ALLOWED_AUDIO_EXT = /\.(mp3|m4a|wav|ogg|aac|flac)$/i;
const ALLOWED_IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger('MediaStorage');
  private readonly folder: string;
  private readonly cloudinaryConfigured: boolean;
  private readonly cloudName?: string;
  private cloudinaryConnected = false;
  private lastError?: string;

  constructor(
    private readonly config: ConfigService,
    @InjectConnection() private readonly connection: Connection,
    private readonly optimizer: MediaOptimizerService,
  ) {
    this.folder = (this.config.get<string>('CLOUDINARY_FOLDER') || 'HSK').trim();

    const cloudinaryUrl = (this.config.get<string>('CLOUDINARY_URL') || '').trim();
    const cloudName = (this.config.get<string>('CLOUDINARY_CLOUD_NAME') || '').trim();
    const apiKey = (this.config.get<string>('CLOUDINARY_API_KEY') || '').trim();
    const apiSecret = (this.config.get<string>('CLOUDINARY_API_SECRET') || '').trim();

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.cloudinaryConfigured = true;
      this.cloudName = cloudName;
    } else if (cloudinaryUrl && cloudinaryUrl.startsWith('cloudinary://')) {
      const parsed = this.parseCloudinaryUrl(cloudinaryUrl);
      if (parsed) {
        cloudinary.config({
          cloud_name: parsed.cloudName,
          api_key: parsed.apiKey,
          api_secret: parsed.apiSecret,
          secure: true,
        });
        this.cloudinaryConfigured = true;
        this.cloudName = parsed.cloudName;
      } else {
        this.cloudinaryConfigured = false;
        this.lastError = 'CLOUDINARY_URL format is invalid';
      }
    } else {
      this.cloudinaryConfigured = false;
    }
  }

  private parseCloudinaryUrl(
    rawUrl: string,
  ): { cloudName: string; apiKey: string; apiSecret: string } | null {
    try {
      const u = new URL(rawUrl);
      const cloudName = u.hostname;
      const apiKey = decodeURIComponent(u.username);
      const apiSecret = decodeURIComponent(u.password);
      if (!cloudName || !apiKey || !apiSecret) return null;
      return { cloudName, apiKey, apiSecret };
    } catch {
      return null;
    }
  }

  async onModuleInit() {
    if (!this.cloudinaryConfigured) {
      this.logger.warn(
        'Cloudinary chưa được cấu hình trong be/.env (fallback tạm sang MongoDB GridFS). ' +
          'Thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET để lưu audio/ảnh trên Cloudinary.',
      );
      return;
    }

    const status = await this.pingCloudinary();
    if (status.connected) {
      this.logger.log(
        `☁️  Cloudinary connected (cloud: "${this.cloudName}", folder: "${this.folder}")`,
      );
    } else {
      this.logger.error(
        `☁️  Cloudinary ping failed (${this.cloudName}): ${status.error || 'Unknown error'}`,
      );
    }
  }

  private async pingCloudinary(): Promise<{ connected: boolean; error?: string }> {
    if (!this.cloudinaryConfigured) {
      this.cloudinaryConnected = false;
      return { connected: false, error: 'Cloudinary credentials not configured' };
    }
    try {
      const res = await cloudinary.api.ping();
      const ok = res?.status === 'ok';
      this.cloudinaryConnected = ok;
      this.lastError = ok ? undefined : `Unexpected ping response: ${JSON.stringify(res)}`;
      return { connected: ok, error: this.lastError };
    } catch (err: any) {
      this.cloudinaryConnected = false;
      this.lastError = err?.error?.message || err?.message || String(err);
      return { connected: false, error: this.lastError };
    }
  }

  async getStatus(liveCheck = false): Promise<MediaStorageStatus> {
    if (this.cloudinaryConfigured && liveCheck) {
      await this.pingCloudinary();
    }

    if (this.cloudinaryConfigured) {
      return {
        provider: 'cloudinary',
        configured: true,
        connected: this.cloudinaryConnected,
        cloudName: this.cloudName,
        folder: this.folder,
        ...(this.lastError ? { error: this.lastError } : {}),
      };
    }

    return {
      provider: 'gridfs',
      configured: false,
      connected: this.connection.readyState === 1,
      folder: this.folder,
    };
  }

  private sanitizeSegment(input: string): string {
    return (input || 'exam')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'exam';
  }

  private getGridFsBucket(): GridFSBucket {
    const db = this.connection.db;
    if (!db || this.connection.readyState !== 1) {
      throw new InternalServerErrorException('MongoDB chưa sẵn sàng để lưu file media.');
    }
    return new GridFSBucket(db, { bucketName: 'exam_media' });
  }

  private uploadBufferToCloudinary(
    buffer: Buffer,
    options: Record<string, any>,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
        if (err || !result) {
          reject(err || new Error('Cloudinary upload returned empty result'));
          return;
        }
        resolve(result);
      });
      Readable.from(buffer).pipe(stream);
    });
  }

  private uploadBufferToGridFs(
    buffer: Buffer,
    filename: string,
    contentType: string,
    metadata: Record<string, any>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const bucket = this.getGridFsBucket();
      const uploadStream = bucket.openUploadStream(filename, {
        contentType,
        metadata,
      });
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  async uploadAudio(
    file: Express.Multer.File,
    opts: { level: number; examCode: string },
  ): Promise<ExamMediaAsset> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File audio trống.');
    }
    if (file.size > MAX_AUDIO_BYTES) {
      throw new BadRequestException('File audio vượt quá giới hạn 95 MB.');
    }
    const isAudioMime = (file.mimetype || '').startsWith('audio/');
    if (!isAudioMime && !ALLOWED_AUDIO_EXT.test(file.originalname || '')) {
      throw new BadRequestException('Chỉ hỗ trợ định dạng audio (.mp3, .m4a, .wav, .ogg, .aac).');
    }

    const safeCode = this.sanitizeSegment(opts.examCode);
    const targetFolder = `${this.folder}/HSK${opts.level}/${safeCode}`;
    const optimized = await this.optimizer.optimizeAudio(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    if (this.cloudinaryConfigured) {
      // Already compressed locally -> 0 Cloudinary audio transformation credits consumed
      // Pass both `folder` and `asset_folder` to support both Fixed & Dynamic Folder modes
      const uploaded = await this.uploadBufferToCloudinary(optimized.buffer, {
        resource_type: 'video',
        folder: targetFolder,
        asset_folder: targetFolder,
        public_id: `${safeCode}_audio_${Date.now()}`,
        overwrite: false,
      });
      this.cloudinaryConnected = true;
      this.lastError = undefined;
      return {
        kind: 'audio',
        storage: 'cloudinary',
        publicId: uploaded.public_id,
        url: uploaded.secure_url,
        resourceType: 'video',
        bytes: uploaded.bytes || optimized.optimizedBytes,
      };
    }

    const fileId = await this.uploadBufferToGridFs(
      optimized.buffer,
      `${safeCode}.${optimized.ext}`,
      optimized.mimeType,
      { kind: 'audio', level: opts.level, examCode: safeCode },
    );

    return {
      kind: 'audio',
      storage: 'gridfs',
      publicId: fileId,
      url: `/api/exams/media/gridfs/${fileId}`,
      resourceType: 'video',
      bytes: optimized.optimizedBytes,
    };
  }

  async uploadImage(
    file: Express.Multer.File,
    opts: { level: number; examCode: string; questionNumber?: number },
  ): Promise<ExamMediaAsset> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File ảnh trống.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('File ảnh vượt quá giới hạn 10 MB.');
    }
    const isImageMime = (file.mimetype || '').startsWith('image/');
    if (!isImageMime && !ALLOWED_IMAGE_EXT.test(file.originalname || '')) {
      throw new BadRequestException('Chỉ hỗ trợ định dạng ảnh (.png, .jpg, .webp).');
    }

    const safeCode = this.sanitizeSegment(opts.examCode);
    const qTag = opts.questionNumber ? `q${opts.questionNumber}` : 'img';
    const targetFolder = `${this.folder}/HSK${opts.level}/${safeCode}`;
    const optimized = await this.optimizer.optimizeImage(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    if (this.cloudinaryConfigured) {
      const uploaded = await this.uploadBufferToCloudinary(optimized.buffer, {
        resource_type: 'image',
        folder: targetFolder,
        asset_folder: targetFolder,
        public_id: `${safeCode}_${qTag}_${Date.now()}`,
        overwrite: false,
      });
      this.cloudinaryConnected = true;
      this.lastError = undefined;
      return {
        kind: 'image',
        storage: 'cloudinary',
        publicId: uploaded.public_id,
        url: uploaded.secure_url,
        resourceType: 'image',
        questionNumber: opts.questionNumber,
        bytes: uploaded.bytes || optimized.optimizedBytes,
      };
    }

    const fileId = await this.uploadBufferToGridFs(
      optimized.buffer,
      `${safeCode}_${qTag}.${optimized.ext}`,
      optimized.mimeType,
      {
        kind: 'image',
        level: opts.level,
        examCode: safeCode,
        questionNumber: opts.questionNumber,
      },
    );

    return {
      kind: 'image',
      storage: 'gridfs',
      publicId: fileId,
      url: `/api/exams/media/gridfs/${fileId}`,
      resourceType: 'image',
      questionNumber: opts.questionNumber,
      bytes: optimized.optimizedBytes,
    };
  }

  async deleteAssets(assets: ExamMediaAsset[]): Promise<void> {
    if (!Array.isArray(assets) || assets.length === 0) return;

    await Promise.allSettled(
      assets.map(async (asset) => {
        if (!asset?.publicId) return;
        if (asset.storage === 'cloudinary' && this.cloudinaryConfigured) {
          await cloudinary.uploader.destroy(asset.publicId, {
            resource_type: asset.resourceType || (asset.kind === 'audio' ? 'video' : 'image'),
            invalidate: true,
          });
        } else if (asset.storage === 'gridfs' && ObjectId.isValid(asset.publicId)) {
          const bucket = this.getGridFsBucket();
          await bucket.delete(new ObjectId(asset.publicId));
        }
      }),
    );
  }

  async streamGridFsFile(fileId: string, req: Request, res: Response): Promise<void> {
    if (!ObjectId.isValid(fileId)) {
      throw new BadRequestException('Invalid media file ID');
    }
    const bucket = this.getGridFsBucket();
    const oid = new ObjectId(fileId);
    const files = await bucket.find({ _id: oid }).limit(1).toArray();
    const fileDoc = files[0];

    if (!fileDoc) {
      throw new NotFoundException('Media file not found');
    }

    const totalSize = fileDoc.length;
    const contentType =
      (fileDoc as any).contentType ||
      (fileDoc.filename?.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream');
    const rangeHeader = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (rangeHeader && /^bytes=\d*-\d*$/.test(rangeHeader)) {
      const [rawStart, rawEnd] = rangeHeader.replace(/^bytes=/, '').split('-');
      const start = rawStart ? parseInt(rawStart, 10) : 0;
      const end = rawEnd ? Math.min(parseInt(rawEnd, 10), totalSize - 1) : totalSize - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= totalSize) {
        res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
        return;
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', String(end - start + 1));

      // GridFSBucket end is exclusive
      bucket.openDownloadStream(oid, { start, end: end + 1 }).pipe(res);
      return;
    }

    res.status(200);
    res.setHeader('Content-Length', String(totalSize));
    bucket.openDownloadStream(oid).pipe(res);
  }
}
