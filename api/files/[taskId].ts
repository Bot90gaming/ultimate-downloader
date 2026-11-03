import { Readable } from 'stream';
import * as dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Range');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const taskId = req.query.taskId || req.query.id;
  const targetUrl = req.query.url;
  const rawFileName = req.query.name || req.query.filename || `media_${taskId || Date.now()}.mp4`;
  const fileName = decodeURIComponent(rawFileName);

  // Handle DELETE or purge request
  if (req.method === 'DELETE' || (req.method === 'POST' && req.url?.includes('delete'))) {
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl && taskId) {
      try {
        await fetch(`${backendUrl.replace(/\/+$/, '')}/api/files/${encodeURIComponent(taskId)}`, {
          method: 'DELETE',
          signal: AbortSignal.timeout(6000),
        });
      } catch {}
    }
    return res.status(200).json({
      success: true,
      deleted: true,
      message: `Task ${taskId} purged from serverless storage. Zero permanent retention.`,
    });
  }

  // 1. If BACKEND_URL is set, attempt upstream proxy first
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl && taskId) {
    try {
      const cleanBackend = backendUrl.replace(/\/+$/, '');
      const upstreamUrl = `${cleanBackend}/api/files/${encodeURIComponent(taskId)}`;
      const response = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          ...(req.headers.range ? { range: req.headers.range } : {}),
        },
      });

      if (response.ok) {
        const contentDisposition = response.headers.get('content-disposition');
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const contentRange = response.headers.get('content-range');
        const acceptRanges = response.headers.get('accept-ranges');

        if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);
        if (contentType) res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentRange) res.setHeader('Content-Range', contentRange);
        if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

        res.status(response.status);

        if (response.body) {
          const nodeStream = (Readable as any).fromWeb(response.body);
          return nodeStream.pipe(res);
        }
        return res.end();
      }
    } catch (err: any) {
      console.warn('Backend proxy file fetch failed, attempting direct stream:', err.message);
    }
  }

  // 2. Direct Serverless Streaming Handler
  if (targetUrl && typeof targetUrl === 'string') {
    try {
      const upstreamRes = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          ...(req.headers.range ? { range: req.headers.range } : {}),
        },
      });

      if (!upstreamRes.ok) {
        return res.status(upstreamRes.status).json({
          error: `Failed to fetch remote media stream (${upstreamRes.status})`,
        });
      }

      const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
      const contentLength = upstreamRes.headers.get('content-length');
      const contentRange = upstreamRes.headers.get('content-range');
      const acceptRanges = upstreamRes.headers.get('accept-ranges');

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

      res.status(upstreamRes.status);

      if (upstreamRes.body) {
        const nodeStream = (Readable as any).fromWeb(upstreamRes.body);
        return nodeStream.pipe(res);
      }
      return res.end();
    } catch (err: any) {
      if (!res.headersSent) {
        return res.status(502).json({ error: `Direct stream failed: ${err.message}` });
      }
      return;
    }
  }

  // If no targetUrl was passed and no backend file was found
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send(`Ultimate Downloader task ${taskId || 'complete'}`);
}
