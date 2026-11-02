import { spawn, ChildProcess } from 'child_process';
import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import type { Response } from 'express';
import type {
  DownloadRequest,
  DownloadProgress,
  DownloadStatus,
  MediaMetadata,
  MediaFormat,
} from '../../../shared/types';
import { mediaExtractor } from './mediaExtractor';
import { ffmpegService } from './ffmpegService';
import { imageBatchArchiver } from './imageBatchArchiver';
import { CookieHelper } from './cookieHelper';

interface InternalTask {
  progress: DownloadProgress;
  request: DownloadRequest;
  abortController?: AbortController;
  childProcess?: ChildProcess;
  tempFilePath?: string;
  finalFilePath?: string;
}

export class DownloadManager {
  private tasks: Map<string, InternalTask> = new Map();
  private sseClients: Set<Response> = new Set();
  private downloadsDir: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.downloadsDir = path.resolve(process.cwd(), '..', 'downloads');
    if (!fs.existsSync(this.downloadsDir)) {
      try {
        fs.mkdirSync(this.downloadsDir, { recursive: true });
      } catch {
        // Fallback to local downloads if parent is not writable
        this.downloadsDir = path.resolve(process.cwd(), 'downloads');
        if (!fs.existsSync(this.downloadsDir)) {
          fs.mkdirSync(this.downloadsDir, { recursive: true });
        }
      }
    }

    this.startHeartbeat();
  }

  public getDownloadsDir(): string {
    return this.downloadsDir;
  }

  /**
   * Registers a client response stream for SSE updates.
   */
  public addSseClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    this.sseClients.add(res);

    // Initial greeting
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'SSE connection established', clientCount: this.sseClients.size })}\n\n`);

    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  /**
   * Broadcasts Server-Sent Events to all active listeners.
   */
  public broadcast(eventName: string, data: any): void {
    const jsonStr = JSON.stringify(data);
    // Send both named event and default message event for universal SSE client compatibility
    const payload = `event: ${eventName}\ndata: ${jsonStr}\n\ndata: ${jsonStr}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.sseClients) {
        try {
          client.write(': heartbeat\n\n');
        } catch {
          this.sseClients.delete(client);
        }
      }
    }, 25000);
    this.heartbeatInterval.unref();
  }

  /**
   * Creates a new download task and starts asynchronous processing.
   */
  public createDownloadTask(request: DownloadRequest): { taskId: string; progress: DownloadProgress } {
    const taskId = uuidv4();

    const progress: DownloadProgress = {
      taskId,
      status: 'queued',
      progressPercentage: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speedBytesPerSecond: 0,
      etaSeconds: 0,
      downloadUrl: `/api/files/${taskId}`,
      timestamp: Date.now(),
    };

    const internalTask: InternalTask = {
      progress,
      request,
      abortController: new AbortController(),
    };

    this.tasks.set(taskId, internalTask);
    this.broadcast('progress', progress);

    // Execute in background
    setImmediate(() => {
      this.runTaskPipeline(taskId).catch((err) => {
        this.handleTaskError(taskId, err);
      });
    });

    return { taskId, progress };
  }

  /**
   * Main download task lifecycle pipeline.
   */
  private async runTaskPipeline(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const req = task.request;

    // 1. Fetch metadata
    this.updateTaskProgress(taskId, { status: 'fetching_info' });
    let metadata: MediaMetadata;
    try {
      metadata = await mediaExtractor.extractInfo(req.url);
    } catch (err: any) {
      throw new Error(`Failed to inspect media at ${req.url}: ${err.message}`);
    }

    // Check cancellation
    if (task.abortController?.signal.aborted) {
      this.updateTaskProgress(taskId, { status: 'cancelled' });
      return;
    }

    // 2. Case: Batch Images Archive (ZIP)
    if (req.extractImagesAsZip || req.mediaType === 'gallery' || req.selectedImageUrls?.length) {
      await this.handleImageZipDownload(taskId, req, metadata);
      return;
    }

    // 3. Case: Standard Media Download (Video / Audio)
    await this.handleMediaStreamDownload(taskId, req, metadata);
  }

  /**
   * Handles downloading multiple images into a .zip file.
   */
  private async handleImageZipDownload(
    taskId: string,
    req: DownloadRequest,
    metadata: MediaMetadata
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    this.updateTaskProgress(taskId, { status: 'downloading', progressPercentage: 5 });

    let imageUrls: string[] = req.selectedImageUrls || [];
    if (imageUrls.length === 0 && metadata.images && metadata.images.length > 0) {
      imageUrls = metadata.images.map((img) => img.url);
    }

    if (imageUrls.length === 0) {
      throw new Error('No images available to download as ZIP archive.');
    }

    const safeTitle = this.sanitizeFileName(req.customFilename || metadata.title || 'gallery_images');
    const zipFileName = `${safeTitle}.zip`;
    const zipFilePath = path.join(this.downloadsDir, `${taskId}_${zipFileName}`);

    task.finalFilePath = zipFilePath;
    const writeStream = fs.createWriteStream(zipFilePath);

    await imageBatchArchiver.streamImageZip(imageUrls, writeStream, (processed, total, currentName) => {
      const percentage = Math.round((processed / total) * 95) + 5;
      this.updateTaskProgress(taskId, {
        status: 'downloading',
        progressPercentage: percentage,
        fileName: zipFileName,
      });
    });

    const stat = fs.statSync(zipFilePath);
    this.updateTaskProgress(taskId, {
      status: 'completed',
      progressPercentage: 100,
      fileName: zipFileName,
      filePath: zipFilePath,
      downloadedBytes: stat.size,
      totalBytes: stat.size,
      etaSeconds: 0,
      speedBytesPerSecond: 0,
    });
  }

  /**
   * Handles downloading single video or audio file with yt-dlp or direct stream, plus ffmpeg processing.
   */
  private async handleMediaStreamDownload(
    taskId: string,
    req: DownloadRequest,
    metadata: MediaMetadata
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const isAudioOnly = !!req.audioOnly || req.mediaType === 'audio' || req.formatId?.includes('audio') || req.formatId?.includes('mp3');
    const targetExt = req.extension || (isAudioOnly ? 'mp3' : 'mp4');

    const baseTitle = this.sanitizeFileName(req.customFilename || metadata.title || 'download');
    const finalFileName = `${baseTitle}.${targetExt}`;
    const rawDownloadTemplate = path.join(this.downloadsDir, `${taskId}_raw.%(ext)s`);
    const finalFilePath = path.join(this.downloadsDir, `${taskId}_${finalFileName}`);

    task.finalFilePath = finalFilePath;

    this.updateTaskProgress(taskId, {
      status: 'downloading',
      fileName: finalFileName,
      progressPercentage: 5,
    });

    const ytDlpStatus = await mediaExtractor.isYtDlpAvailable();
    const canUseYtDlp = ytDlpStatus.available && metadata.platform !== 'direct';

    let downloadSucceeded = false;
    let actualRawPath: string | null = null;
    let ytDlpError: string | null = null;

    if (canUseYtDlp) {
      try {
        await this.downloadWithYtDlp(taskId, req.url, rawDownloadTemplate, req.formatId, isAudioOnly);
        // Find generated file matching taskId_raw.*
        const matches = fs.readdirSync(this.downloadsDir).filter((f) => f.startsWith(`${taskId}_raw`));
        if (matches.length > 0) {
          actualRawPath = path.join(this.downloadsDir, matches[0]);
          task.tempFilePath = actualRawPath;
          downloadSucceeded = true;
        }
      } catch (err: any) {
        ytDlpError = err.message || 'yt-dlp download failed';
        console.warn(`[DownloadManager] yt-dlp download failed: ${ytDlpError}. Trying direct stream fallback...`);
      }
    }

    if (!downloadSucceeded) {
      // Find best direct URL from formats or metadata
      const matchedFormat = metadata.formats.find((f) => f.formatId === req.formatId) || metadata.formats[0];
      const directUrl = matchedFormat?.directUrl || (metadata.platform === 'direct' ? metadata.url : null);
      if (!directUrl) {
        throw new Error(ytDlpError || 'Media stream download failed: no valid stream or direct URL available.');
      }
      const fallbackRaw = path.join(this.downloadsDir, `${taskId}_raw.${targetExt}`);
      await this.downloadDirectStream(taskId, directUrl, fallbackRaw);
      actualRawPath = fallbackRaw;
      task.tempFilePath = actualRawPath;
    }

    if (!actualRawPath || !fs.existsSync(actualRawPath)) {
      throw new Error(`Download stream failed: temporary output not found for task ${taskId}`);
    }

    // 4. Post-processing: image passthrough, trimming, or universal audio/video conversion
    const isImage = metadata.mediaType === 'image' || req.mediaType === 'image';
    if (isImage) {
      const actualExt = path.extname(actualRawPath).replace('.', '') || 'jpg';
      const resolvedFinalPath = path.join(this.downloadsDir, `${taskId}_${baseTitle}.${actualExt}`);
      fs.renameSync(actualRawPath, resolvedFinalPath);
      task.finalFilePath = resolvedFinalPath;
    } else {
      let needsUniversalTranscode = false;
      let probe: any = null;
      try {
        probe = await ffmpegService.probeMedia(actualRawPath);
      } catch {
        // ignore probe error
      }

      if (!isAudioOnly) {
        const vCodec = probe?.video?.codec?.toLowerCase() || '';
        const aCodec = probe?.audio?.codec?.toLowerCase() || '';
        const isUniversalVideo = vCodec.includes('h264') || vCodec.includes('avc');
        const isUniversalAudio = aCodec.includes('aac') || aCodec.includes('mp3');
        if (!isUniversalVideo || !isUniversalAudio) {
          needsUniversalTranscode = true;
        }
      }

      const needsTrimming = (req.trimStart && req.trimStart.trim() !== '') || (req.trimEnd && req.trimEnd.trim() !== '');
      const needsConversion = isAudioOnly && !actualRawPath.endsWith(`.${targetExt}`);

      if (needsTrimming || needsConversion || needsUniversalTranscode) {
        this.updateTaskProgress(taskId, { status: 'processing', progressPercentage: 90 });

        await ffmpegService.processMedia({
          inputPath: actualRawPath,
          outputPath: finalFilePath,
          audioOnly: isAudioOnly,
          audioFormat: targetExt as any,
          trimStart: req.trimStart,
          trimEnd: req.trimEnd,
          onProgress: (percent) => {
            this.updateTaskProgress(taskId, {
              status: 'processing',
              progressPercentage: Math.min(99, 90 + Math.round(percent * 0.09)),
            });
          },
        });

        // Cleanup raw intermediate file
        if (fs.existsSync(actualRawPath) && actualRawPath !== finalFilePath) {
          try { fs.unlinkSync(actualRawPath); } catch {}
        }
      } else {
        // Determine final destination path (preserve actual extension if yt-dlp created mp3/mkv/mp4)
        const actualExt = path.extname(actualRawPath).replace('.', '') || targetExt;
        const resolvedFinalPath = path.join(this.downloadsDir, `${taskId}_${baseTitle}.${actualExt}`);
        fs.renameSync(actualRawPath, resolvedFinalPath);
        task.finalFilePath = resolvedFinalPath;
      }
    }

    // 5. Complete
    const finalStat = task.finalFilePath && fs.existsSync(task.finalFilePath) ? fs.statSync(task.finalFilePath) : null;
    const finalSize = finalStat ? finalStat.size : task.progress.totalBytes;
    const resolvedName = task.finalFilePath ? path.basename(task.finalFilePath).replace(`${taskId}_`, '') : finalFileName;

    this.updateTaskProgress(taskId, {
      status: 'completed',
      progressPercentage: 100,
      fileName: resolvedName,
      filePath: task.finalFilePath,
      downloadUrl: `/api/files/${taskId}`,
      downloadedBytes: finalSize,
      totalBytes: finalSize,
      speedBytesPerSecond: 0,
      etaSeconds: 0,
    });
  }

  /**
   * Spawns yt-dlp to download and parses console progress.
   */
  private downloadWithYtDlp(
    taskId: string,
    url: string,
    outputPath: string,
    formatId?: string,
    audioOnly?: boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const task = this.tasks.get(taskId);
      if (!task) return reject(new Error('Task not found'));

      const ytDlpStatus = mediaExtractor['ytDlpPath'] || 'yt-dlp';

      const cookieArgs = CookieHelper.getCookieArgs();
      const args = [
        '--no-playlist',
        '--newline',
        '--no-check-certificates',
        '--js-runtimes',
        'node:/usr/bin/node',
        '-S',
        'res,vcodec:h264,acodec:m4a',
        ...cookieArgs,
        '-o',
        outputPath,
      ];

      if (audioOnly || formatId?.includes('audio') || formatId?.includes('mp3')) {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
      } else if (formatId === '1080p' || formatId === 'mp4-1080p') {
        args.push('-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best', '--merge-output-format', 'mp4');
      } else if (formatId === '720p' || formatId === 'mp4-720p') {
        args.push('-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]/best', '--merge-output-format', 'mp4');
      } else if (formatId === '480p') {
        args.push('-f', 'bestvideo[height<=480]+bestaudio/best[height<=480]/best', '--merge-output-format', 'mp4');
      } else if (formatId === '360p') {
        args.push('-f', 'bestvideo[height<=360]+bestaudio/best[height<=360]/best', '--merge-output-format', 'mp4');
      } else if (formatId && formatId !== 'best' && formatId !== 'original') {
        args.push('-f', `${formatId}+bestaudio/best`, '--merge-output-format', 'mp4');
      } else {
        args.push('-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4');
      }

      args.push(url);

      const child = spawn(ytDlpStatus, args);
      task.childProcess = child;

      let lastReportedPercent = 5;
      let isAudioStream = false;
      let lastErrorMessage = '';

      const parseOutput = (data: Buffer) => {
        const text = data.toString();

        if (text.includes('ERROR:')) {
          lastErrorMessage = text.trim();
        }

        if (text.includes('[Merger]') || text.includes('[ExtractAudio]') || text.includes('Deleting original file')) {
          this.updateTaskProgress(taskId, {
            status: 'processing',
            progressPercentage: 95,
          });
          return;
        }

        if (text.includes('Destination:') && (text.includes('.f251.') || text.includes('.f140.') || text.includes('audio'))) {
          isAudioStream = true;
        }

        const percentMatch = text.match(/\[download\]\s+([\d.]+)%/);
        const sizeMatch = text.match(/of\s+(?:~\s*)?([\d.]+\s*[KMGT]?i?B)/i);
        const speedMatch = text.match(/at\s+([\d.]+\s*[KMGT]?i?B\/s)/i);
        const etaMatch = text.match(/ETA\s+(\d{2}:\d{2}(?::\d{2})?)/);

        if (percentMatch) {
          const rawPercent = parseFloat(percentMatch[1]);
          if (!isNaN(rawPercent)) {
            const mappedPercent = isAudioStream
              ? 85 + Math.round((rawPercent / 100) * 9)
              : 5 + Math.round((rawPercent / 100) * 80);

            if (mappedPercent >= lastReportedPercent) {
              lastReportedPercent = mappedPercent;
            }

            let etaSecs = 0;
            if (etaMatch) {
              const parts = etaMatch[1].split(':').map((p: string) => parseInt(p, 10));
              if (parts.length === 2) etaSecs = parts[0] * 60 + parts[1];
              else if (parts.length === 3) etaSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }

            let speedBytes = 0;
            if (speedMatch) {
              const speedStr = speedMatch[1].trim();
              let multiplier = 1;
              if (/k/i.test(speedStr)) multiplier = 1024;
              else if (/m/i.test(speedStr)) multiplier = 1024 * 1024;
              else if (/g/i.test(speedStr)) multiplier = 1024 * 1024 * 1024;
              const num = parseFloat(speedStr);
              if (!isNaN(num)) speedBytes = Math.round(num * multiplier);
            }

            let totalBytes = task.progress.totalBytes || 0;
            if (sizeMatch) {
              const sizeStr = sizeMatch[1].trim();
              let multiplier = 1;
              if (/k/i.test(sizeStr)) multiplier = 1024;
              else if (/m/i.test(sizeStr)) multiplier = 1024 * 1024;
              else if (/g/i.test(sizeStr)) multiplier = 1024 * 1024 * 1024;
              const num = parseFloat(sizeStr);
              if (!isNaN(num)) totalBytes = Math.max(totalBytes, Math.round(num * multiplier));
            }

            const downloadedBytes = totalBytes > 0 ? Math.round((lastReportedPercent / 100) * totalBytes) : 0;

            this.updateTaskProgress(taskId, {
              status: 'downloading',
              progressPercentage: Math.min(99, lastReportedPercent),
              downloadedBytes,
              totalBytes: totalBytes > 0 ? totalBytes : undefined,
              speedBytesPerSecond: speedBytes,
              etaSeconds: etaSecs,
            });
          }
        }
      };

      child.stdout.on('data', parseOutput);
      child.stderr.on('data', parseOutput);

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        task.childProcess = undefined;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(lastErrorMessage || `yt-dlp process exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Direct streaming download with chunk progress monitoring.
   */
  private async downloadDirectStream(
    taskId: string,
    url: string,
    outputPath: string
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    const response: AxiosResponse<Readable> = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 30000,
      signal: task.abortController?.signal,
    });

    const totalBytes = parseInt(String(response.headers['content-length'] || '0'), 10);
    let downloadedBytes = 0;
    let lastTime = Date.now();
    let lastDownloaded = 0;

    const outStream = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        const elapsedSecs = (now - lastTime) / 1000;

        if (elapsedSecs >= 0.5 || downloadedBytes === totalBytes) {
          const speed = Math.round((downloadedBytes - lastDownloaded) / elapsedSecs);
          const eta = totalBytes > 0 && speed > 0 ? Math.round((totalBytes - downloadedBytes) / speed) : 0;
          const percentage = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 90) : 50;

          lastTime = now;
          lastDownloaded = downloadedBytes;

          this.updateTaskProgress(taskId, {
            status: 'downloading',
            progressPercentage: percentage,
            downloadedBytes,
            totalBytes: totalBytes > 0 ? totalBytes : downloadedBytes,
            speedBytesPerSecond: speed,
            etaSeconds: eta,
          });
        }
      });

      response.data.pipe(outStream);

      outStream.on('finish', () => {
        resolve();
      });

      outStream.on('error', (err) => {
        reject(err);
      });

      response.data.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Updates task progress in store and emits SSE event.
   */
  public updateTaskProgress(taskId: string, patch: Partial<DownloadProgress>): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    Object.assign(task.progress, patch, { timestamp: Date.now() });
    this.broadcast('progress', task.progress);

    if (task.progress.status === 'completed') {
      this.broadcast('complete', task.progress);
    } else if (task.progress.status === 'error') {
      this.broadcast('error', task.progress);
    }
  }

  private handleTaskError(taskId: string, error: any): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const isAborted = task.abortController?.signal.aborted;
    const finalStatus: DownloadStatus = isAborted ? 'cancelled' : 'error';

    // Clean up temporary files
    if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
      try { fs.unlinkSync(task.tempFilePath); } catch {}
    }

    this.updateTaskProgress(taskId, {
      status: finalStatus,
      error: error.message || 'Unknown download error',
    });
  }

  /**
   * Returns a specific task progress object.
   */
  public getTask(taskId: string): DownloadProgress | undefined {
    return this.tasks.get(taskId)?.progress;
  }

  /**
   * Returns all tasks in memory.
   */
  public getAllTasks(): DownloadProgress[] {
    return Array.from(this.tasks.values()).map((t) => t.progress);
  }

  /**
   * Cancels an ongoing task.
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.childProcess) {
      try { task.childProcess.kill('SIGTERM'); } catch {}
    }

    if (task.abortController) {
      try { task.abortController.abort(); } catch {}
    }

    if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
      try { fs.unlinkSync(task.tempFilePath); } catch {}
    }

    this.updateTaskProgress(taskId, { status: 'cancelled' });
    return true;
  }

  /**
   * Deletes task record and its downloaded file on disk.
   */
  public deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    this.cancelTask(taskId);

    if (task.finalFilePath && fs.existsSync(task.finalFilePath)) {
      try { fs.unlinkSync(task.finalFilePath); } catch {}
    }

    this.tasks.delete(taskId);
    return true;
  }

  /**
   * Returns verified file path and safe file name for streaming completed downloads.
   */
  public getCompletedFile(taskId: string): { filePath: string; fileName: string } | null {
    const task = this.tasks.get(taskId);
    if (!task || task.progress.status !== 'completed') {
      return null;
    }

    let filePath = task.finalFilePath;

    if (!filePath || !fs.existsSync(filePath)) {
      // Look for any file in downloadsDir starting with taskId and not containing _raw
      try {
        const matches = fs.readdirSync(this.downloadsDir).filter((f) => f.startsWith(taskId) && !f.includes('_raw'));
        if (matches.length > 0) {
          filePath = path.join(this.downloadsDir, matches[0]);
          task.finalFilePath = filePath;
        }
      } catch {
        // ignore
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    const fileName = task.progress.fileName || path.basename(filePath).replace(`${taskId}_`, '');
    return {
      filePath,
      fileName,
    };
  }

  private sanitizeFileName(input: string): string {
    return (
      input
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100) || 'media'
    );
  }
}

export const downloadManager = new DownloadManager();
