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

  // 1. If BACKEND_URL is set, proxy directly
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/info`, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.warn('Backend proxy failed, using standalone extractor:', err.message);
    }
  }

  const rawUrl = req.method === 'POST' ? req.body?.url : req.query?.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  const url = rawUrl.trim();

  try {
    // 2. YouTube Handler
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      let title = 'YouTube Video';
      let authorName = 'YouTube Creator';
      let authorUrl = `https://www.youtube.com/watch?v=${videoId}`;
      let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
          signal: AbortSignal.timeout(6000),
        });
        if (oembedRes.ok) {
          const oembed: any = await oembedRes.json();
          if (oembed.title) title = oembed.title;
          if (oembed.author_name) authorName = oembed.author_name;
          if (oembed.author_url) authorUrl = oembed.author_url;
          if (oembed.thumbnail_url) thumbnail = oembed.thumbnail_url;
        }
      } catch {
        // Fallback to defaults
      }

      return res.status(200).json({
        id: videoId,
        url,
        title,
        thumbnail,
        platform: 'youtube',
        mediaType: 'video',
        sourceUrl: url,
        duration: 0,
        durationFormatted: 'HD',
        author: {
          name: authorName,
          url: authorUrl,
          avatar: thumbnail,
        },
        formats: [
          { formatId: 'best', extension: 'mp4', resolution: 'Best Available (Up to 4K / 1080p)', qualityLabel: 'Original', hasVideo: true, hasAudio: true },
          { formatId: '1080p', extension: 'mp4', resolution: '1080p Full HD (60fps)', qualityLabel: '1080p', hasVideo: true, hasAudio: true },
          { formatId: '720p', extension: 'mp4', resolution: '720p HD (Fast)', qualityLabel: '720p', hasVideo: true, hasAudio: true },
          { formatId: 'audio_only', extension: 'mp3', resolution: 'Audio Extraction (MP3 320k)', qualityLabel: 'Audio', hasVideo: false, hasAudio: true },
        ],
      });
    }

    // 3. TikTok Handler
    if (url.includes('tiktok.com')) {
      let title = 'TikTok Video';
      let authorName = 'TikTok Creator';
      let thumbnail = '';

      try {
        const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (oembedRes.ok) {
          const oembed: any = await oembedRes.json();
          if (oembed.title) title = oembed.title;
          if (oembed.author_name) authorName = oembed.author_name;
          if (oembed.thumbnail_url) thumbnail = oembed.thumbnail_url;
        }
      } catch {
        // fallback
      }

      return res.status(200).json({
        id: `tt_${Date.now()}`,
        url,
        title,
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        platform: 'tiktok',
        mediaType: 'video',
        sourceUrl: url,
        duration: 0,
        author: {
          name: authorName,
        },
        formats: [
          { formatId: 'best', extension: 'mp4', resolution: 'HD (No Watermark)', qualityLabel: 'Original', hasVideo: true, hasAudio: true },
          { formatId: 'audio_only', extension: 'mp3', resolution: 'Sound / Music (MP3)', qualityLabel: 'Audio', hasVideo: false, hasAudio: true },
        ],
      });
    }

    // 4. Vimeo Handler
    if (url.includes('vimeo.com')) {
      try {
        const oembedRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (oembedRes.ok) {
          const oembed: any = await oembedRes.json();
          return res.status(200).json({
            id: `vimeo_${oembed.video_id || Date.now()}`,
            url,
            title: oembed.title || 'Vimeo Video',
            thumbnail: oembed.thumbnail_url || '',
            platform: 'vimeo',
            mediaType: 'video',
            sourceUrl: url,
            duration: oembed.duration || 0,
            author: { name: oembed.author_name || 'Vimeo Creator' },
            formats: [
              { formatId: 'best', extension: 'mp4', resolution: 'Highest Quality', qualityLabel: 'Original', hasVideo: true, hasAudio: true },
              { formatId: 'audio_only', extension: 'mp3', resolution: 'Audio Only (MP3)', qualityLabel: 'Audio', hasVideo: false, hasAudio: true },
            ],
          });
        }
      } catch {
        // fallback
      }
    }

    // 5. OpenGraph HTML Scraper for Instagram, Twitter/X, Facebook, Reddit, & Generic
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const getMeta = (prop: string) => {
        const m = html.match(new RegExp(`<meta[^>]*(?:property|name)=["'](?:og:|twitter:)?${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
                  html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["'](?:og:|twitter:)?${prop}["']`, 'i'));
        return m ? m[1] : '';
      };

      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = getMeta('title') || (titleMatch ? titleMatch[1].trim() : 'Media File');
      const thumbnail = getMeta('image');
      const description = getMeta('description');

      let platform: any = 'generic';
      if (url.includes('instagram.com')) platform = 'instagram';
      else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
      else if (url.includes('facebook.com') || url.includes('fb.watch')) platform = 'facebook';
      else if (url.includes('reddit.com')) platform = 'reddit';
      else if (url.includes('pinterest.com')) platform = 'pinterest';

      return res.status(200).json({
        id: `media_${Date.now()}`,
        url,
        title,
        description,
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
        platform,
        mediaType: 'video',
        sourceUrl: url,
        duration: 0,
        formats: [
          { formatId: 'best', extension: 'mp4', resolution: 'Best Available Quality', qualityLabel: 'Original', hasVideo: true, hasAudio: true },
          { formatId: '720p', extension: 'mp4', resolution: 'Standard (720p)', qualityLabel: '720p', hasVideo: true, hasAudio: true },
          { formatId: 'audio_only', extension: 'mp3', resolution: 'Audio Only (MP3)', qualityLabel: 'Audio', hasVideo: false, hasAudio: true },
        ],
      });
    }

    return res.status(400).json({ error: 'Could not fetch page details from the provided URL' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Media extraction error' });
  }
}
