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
import { CookieHelper } from '../services/cookieHelper';

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
 * DELETE & POST /api/tasks/:taskId/cancel
 * Cancels active download task and cleans up associated files.
 */
const handleCancelTask = (req: Request, res: Response) => {
  const { taskId } = req.params;
  const deleted = downloadManager.deleteTask(taskId);

  if (!deleted) {
    res.status(404).json({ error: `Task not found or could not be removed: ${taskId}` });
    return;
  }

  res.json({ success: true, message: `Task ${taskId} cancelled and deleted.` });
};

router.delete('/tasks/:taskId', handleCancelTask);
router.post('/tasks/:taskId/cancel', handleCancelTask);
router.post('/tasks/:taskId/delete', handleCancelTask);

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
 * Automatically deletes the file from server storage once download finishes.
 */
router.get('/files/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const fileInfo = downloadManager.getCompletedFile(taskId);

  if (!fileInfo) {
    res.status(404).json({
      error: `File for task ${taskId} is not ready or has already been downloaded and purged.`,
    });
    return;
  }

  res.download(fileInfo.filePath, fileInfo.fileName, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to stream file: ${err.message}` });
      }
      return;
    }

    // Client successfully completed downloading file!
    console.log(`[AutoDelete] Client finished downloading ${fileInfo.fileName} (Task: ${taskId}). Scheduling storage purge in 10s...`);
    downloadManager.scheduleFileCleanup(taskId, 10000);
  });
});

/**
 * DELETE /api/files/:taskId
 * Immediately purges media files for a completed or cancelled task from server storage.
 */
router.delete('/files/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const deleted = downloadManager.deleteDownloadedFiles(taskId);
  res.json({
    success: true,
    deleted,
    message: `Storage files for task ${taskId} purged from server.`,
  });
});

/**
 * POST /api/files/:taskId/delete
 * Alternative endpoint to immediately purge media files from server storage.
 */
router.post('/files/:taskId/delete', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const deleted = downloadManager.deleteDownloadedFiles(taskId);
  res.json({
    success: true,
    deleted,
    message: `Storage files for task ${taskId} purged from server.`,
  });
});

/**
 * POST /api/extract-images & /api/images/extract
 * Extracts all full-resolution images from a webpage or gallery URL.
 */
const handleExtractImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = req.body?.url || req.query?.url;
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
};

router.post('/extract-images', handleExtractImages);
router.post('/images/extract', handleExtractImages);
router.get('/images/extract', handleExtractImages);

/**
 * GET /api/download-image
 * Proxies and streams any image URL as an attachment so browser saves real file without CORS blocking.
 */
router.get('/download-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  const filename = (req.query.filename as string) || 'image.jpg';

  if (!imageUrl) {
    res.status(400).json({ error: 'Missing "url" query parameter' });
    return;
  }

  try {
    const axios = (await import('axios')).default;
    const imgRes = await axios.get(imageUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: new URL(imageUrl).origin,
      },
      timeout: 20000,
    });

    const contentType = String(imgRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    imgRes.data.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to download image: ${err.message}` });
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

/**
 * GET /api/cookies/status
 * Reports cookie authentication state for YouTube/social bot challenges.
 */
router.get('/cookies/status', (req: Request, res: Response) => {
  const filePath = CookieHelper.resolveCookieFilePath();
  const browserCandidate = CookieHelper.resolveBrowserCandidate();
  res.json({
    hasCookies: CookieHelper.hasCookies(),
    cookiePath: filePath ? path.basename(filePath) : null,
    browserProfile: browserCandidate || null,
  });
});

/**
 * POST /api/cookies/upload
 * Saves user-provided cookies.txt for authentication.
 */
router.post('/cookies/upload', (req: Request, res: Response) => {
  const { cookiesContent } = req.body;
  if (!cookiesContent || typeof cookiesContent !== 'string') {
    res.status(400).json({ error: 'cookiesContent string is required.' });
    return;
  }
  const savedPath = CookieHelper.saveCookies(cookiesContent);
  res.json({ success: true, savedPath });
});

export default router;
