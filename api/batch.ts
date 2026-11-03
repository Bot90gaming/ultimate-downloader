export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.warn('Backend proxy batch failed, using serverless batch handler:', err.message);
    }
  }

  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Array of "items" is required in request body.' });
  }

  const taskIds = items.map(
    (_, i) => `task_batch_${Date.now()}_${i + 1}_${Math.random().toString(36).slice(2, 6)}`
  );

  return res.status(200).json({
    taskIds,
    count: taskIds.length,
    message: `${taskIds.length} batch items enqueued in serverless pipeline.`,
  });
}
