import * as dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. If BACKEND_URL is set, proxy directly to it
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.warn('Backend proxy failed, falling back to serverless streamer:', err.message);
    }
  }

  const { url, extension, customFilename, title } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid "url" is required in request body.' });
  }

  const taskId = `task_sv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const ext = extension || 'mp4';

  let fileName = customFilename;
  if (!fileName) {
    if (title && typeof title === 'string') {
      fileName = `${title.slice(0, 50).replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_')}.${ext}`;
    } else {
      try {
        const parsed = new URL(url);
        const namePart = parsed.pathname.split('/').pop();
        if (namePart && namePart.includes('.')) {
          fileName = decodeURIComponent(namePart);
        } else {
          fileName = `media_${Date.now()}.${ext}`;
        }
      } catch {
        fileName = `media_${Date.now()}.${ext}`;
      }
    }
  }

  const downloadUrl = `/api/files/${taskId}?url=${encodeURIComponent(url)}&name=${encodeURIComponent(fileName)}`;

  return res.status(200).json({
    taskId,
    status: 'downloading',
    downloadUrl,
    fileName,
    message: 'Serverless streaming task initialized.',
  });
}
