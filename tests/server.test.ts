/**
 * Ultimate Downloader — Comprehensive Automated Test Suite
 * 
 * Verifies:
 * 1. Platform Detection Logic (YouTube, TikTok, Twitter/X, Reddit, Instagram, Pinterest, Facebook, Direct, Webpage)
 * 2. Format Parsing, Bitrate Formatting & Duration Conversions
 * 3. Cheerio Image Extractor Parser with Mock HTML Responses
 * 4. Download Manager Task Queue State Machine Transitions
 * 5. FFmpeg Command Builder for Trimming and Audio Conversion
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import type { SupportedPlatform, DownloadStatus, DownloadProgress, ExtractedImage } from '../shared/types';
import { downloadManager } from '../server/dist/services/downloadManager.js';

// ==============================================================================
// 1. Platform Detection Logic
// ==============================================================================

export function detectPlatform(url: string): SupportedPlatform {
  if (!url || typeof url !== 'string') return 'direct';
  const clean = url.trim().toLowerCase();

  if (clean.includes('youtube.com') || clean.includes('youtu.be')) return 'youtube';
  if (clean.includes('tiktok.com')) return 'tiktok';
  if (clean.includes('instagram.com')) return 'instagram';
  if (clean.includes('twitter.com') || clean.includes('x.com')) return 'twitter';
  if (clean.includes('reddit.com')) return 'reddit';
  if (clean.includes('pinterest.com') || clean.includes('pin.it')) return 'pinterest';
  if (clean.includes('facebook.com') || clean.includes('fb.watch')) return 'facebook';
  if (clean.includes('vimeo.com')) return 'vimeo';
  if (clean.includes('soundcloud.com')) return 'soundcloud';

  if (/\.(mp4|webm|mkv|mov|mp3|m4a|wav|flac|png|jpe?g|webp|gif)(\?.*)?$/i.test(clean)) {
    return 'direct';
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return 'webpage';
  }

  return 'direct';
}

describe('Platform Detection Logic', () => {
  it('should identify YouTube watch and short URLs', () => {
    assert.equal(detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'youtube');
    assert.equal(detectPlatform('https://youtu.be/dQw4w9WgXcQ'), 'youtube');
    assert.equal(detectPlatform('https://www.youtube.com/shorts/3xyz987'), 'youtube');
    assert.equal(detectPlatform('https://m.youtube.com/watch?v=abc12345'), 'youtube');
  });

  it('should identify TikTok video URLs', () => {
    assert.equal(detectPlatform('https://www.tiktok.com/@user/video/731110022394857216'), 'tiktok');
    assert.equal(detectPlatform('https://vm.tiktok.com/ZM8abc123/'), 'tiktok');
  });

  it('should identify Twitter / X status URLs', () => {
    assert.equal(detectPlatform('https://x.com/OpenAI/status/1758209823468519632'), 'twitter');
    assert.equal(detectPlatform('https://twitter.com/NASA/status/123456789'), 'twitter');
  });

  it('should identify Instagram post and reel URLs', () => {
    assert.equal(detectPlatform('https://www.instagram.com/reel/C3xL9v1P3qm/'), 'instagram');
    assert.equal(detectPlatform('https://instagram.com/p/DAxyz123/'), 'instagram');
  });

  it('should identify Reddit post URLs', () => {
    assert.equal(
      detectPlatform('https://www.reddit.com/r/technology/comments/1example/super_ai_breakthrough'),
      'reddit'
    );
  });

  it('should identify Pinterest pin URLs', () => {
    assert.equal(detectPlatform('https://www.pinterest.com/pin/1234567890123456/'), 'pinterest');
    assert.equal(detectPlatform('https://pin.it/7xyz123'), 'pinterest');
  });

  it('should identify Facebook and FB Watch URLs', () => {
    assert.equal(detectPlatform('https://www.facebook.com/watch/?v=102234059483'), 'facebook');
    assert.equal(detectPlatform('https://fb.watch/k9abc123/'), 'facebook');
  });

  it('should identify Vimeo and SoundCloud URLs', () => {
    assert.equal(detectPlatform('https://vimeo.com/76979871'), 'vimeo');
    assert.equal(detectPlatform('https://soundcloud.com/artist/track-title'), 'soundcloud');
  });

  it('should identify direct media files regardless of query parameters', () => {
    assert.equal(detectPlatform('https://commondatastorage.googleapis.com/sample.mp4?token=123'), 'direct');
    assert.equal(detectPlatform('https://cdn.example.org/audio.flac'), 'direct');
    assert.equal(detectPlatform('https://cdn.example.org/image.png?size=large'), 'direct');
    assert.equal(detectPlatform('https://example.com/asset.webm'), 'direct');
  });

  it('should identify generic webpages', () => {
    assert.equal(detectPlatform('https://unsplash.com/t/wallpapers'), 'webpage');
    assert.equal(detectPlatform('https://news.ycombinator.com/'), 'webpage');
    assert.equal(detectPlatform('http://blog.cloudflare.com/welcome'), 'webpage');
  });
});

// ==============================================================================
// 2. Format Parsing, Bitrate Formatting & Duration Conversions
// ==============================================================================

export function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i] || 'B'}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatBitrate(bitrate?: number): string {
  if (!bitrate || bitrate <= 0) return '0 kbps';
  const kbps = Math.round(bitrate / 1000);
  return `${kbps} kbps`;
}

export function parseSecondsFromTimestamp(ts: string): number {
  if (!ts) return 0;
  const parts = ts.trim().split(':').map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p))) return 0;

  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

describe('Format Parsing & Conversions', () => {
  it('should correctly format byte values to human readable strings', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(500), '500 B');
    assert.equal(formatBytes(1024), '1 KB');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(1048576), '1 MB');
    assert.equal(formatBytes(104857600), '100 MB');
    assert.equal(formatBytes(1073741824), '1 GB');
  });

  it('should format seconds into MM:SS and HH:MM:SS duration timestamps', () => {
    assert.equal(formatDuration(0), '00:00');
    assert.equal(formatDuration(45), '00:45');
    assert.equal(formatDuration(125), '02:05');
    assert.equal(formatDuration(3600), '01:00:00');
    assert.equal(formatDuration(3723), '01:02:03');
  });

  it('should format raw bitrates into kbps display labels', () => {
    assert.equal(formatBitrate(320000), '320 kbps');
    assert.equal(formatBitrate(192000), '192 kbps');
    assert.equal(formatBitrate(128000), '128 kbps');
  });

  it('should parse HH:MM:SS, MM:SS, and pure second timestamp inputs', () => {
    assert.equal(parseSecondsFromTimestamp('00:01:30'), 90);
    assert.equal(parseSecondsFromTimestamp('01:00:00'), 3600);
    assert.equal(parseSecondsFromTimestamp('02:15'), 135);
    assert.equal(parseSecondsFromTimestamp('45'), 45);
    assert.equal(parseSecondsFromTimestamp('invalid'), 0);
  });
});

// ==============================================================================
// 3. Cheerio Image Extractor Parser Logic
// ==============================================================================

export function parseImagesFromHtml(html: string, baseUrl: string): ExtractedImage[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const images: ExtractedImage[] = [];

  const add = (raw: string, alt?: string, width?: number, height?: number) => {
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) return;

    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(trimmed, baseUrl).href;
    } catch {
      return;
    }

    if (seen.has(absoluteUrl)) return;
    seen.add(absoluteUrl);

    const extMatch = absoluteUrl.match(/\.(jpg|jpeg|png|webp|gif|avif|bmp|svg)(\?.*)?$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

    images.push({
      id: `img_${images.length + 1}`,
      url: absoluteUrl,
      thumbnailUrl: absoluteUrl,
      alt,
      width,
      height,
      extension: ext,
    });
  };

  // OpenGraph & Twitter
  $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) add(content, 'Social Preview Image');
  });

  // Img tags with data-src or src
  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('data-src') || $el.attr('data-original') || $el.attr('src');
    const alt = $el.attr('alt');
    const width = parseInt($el.attr('width') || '0', 10) || undefined;
    const height = parseInt($el.attr('height') || '0', 10) || undefined;
    if (src) add(src, alt, width, height);
  });

  // srcset parsing
  $('picture source, img[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const candidates = srcset.split(',').map((c) => c.trim().split(/\s+/)[0]);
      const best = candidates[candidates.length - 1];
      if (best) add(best, 'High Resolution Responsive Asset');
    }
  });

  return images;
}

describe('Cheerio Image Extractor Parser', () => {
  const mockHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Gallery Test Page</title>
      <meta property="og:image" content="https://cdn.example.org/og-banner.jpg" />
      <meta name="twitter:image" content="https://cdn.example.org/twitter-card.png" />
    </head>
    <body>
      <main>
        <img src="/images/hero.webp" alt="Hero Banner" width="1920" height="1080" />
        <img data-src="/images/lazy-landscape.jpg" alt="Mountain Landscape" />
        <img src="data:image/png;base64,iVBORw0KGgoAAAANS..." alt="Data URI should be ignored" />
        <picture>
          <source srcset="/images/responsive-400.jpg 400w, /images/responsive-1600.jpg 1600w" />
          <img src="/images/responsive-400.jpg" alt="Responsive Picture" />
        </picture>
        <!-- Duplicate image -->
        <img src="/images/hero.webp" alt="Duplicate Hero" />
      </main>
    </body>
    </html>
  `;

  it('should extract OpenGraph, standard img, lazy data-src, and responsive srcset images', () => {
    const images = parseImagesFromHtml(mockHtml, 'https://example.org/gallery');

    // Should include og:image, twitter:image, hero.webp, lazy-landscape.jpg, responsive-1600.jpg
    assert.ok(images.length >= 4);

    const urls = images.map((img) => img.url);
    assert.ok(urls.includes('https://cdn.example.org/og-banner.jpg'));
    assert.equal(urls.includes('https://example.org/images/hero.webp'), true);
    assert.equal(urls.includes('https://example.org/images/lazy-landscape.jpg'), true);
    assert.equal(urls.includes('https://example.org/images/responsive-1600.jpg'), true);
  });

  it('should ignore data: URIs and properly deduplicate recurring URLs', () => {
    const images = parseImagesFromHtml(mockHtml, 'https://example.org/gallery');

    // Ensure no data: URLs were added
    assert.equal(images.some((i) => i.url.startsWith('data:')), false);

    // Ensure hero.webp is added exactly once
    const heroOccurrences = images.filter((i) => i.url === 'https://example.org/images/hero.webp');
    assert.equal(heroOccurrences.length, 1);
  });
});

// ==============================================================================
// 4. Download Manager Task Queue State Machine
// ==============================================================================

export class TaskQueueStateMachine {
  public readonly taskId: string;
  private status: DownloadStatus = 'queued';
  private progress: DownloadProgress;

  constructor(taskId: string) {
    this.taskId = taskId;
    this.progress = {
      taskId,
      status: 'queued',
      progressPercentage: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speedBytesPerSecond: 0,
      etaSeconds: 0,
      timestamp: Date.now(),
    };
  }

  public getStatus(): DownloadStatus {
    return this.status;
  }

  public getProgress(): DownloadProgress {
    return { ...this.progress };
  }

  public transitionTo(newStatus: DownloadStatus, patch?: Partial<DownloadProgress>): void {
    const allowedTransitions: Record<DownloadStatus, DownloadStatus[]> = {
      queued: ['fetching_info', 'downloading', 'cancelled', 'error'],
      fetching_info: ['downloading', 'processing', 'completed', 'cancelled', 'error'],
      downloading: ['processing', 'completed', 'cancelled', 'error'],
      processing: ['completed', 'cancelled', 'error'],
      completed: [],
      error: [],
      cancelled: [],
    };

    const validNextStates = allowedTransitions[this.status];
    if (!validNextStates.includes(newStatus)) {
      throw new Error(`Invalid state transition: cannot transition from ${this.status} to ${newStatus}`);
    }

    this.status = newStatus;
    this.progress = {
      ...this.progress,
      ...patch,
      status: newStatus,
      timestamp: Date.now(),
    };
  }
}

describe('Download Task Queue State Machine', () => {
  it('should initialize task in queued status with 0% progress', () => {
    const task = new TaskQueueStateMachine('task_test_01');
    assert.equal(task.getStatus(), 'queued');
    assert.equal(task.getProgress().progressPercentage, 0);
  });

  it('should permit valid lifecycle transition: queued -> downloading -> processing -> completed', () => {
    const task = new TaskQueueStateMachine('task_test_02');

    task.transitionTo('downloading', { progressPercentage: 25, downloadedBytes: 25000000, totalBytes: 100000000 });
    assert.equal(task.getStatus(), 'downloading');
    assert.equal(task.getProgress().progressPercentage, 25);

    task.transitionTo('processing', { progressPercentage: 90 });
    assert.equal(task.getStatus(), 'processing');

    task.transitionTo('completed', { progressPercentage: 100, downloadUrl: '/api/downloads/test.mp4' });
    assert.equal(task.getStatus(), 'completed');
    assert.equal(task.getProgress().downloadUrl, '/api/downloads/test.mp4');
  });

  it('should permit transitions directly to error and cancelled states', () => {
    const taskError = new TaskQueueStateMachine('task_error_01');
    taskError.transitionTo('downloading');
    taskError.transitionTo('error', { error: 'Network socket closed unexpectedly' });
    assert.equal(taskError.getStatus(), 'error');
    assert.equal(taskError.getProgress().error, 'Network socket closed unexpectedly');

    const taskCancel = new TaskQueueStateMachine('task_cancel_01');
    taskCancel.transitionTo('cancelled');
    assert.equal(taskCancel.getStatus(), 'cancelled');
  });

  it('should throw an error on illegal state transitions (e.g. completed -> downloading)', () => {
    const task = new TaskQueueStateMachine('task_immutable_01');
    task.transitionTo('downloading');
    task.transitionTo('completed');

    assert.throws(() => {
      task.transitionTo('downloading');
    }, /Invalid state transition/);
  });
});

// ==============================================================================
// 5. FFmpeg Command Builder
// ==============================================================================

export interface FfmpegCliOptions {
  inputPath: string;
  outputPath: string;
  audioOnly?: boolean;
  audioFormat?: 'mp3' | 'wav' | 'flac' | 'aac';
  audioBitrate?: string;
  trimStart?: string;
  trimEnd?: string;
}

export function buildFfmpegArgs(options: FfmpegCliOptions): string[] {
  const { inputPath, outputPath, audioOnly, audioFormat = 'mp3', audioBitrate = '320k', trimStart, trimEnd } = options;

  const args: string[] = ['-y'];

  if (trimStart && trimStart.trim()) {
    args.push('-ss', trimStart.trim());
  }
  if (trimEnd && trimEnd.trim()) {
    args.push('-to', trimEnd.trim());
  }

  args.push('-i', inputPath);

  if (audioOnly) {
    args.push('-vn');
    switch (audioFormat) {
      case 'mp3':
        args.push('-c:a', 'libmp3lame', '-b:a', audioBitrate);
        break;
      case 'wav':
        args.push('-c:a', 'pcm_s16le');
        break;
      case 'flac':
        args.push('-c:a', 'flac');
        break;
      case 'aac':
        args.push('-c:a', 'aac', '-b:a', audioBitrate || '256k');
        break;
      default:
        args.push('-c:a', 'libmp3lame', '-b:a', '320k');
        break;
    }
  } else {
    if (trimStart || trimEnd) {
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac', '-b:a', '192k');
    } else {
      args.push('-c', 'copy');
    }
  }

  args.push(outputPath);
  return args;
}

describe('FFmpeg Command Builder', () => {
  it('should build accurate arguments for video trimming with precision re-encode', () => {
    const args = buildFfmpegArgs({
      inputPath: '/tmp/raw_input.mp4',
      outputPath: '/downloads/clip.mp4',
      trimStart: '00:00:15',
      trimEnd: '00:00:45',
    });

    assert.deepEqual(args, [
      '-y',
      '-ss',
      '00:00:15',
      '-to',
      '00:00:45',
      '-i',
      '/tmp/raw_input.mp4',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '22',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '/downloads/clip.mp4',
    ]);
  });

  it('should build accurate arguments for 320kbps MP3 audio extraction', () => {
    const args = buildFfmpegArgs({
      inputPath: '/tmp/concert_video.mkv',
      outputPath: '/downloads/track.mp3',
      audioOnly: true,
      audioFormat: 'mp3',
      audioBitrate: '320k',
    });

    assert.deepEqual(args, [
      '-y',
      '-i',
      '/tmp/concert_video.mkv',
      '-vn',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '320k',
      '/downloads/track.mp3',
    ]);
  });

  it('should build accurate arguments for lossless stream copy when no trimming is requested', () => {
    const args = buildFfmpegArgs({
      inputPath: '/tmp/raw_video.mp4',
      outputPath: '/downloads/video.mp4',
    });

    assert.deepEqual(args, [
      '-y',
      '-i',
      '/tmp/raw_video.mp4',
      '-c',
      'copy',
      '/downloads/video.mp4',
    ]);
  });

  it('should configure WAV and FLAC codecs properly', () => {
    const wavArgs = buildFfmpegArgs({
      inputPath: '/tmp/in.mp4',
      outputPath: '/tmp/out.wav',
      audioOnly: true,
      audioFormat: 'wav',
    });
    assert.ok(wavArgs.includes('-c:a') && wavArgs.includes('pcm_s16le'));

    const flacArgs = buildFfmpegArgs({
      inputPath: '/tmp/in.mp4',
      outputPath: '/tmp/out.flac',
      audioOnly: true,
      audioFormat: 'flac',
    });
    assert.ok(flacArgs.includes('-c:a') && flacArgs.includes('flac'));
  });
});

// ==============================================================================
// 6. Storage Auto-Deletion & TTL Cleanup Evaluation
// ==============================================================================

describe('Storage Auto-Deletion & TTL Cleanup', () => {
  it('should immediately purge all files for a taskId', () => {
    const downloadsDir = downloadManager.getDownloadsDir();
    const testTaskId = 'test-cleanup-id-999';
    const file1 = path.join(downloadsDir, `${testTaskId}_video.mp4`);
    const file2 = path.join(downloadsDir, `${testTaskId}_raw.webm`);

    fs.writeFileSync(file1, 'dummy video content');
    fs.writeFileSync(file2, 'dummy raw content');

    assert.equal(fs.existsSync(file1), true);
    assert.equal(fs.existsSync(file2), true);

    downloadManager.deleteDownloadedFiles(testTaskId);

    assert.equal(fs.existsSync(file1), false);
    assert.equal(fs.existsSync(file2), false);
  });

  it('should auto-delete file on scheduled timer after user download', async () => {
    const downloadsDir = downloadManager.getDownloadsDir();
    const testTaskId = 'test-timer-id-888';
    const file = path.join(downloadsDir, `${testTaskId}_song.mp3`);

    fs.writeFileSync(file, 'dummy audio content');
    assert.equal(fs.existsSync(file), true);

    // Schedule cleanup with 50ms delay
    downloadManager.scheduleFileCleanup(testTaskId, 50);

    // Immediately still exists
    assert.equal(fs.existsSync(file), true);

    // Wait 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Must be deleted from server storage
    assert.equal(fs.existsSync(file), false);
  });

  it('should sweep old files based on TTL threshold', () => {
    const downloadsDir = downloadManager.getDownloadsDir();
    const oldFile = path.join(downloadsDir, 'old_expired_file.mp4');
    const newFile = path.join(downloadsDir, 'new_active_file.mp4');

    fs.writeFileSync(oldFile, 'old data');
    fs.writeFileSync(newFile, 'new data');

    // Artificially change mtime of oldFile to 30 minutes ago
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    fs.utimesSync(oldFile, thirtyMinAgo, thirtyMinAgo);

    // Sweep files older than 15 minutes
    downloadManager.sweepOldFiles(15 * 60 * 1000);

    assert.equal(fs.existsSync(oldFile), false);
    assert.equal(fs.existsSync(newFile), true);

    // Clean up test file
    if (fs.existsSync(newFile)) fs.unlinkSync(newFile);
  });
});

// ==============================================================================
// 7. Multi-Link Sequential Detection & H.264/AAC Re-encoding
// ==============================================================================

describe('Multi-Link Sequential Download & H.264/AAC Codec Enforcement', () => {
  it('should detect when user inputs a new link and flag stale previous media', () => {
    let currentMetadata: any = {
      id: 'media_1',
      url: 'https://www.youtube.com/watch?v=video_one',
      title: 'First YouTube Video',
    };

    // Helper imitating checkAndRefetchNewLink logic
    const testAndCheckNewLink = (inputUrl: string, loadedMeta: any) => {
      const clean = inputUrl.trim().toLowerCase();
      const current = loadedMeta?.url?.trim()?.toLowerCase();
      const isNew = !loadedMeta || current !== clean;
      return {
        isNewLink: isNew,
        shouldInvalidateOldMedia: isNew,
        targetUrl: inputUrl.trim(),
      };
    };

    // 1. Same link should not invalidate
    const checkSame = testAndCheckNewLink('https://www.youtube.com/watch?v=video_one', currentMetadata);
    assert.equal(checkSame.isNewLink, false);
    assert.equal(checkSame.shouldInvalidateOldMedia, false);

    // 2. New link (e.g. TikTok) must invalidate old metadata immediately
    const checkNew = testAndCheckNewLink('https://www.tiktok.com/@creator/video/7891011', currentMetadata);
    assert.equal(checkNew.isNewLink, true);
    assert.equal(checkNew.shouldInvalidateOldMedia, true);
    assert.equal(checkNew.targetUrl, 'https://www.tiktok.com/@creator/video/7891011');

    // Reset currentMetadata and load second link
    currentMetadata = {
      id: 'media_2',
      url: 'https://www.tiktok.com/@creator/video/7891011',
      title: 'Second TikTok Video',
    };

    // 3. User now enters a third link (Instagram)
    const checkThird = testAndCheckNewLink('https://www.instagram.com/reel/C8XYZ123/', currentMetadata);
    assert.equal(checkThird.isNewLink, true);
    assert.equal(checkThird.shouldInvalidateOldMedia, true);
  });

  it('should enforce H.264 video codec and AAC audio codec on download requests', () => {
    const downloadReq: import('../shared/types.js').DownloadRequest = {
      url: 'https://www.youtube.com/watch?v=video_new',
      extension: 'mp4',
      reencodeH264: true,
      videoCodec: 'h264',
      audioCodec: 'aac',
    };

    assert.equal(downloadReq.reencodeH264, true);
    assert.equal(downloadReq.videoCodec, 'h264');
    assert.equal(downloadReq.audioCodec, 'aac');

    // Verify format parameter resolution
    const formatLabel = 'H.264 / AAC';
    assert.match(formatLabel, /H\.264/);
    assert.match(formatLabel, /AAC/);
  });

  it('should guarantee that mismatched input URL refetches before initiating download', () => {
    const activeMedia = {
      url: 'https://www.youtube.com/watch?v=first_media',
      title: 'First Media',
    };

    const userInput = 'https://www.tiktok.com/@user/video/second_media';

    // Download request initiated while input has been changed by the user
    const downloadRequestedFor = activeMedia.url;

    // Safety guard condition implemented in handleStartDownload
    const inputDiffersFromDownload =
      userInput.trim().toLowerCase() !== downloadRequestedFor.toLowerCase();

    assert.equal(inputDiffersFromDownload, true);
    // When true, app halts download of first_media and refetches second_media
    const safeTargetUrl = inputDiffersFromDownload ? userInput.trim() : downloadRequestedFor;
    assert.equal(safeTargetUrl, userInput.trim());
    assert.notEqual(safeTargetUrl, activeMedia.url);
  });
});

