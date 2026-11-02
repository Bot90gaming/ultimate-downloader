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
      const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/extract-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch {
      // fallback to internal scraper
    }
  }

  const rawUrl = req.method === 'POST' ? req.body?.url : req.query?.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const pageRes = await fetch(rawUrl.trim(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!pageRes.ok) {
      return res.status(400).json({ error: `Failed to fetch page (${pageRes.status})` });
    }

    const html = await pageRes.text();
    const images: any[] = [];
    const seen = new Set<string>();

    // 1. Regex find all img src
    const imgRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
    let match;
    let count = 0;

    while ((match = imgRegex.exec(html)) !== null && count < 60) {
      let src = match[1];
      if (src.startsWith('//')) {
        src = 'https:' + src;
      } else if (src.startsWith('/')) {
        try {
          const parsed = new URL(rawUrl.trim());
          src = `${parsed.protocol}//${parsed.host}${src}`;
        } catch {
          continue;
        }
      }

      if (src.startsWith('http') && !seen.has(src) && !src.includes('data:image')) {
        seen.add(src);
        count++;
        const ext = src.split(/[#?]/)[0].split('.').pop() || 'jpg';
        images.push({
          id: `img_${Date.now()}_${count}`,
          url: src,
          thumbnailUrl: src,
          extension: ext.length > 5 ? 'jpg' : ext,
          alt: `Image ${count}`,
        });
      }
    }

    return res.status(200).json({
      images,
      totalCount: images.length,
      pageUrl: rawUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Image extraction failed' });
  }
}
