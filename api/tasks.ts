export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const backendUrl = process.env.BACKEND_URL || 'https://forty-active-kay-retrieval.trycloudflare.com';
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/tasks`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch {
      // ignore
    }
  }

  return res.status(200).json([]);
}
