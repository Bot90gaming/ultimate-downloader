import { Readable } from 'stream';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const imageUrl = req.query.url as string;
  const filename = (req.query.filename as string) || 'image.jpg';
  const isInline = req.query.inline === 'true' || req.query.preview === 'true';

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  try {
    let referer = 'https://google.com';
    try {
      const parsed = new URL(imageUrl);
      if (parsed.hostname.includes('tiktok') || parsed.hostname.includes('byteoversea') || parsed.hostname.includes('ibyteimg')) {
        referer = 'https://www.tiktok.com/';
      } else {
        referer = parsed.origin;
      }
    } catch {}

    const upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: referer,
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Failed to fetch image (${upstream.status})` });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    
    if (isInline) {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    }

    if (upstream.body) {
      const nodeStream = (Readable as any).fromWeb(upstream.body);
      return nodeStream.pipe(res);
    }
    return res.end();
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to download image: ${err.message}` });
  }
}
