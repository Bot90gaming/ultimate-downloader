export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({ ...data, proxied: true });
      }
    } catch {
      // ignore
    }
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasYtDlp: false,
    hasFfmpeg: false,
    serverless: true,
    message: 'Ultimate Downloader Vercel Gateway Active',
  });
}
