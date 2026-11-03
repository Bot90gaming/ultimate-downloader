import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as dns from 'dns';
import apiRouter from './routes/api';
import { downloadManager } from './services/downloadManager';

// Prefer IPv4 to avoid getaddrinfo EAI_AGAIN on networks without working IPv6
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: ['Content-Range', 'Content-Disposition'],
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure downloads directory exists
const downloadsDir = downloadManager.getDownloadsDir();
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Download handlers that automatically delete file from server storage once client finishes download
const handleDownloadFile = (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(downloadsDir, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: `File not found or has already been downloaded and purged: ${filename}` });
    return;
  }

  const cleanName = filename.replace(/^[0-9a-fA-F-]{36}_/, '');

  res.download(filePath, cleanName, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to stream file: ${err.message}` });
      }
      return;
    }

    console.log(`[AutoDelete] Client finished downloading ${filename}. Scheduling storage purge in 10s...`);
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[AutoDelete] Successfully purged storage file: ${filename}`);
        }
      } catch (delErr) {
        console.warn(`[AutoDelete] Failed to delete ${filename}:`, delErr);
      }
    }, 10000).unref();
  });
};

app.get('/downloads/:filename', handleDownloadFile);
app.get('/api/downloads/:filename', handleDownloadFile);

// Mount API routes
app.use('/api', apiRouter);

// Root informational endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Ultimate Downloader API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      info: 'POST /api/info',
      download: 'POST /api/download',
      tasks: 'GET /api/tasks',
      taskStatus: 'GET /api/tasks/:taskId',
      cancelTask: 'DELETE /api/tasks/:taskId',
      events: 'GET /api/events (SSE)',
      fileDownload: 'GET /api/files/:taskId',
      extractImages: 'POST /api/extract-images',
      downloadZip: 'POST /api/download-zip',
      staticDownloads: 'GET /downloads/:filename',
    },
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    status,
  });
});

// Start HTTP Server only when executed directly
let server: any = null;
if (require.main === module || !process.env.NODE_ENV?.includes('test')) {
  server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🚀 Ultimate Downloader Server running on port ${PORT}`);
    console.log(`📁 Downloads directory: ${downloadsDir}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`===============================================`);
  });
}

// Graceful Shutdown
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force exit after 5 seconds if connections hang
  setTimeout(() => {
    console.error('Forcefully exiting after timeout.');
    process.exit(1);
  }, 5000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
