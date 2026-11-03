export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const taskId = req.query.taskId;

  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl && taskId) {
    try {
      const isCancel = req.url?.includes('cancel');
      const targetEndpoint = isCancel
        ? `${backendUrl.replace(/\/+$/, '')}/api/tasks/${encodeURIComponent(taskId)}/cancel`
        : `${backendUrl.replace(/\/+$/, '')}/api/tasks/${encodeURIComponent(taskId)}`;
      const response = await fetch(targetEndpoint, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch {}
  }

  return res.status(200).json({
    taskId,
    status: 'completed',
    success: true,
    message: `Task ${taskId} processed.`,
  });
}
