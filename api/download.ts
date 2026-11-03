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

  const backendUrl = process.env.BACKEND_URL || 'https://forty-active-kay-retrieval.trycloudflare.com';
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
      return res.status(502).json({
        error: `Could not reach backend worker at ${backendUrl}: ${err.message}`,
      });
    }
  }

  return res.status(503).json({
    error:
      'Video downloads require an active backend engine (FFmpeg & yt-dlp). Vercel only hosts the web frontend. Please connect your running backend in App Settings (e.g., Cloudflare tunnel or your server URL) to start downloading.',
  });
}
