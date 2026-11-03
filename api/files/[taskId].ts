import { Readable } from 'stream';
import * as dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Range');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const taskId = req.query.taskId || req.query.id;
  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Missing taskId parameter' });
  }

  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return res.status(503).json({ error: 'Backend engine not configured.' });
  }

  const cleanBackend = backendUrl.replace(/\/+$/, '');

  if (req.method === 'DELETE') {
    try {
      const response = await fetch(`${cleanBackend}/api/files/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json().catch(() => ({ success: true }));
      return res.status(response.status).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    const upstreamUrl = `${cleanBackend}/api/files/${encodeURIComponent(taskId)}`;
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        ...(req.headers.range ? { range: req.headers.range } : {}),
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        return res.status(response.status).json(JSON.parse(errText));
      } catch {
        return res.status(response.status).send(errText);
      }
    }

    // Forward streaming headers
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
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err: any) {
    if (!res.headersSent) {
      return res.status(502).json({ error: `Failed to proxy file download: ${err.message}` });
    }
  }
}
