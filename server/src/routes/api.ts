import { Router, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import type {
  SystemHealth,
  MediaMetadata,
  DownloadRequest,
  DownloadProgress,
} from '../../../shared/types';
import { mediaExtractor } from '../services/mediaExtractor';
import { downloadManager } from '../services/downloadManager';
import { ffmpegService } from '../services/ffmpegService';
import { imageBatchArchiver } from '../services/imageBatchArchiver';

const router = Router();

/**
 * GET /api/health
 * Returns complete system health, subsystem status, uptime, disk free bytes.
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ffmpegStatus = await ffmpegService.isAvailable();
    const ytDlpStatus = await mediaExtractor.isYtDlpAvailable();
    const downloadsDir = downloadManager.getDownloadsDir();

    let diskFreeBytes: number | undefined = undefined;
    try {
      const stats = fs.statfsSync(downloadsDir);
      diskFreeBytes = stats.bavail * stats.bsize;
    } catch {
      // ignore statfs failures if unsupported
    }

    const health: SystemHealth = {
      status: ffmpegStatus.available ? 'ok' : 'degraded',
      version: '1.0.0',
      uptime: Math.round(process.uptime()),
      hasFfmpeg: ffmpegStatus.available,
      hasYtDlp: ytDlpStatus.available,
      downloadsDir,
      diskFreeBytes,
    };

    res.json(health);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/info
 * Extracts metadata, format list, and gallery from a given media URL query parameter.
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const url = (req.query.url as string) || '';
    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ error: 'Valid "url" query parameter is required.' });
      return;
    }

    const info: MediaMetadata = await mediaExtractor.extractInfo(url.trim());
    res.json(info);
  } catch (err: any) {
    res.status(422).json({
      error: err.message || 'Failed to inspect media URL.',
    });
  }
});

/**
 * POST /api/info
 * Extracts metadata, format list, and gallery from a given media URL in body or query.
 */
router.post('/info', async (req: Request, res: Response) => {
  try {
    const url = req.body?.url || req.query?.url;
    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ error: 'Valid URL is required in request body.' });
      return;
    }

    const info: MediaMetadata = await mediaExtractor.extractInfo(url.trim());
    res.json(info);
  } catch (err: any) {
    res.status(422).json({
      error: err.message || 'Failed to inspect media URL.',
    });
  }
});

/**
 * POST /api/download
 * Starts a download task with options (formatId, audioOnly, trimStart, trimEnd, customFilename).
 */
router.post('/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const downloadReq: DownloadRequest = req.body;

    if (!downloadReq || !downloadReq.url || !downloadReq.url.trim()) {
      res.status(400).json({ error: 'Valid "url" is required in request body.' });
      return;
    }

    const { taskId, progress } = downloadManager.createDownloadTask(downloadReq);

    res.status(202).json({
      taskId,
      status: progress.status,
      downloadUrl: progress.downloadUrl,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks
 * Returns all download tasks currently in memory.
 */
router.get('/tasks', (req: Request, res: Response) => {
  const tasks = downloadManager.getAllTasks();
  res.json(tasks);
});

/**
 * GET /api/tasks/:taskId
 * Returns the status and progress of a specific task.
 */
router.get('/tasks/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = downloadManager.getTask(taskId);

  if (!task) {
    res.status(404).json({ error: `Task not found with id: ${taskId}` });
    return;
  }

  res.json(task);
});

/**
 * DELETE /api/tasks/:taskId
 * Cancels active download task and cleans up associated files.
 */
router.delete('/tasks/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const deleted = downloadManager.deleteTask(taskId);

  if (!deleted) {
    res.status(404).json({ error: `Task not found or could not be removed: ${taskId}` });
    return;
  }

  res.json({ success: true, message: `Task ${taskId} cancelled and deleted.` });
});

/**
 * GET /api/events
 * Real-time Server-Sent Events (SSE) broadcasting download progress.
 */
router.get('/events', (req: Request, res: Response) => {
  downloadManager.addSseClient(res);
});

/**
 * GET /api/files/:taskId
 * Streams completed media download to the client as an attachment.
 */
router.get('/files/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const fileInfo = downloadManager.getCompletedFile(taskId);

  if (!fileInfo) {
    res.status(404).json({
      error: `File for task ${taskId} is not ready or has expired.`,
    });
    return;
  }

  res.download(fileInfo.filePath, fileInfo.fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: `Failed to stream file: ${err.message}` });
    }
  });
});

/**
 * POST /api/extract-images
 * Extracts all full-resolution images from a webpage or gallery URL.
 */
router.post('/extract-images', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ error: 'Valid URL is required.' });
      return;
    }

    const crawlResult = await imageBatchArchiver.crawlImages(url.trim());
    res.json(crawlResult);
  } catch (err: any) {
    res.status(422).json({
      error: err.message || 'Failed to extract images from target webpage.',
    });
  }
});

/**
 * POST /api/download-zip
 * Downloads a ZIP archive of specified image URLs on the fly.
 */
router.post('/download-zip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageUrls, zipName } = req.body;

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      res.status(400).json({ error: 'Array of "imageUrls" is required.' });
      return;
    }

    const safeZipName = (zipName || 'extracted_images').replace(/[^a-zA-Z0-9_\-]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeZipName}.zip"`);

    await imageBatchArchiver.streamImageZip(imageUrls, res);
  } catch (err) {
    next(err);
  }
});

export default router;
