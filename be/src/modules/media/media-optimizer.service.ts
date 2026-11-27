import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { Sharp } from 'sharp';
import { promisify } from 'util';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp: (input?: Buffer) => Sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string | null = require('ffmpeg-static');
const execFileAsync = promisify(execFile);

export interface OptimizedMediaResult {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  originalBytes: number;
  optimizedBytes: number;
  compressed: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

@Injectable()
export class MediaOptimizerService {
  private readonly logger = new Logger('MediaOptimizer');

  /**
   * Resizes oversized images (max 1400px inside) and converts to high-quality WebP (quality 84).
   * Preserves crisp readability of HSK picture prompts while cutting file size 60–85%.
   */
  async optimizeImage(
    buffer: Buffer,
    originalMime = 'image/png',
    originalName = 'image.png',
  ): Promise<OptimizedMediaResult> {
    const originalBytes = buffer.length;
    const origExt = path.extname(originalName).replace(/^\./, '').toLowerCase() || 'png';

    try {
      const optimized = await sharp(buffer)
        .rotate()
        .resize({
          width: 1400,
          height: 1400,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: 84,
          effort: 5,
          smartSubsample: true,
        })
        .toBuffer();

      if (optimized.length > 0 && optimized.length < originalBytes) {
        const pct = Math.round((1 - optimized.length / originalBytes) * 100);
        this.logger.log(
          `Image compressed: ${formatBytes(originalBytes)} -> ${formatBytes(optimized.length)} (-${pct}%)`,
        );
        return {
          buffer: optimized,
          mimeType: 'image/webp',
          ext: 'webp',
          originalBytes,
          optimizedBytes: optimized.length,
          compressed: true,
        };
      }
    } catch (err: any) {
      this.logger.warn(`Image optimization skipped (fallback to original): ${err?.message || err}`);
    }

    return {
      buffer,
      mimeType: originalMime || 'image/png',
      ext: origExt,
      originalBytes,
      optimizedBytes: originalBytes,
      compressed: false,
    };
  }

  /**
   * Compresses HSK Listening speech audio to 64 kbps mono 44.1 kHz CBR MP3 via ffmpeg-static:
   *  - Keeps 44.1 kHz sample rate so Mandarin sibilants (x/q/s/sh/z/zh) stay crystal clear
   *  - Mono 64 kbps CBR delivers ~128 kbps stereo equivalent speech clarity + exact browser seek accuracy
   *  - Strips bulky metadata/embedded cover art (-vn -map_metadata -1)
   *  - Only replaces original if the output is genuinely smaller (avoids bloating low-bitrate inputs)
   */
  async optimizeAudio(
    buffer: Buffer,
    originalMime = 'audio/mpeg',
    originalName = 'audio.mp3',
  ): Promise<OptimizedMediaResult> {
    const originalBytes = buffer.length;
    const origExt = path.extname(originalName).replace(/^\./, '').toLowerCase() || 'mp3';

    if (!ffmpegPath) {
      this.logger.warn('ffmpeg-static binary not found; uploading original audio uncompressed.');
      return {
        buffer,
        mimeType: originalMime || 'audio/mpeg',
        ext: origExt,
        originalBytes,
        optimizedBytes: originalBytes,
        compressed: false,
      };
    }

    const token = randomUUID();
    const inPath = path.join(os.tmpdir(), `hsk-in-${token}.${origExt}`);
    const outPath = path.join(os.tmpdir(), `hsk-out-${token}.mp3`);

    try {
      await fs.writeFile(inPath, buffer);
      await execFileAsync(
        ffmpegPath,
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          inPath,
          '-vn',
          '-map_metadata',
          '-1',
          '-ac',
          '1',
          '-ar',
          '44100',
          '-c:a',
          'libmp3lame',
          '-b:a',
          '64k',
          '-compression_level',
          '2',
          outPath,
        ],
        { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
      );

      const optimized = await fs.readFile(outPath);
      if (optimized.length > 0 && optimized.length < originalBytes) {
        const pct = Math.round((1 - optimized.length / originalBytes) * 100);
        this.logger.log(
          `Audio compressed (64k mono 44.1kHz): ${formatBytes(originalBytes)} -> ${formatBytes(optimized.length)} (-${pct}%)`,
        );
        return {
          buffer: optimized,
          mimeType: 'audio/mpeg',
          ext: 'mp3',
          originalBytes,
          optimizedBytes: optimized.length,
          compressed: true,
        };
      }
    } catch (err: any) {
      this.logger.warn(`Audio optimization skipped (fallback to original): ${err?.message || err}`);
    } finally {
      await Promise.allSettled([fs.unlink(inPath), fs.unlink(outPath)]);
    }

    return {
      buffer,
      mimeType: originalMime || 'audio/mpeg',
      ext: origExt,
      originalBytes,
      optimizedBytes: originalBytes,
      compressed: false,
    };
  }
}
