import archiver from 'archiver';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. If BACKEND_URL is set, proxy
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });

      if (response.ok) {
        res.setHeader('Content-Type', 'application/zip');
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);

        const { Readable } = await import('stream');
        if (response.body) {
          const nodeStream = (Readable as any).fromWeb(response.body);
          return nodeStream.pipe(res);
        }
      }
    } catch (err: any) {
      console.warn('Backend proxy zip failed, using serverless archiver:', err.message);
    }
  }

  const { imageUrls, zipName } = req.body || {};
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return res.status(400).json({ error: 'Array of "imageUrls" is required.' });
  }

  const safeZipName = (zipName || 'extracted_images').replace(/[^a-zA-Z0-9_\-]/g, '_');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeZipName}.zip"`);

  const archive = archiver('zip', {
    zlib: { level: 5 },
  });

  archive.on('error', (err: any) => {
    console.error('ZIP archiver error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  });

  archive.pipe(res);

  // Fetch up to 50 images in chunks of 5
  const maxImages = Math.min(imageUrls.length, 50);
  const chunkSize = 5;

  for (let i = 0; i < maxImages; i += chunkSize) {
    const chunk = imageUrls.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (url: string, idx: number) => {
        const itemIndex = i + idx + 1;
        try {
          let referer = 'https://google.com';
          try {
            referer = new URL(url).origin;
          } catch {}

          const imgRes = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              Referer: referer,
            },
            signal: AbortSignal.timeout(10000),
          });

          if (imgRes.ok) {
            const arrayBuf = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            let ext = url.split(/[#?]/)[0].split('.').pop() || 'jpg';
            if (ext.length > 5 || ext.length < 2) ext = 'jpg';
            archive.append(buffer, { name: `image_${itemIndex}.${ext}` });
          }
        } catch (err: any) {
          console.warn(`Failed to include image ${itemIndex} in zip:`, err.message);
        }
      })
    );
  }

  await archive.finalize();
}
