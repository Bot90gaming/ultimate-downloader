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
    // 2. Direct Media File Handler (.mp4, .webm, .mp3, etc.)
    const isDirectMedia = /\.(mp4|mkv|webm|mov|avi|mp3|wav|ogg|m4a|flac|aac)(?:[?#]|$)/i.test(url);
    if (isDirectMedia) {
      let cleanTitle = 'Direct Media';
      let ext = 'mp4';
      try {
        const parsed = new URL(url);
        const rawName = parsed.pathname.split('/').pop() || 'media.mp4';
        ext = (rawName.split('.').pop() || 'mp4').toLowerCase();
        cleanTitle = decodeURIComponent(rawName)
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .trim();
      } catch {}

      const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext);

      return res.status(200).json({
        id: `direct_${Date.now()}`,
        url,
        title: cleanTitle || 'Direct Media Stream',
        description: `Direct media stream from ${new URL(url).hostname}`,
        thumbnail: isAudio
          ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop&q=80',
        platform: 'generic',
        mediaType: isAudio ? 'audio' : 'video',
        sourceUrl: url,
        duration: 0,
        formats: isAudio
          ? [
              {
                formatId: 'best_audio',
                extension: ext,
                resolution: 'Lossless / Original Audio',
                qualityLabel: ext.toUpperCase(),
                hasVideo: false,
                hasAudio: true,
              },
            ]
          : [
              {
                formatId: 'best',
                extension: ext,
                resolution: 'Original Quality (Direct Stream)',
                qualityLabel: 'Original',
                hasVideo: true,
                hasAudio: true,
              },
              {
                formatId: 'audio_only',
                extension: 'mp3',
                resolution: 'Audio Stream (MP3)',
                qualityLabel: 'Audio',
                hasVideo: false,
                hasAudio: true,
              },
            ],
      });
    }

    // 3. YouTube Handler
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      let title = 'YouTube Video';
      let authorName = 'YouTube Creator';
      let authorUrl = `https://www.youtube.com/watch?v=${videoId}`;
      let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          { signal: AbortSignal.timeout(6000) }
        );
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
          {
            formatId: 'best',
            extension: 'mp4',
            resolution: 'Best Available (H.264 / AAC MP4)',
            qualityLabel: 'Universal (H.264)',
            hasVideo: true,
            hasAudio: true,
            codec: 'H.264 / AAC',
          },
          {
            formatId: '1080p',
            extension: 'mp4',
            resolution: '1080p Full HD (H.264 / AAC)',
            qualityLabel: '1080p H.264',
            hasVideo: true,
            hasAudio: true,
            codec: 'H.264 / AAC',
          },
          {
            formatId: '720p',
            extension: 'mp4',
            resolution: '720p HD (H.264 / AAC)',
            qualityLabel: '720p H.264',
            hasVideo: true,
            hasAudio: true,
            codec: 'H.264 / AAC',
          },
          {
            formatId: 'audio_only',
            extension: 'mp3',
            resolution: 'Audio Extraction (MP3/AAC 320k)',
            qualityLabel: 'Audio',
            hasVideo: false,
            hasAudio: true,
            codec: 'AAC / MP3',
          },
        ],
      });
    }

    // 4. TikTok Handler
    if (url.includes('tiktok.com')) {
      let title = 'TikTok Video';
      let authorName = 'TikTok Creator';
      let avatar = '';
      let thumbnail = '';
      let directPlay = '';
      let directMusic = '';
      let duration = 0;

      // Follow redirects if short link (vm.tiktok.com, vt.tiktok.com, /t/)
      let canonicalUrl = url;
      if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com') || url.includes('/t/')) {
        try {
          const redirectRes = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(6000),
          });
          if (redirectRes.url) {
            canonicalUrl = redirectRes.url.split('?')[0];
          }
        } catch {}
      }

      // Try TikWM API first (extracts real title, real cover, real author, direct no-watermark MP4)
      try {
        const tikwmRes = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(canonicalUrl)}`, {
          signal: AbortSignal.timeout(8000),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        if (tikwmRes.ok) {
          const tikData: any = await tikwmRes.json();
          if (tikData.code === 0 && tikData.data) {
            const d = tikData.data;
            if (d.title) title = d.title;
            if (d.author?.nickname) authorName = d.author.nickname;
            else if (d.author?.unique_id) authorName = `@${d.author.unique_id}`;
            if (d.author?.avatar) avatar = d.author.avatar;
            if (d.cover) {
              // Route through proxy with inline=true to guarantee zero CORS/hotlink blocking
              thumbnail = `/api/download-image?url=${encodeURIComponent(d.cover)}&inline=true`;
            } else if (d.origin_cover) {
              thumbnail = `/api/download-image?url=${encodeURIComponent(d.origin_cover)}&inline=true`;
            }
            if (d.play) directPlay = d.play;
            if (d.music || d.music_info?.play) directMusic = d.music || d.music_info?.play;
            if (d.duration) duration = d.duration;
          }
        }
      } catch (err: any) {
        console.warn('TikWM extractor failed, trying oEmbed:', err.message);
      }

      // Fallback to oEmbed if thumbnail still empty
      if (!thumbnail) {
        try {
          const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`, {
            signal: AbortSignal.timeout(5000),
          });
          if (oembedRes.ok) {
            const oembed: any = await oembedRes.json();
            if (oembed.title) title = oembed.title;
            if (oembed.author_name) authorName = oembed.author_name;
            if (oembed.thumbnail_url) {
              thumbnail = `/api/download-image?url=${encodeURIComponent(oembed.thumbnail_url)}&inline=true`;
            }
          }
        } catch {}
      }

      return res.status(200).json({
        id: `tt_${Date.now()}`,
        url,
        title,
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        platform: 'tiktok',
        mediaType: 'video',
        sourceUrl: directPlay || url,
        duration,
        durationFormatted: duration
          ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
          : undefined,
        author: {
          name: authorName,
          avatar: avatar ? `/api/download-image?url=${encodeURIComponent(avatar)}&inline=true` : undefined,
        },
        formats: [
          {
            formatId: 'best',
            extension: 'mp4',
            resolution: 'HD No Watermark (H.264 / AAC)',
            qualityLabel: 'Universal MP4',
            hasVideo: true,
            hasAudio: true,
            codec: 'H.264 / AAC',
            directUrl: directPlay || undefined,
          },
          {
            formatId: 'audio_only',
            extension: 'mp3',
            resolution: 'Sound / Music (AAC / MP3)',
            qualityLabel: 'Audio',
            hasVideo: false,
            hasAudio: true,
            codec: 'AAC',
            directUrl: directMusic || directPlay || undefined,
          },
        ],
      });
    }

    // 5. Vimeo Handler
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
              {
                formatId: 'best',
                extension: 'mp4',
                resolution: 'Highest Quality',
                qualityLabel: 'Original',
                hasVideo: true,
                hasAudio: true,
              },
              {
                formatId: 'audio_only',
                extension: 'mp3',
                resolution: 'Audio Only (MP3)',
                qualityLabel: 'Audio',
                hasVideo: false,
                hasAudio: true,
              },
            ],
          });
        }
      } catch {
        // fallback
      }
    }

    // 6. OpenGraph & HTML Scraper for Social Media & Webpages
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const getMeta = (prop: string) => {
        const m =
          html.match(new RegExp(`<meta[^>]*(?:property|name)=["'](?:og:|twitter:)?${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
          html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["'](?:og:|twitter:)?${prop}["']`, 'i'));
        return m ? m[1] : '';
      };

      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = getMeta('title') || (titleMatch ? titleMatch[1].trim() : 'Media File');
      const thumbnail = getMeta('image');
      const description = getMeta('description');
      const videoSrc = getMeta('video') || getMeta('video:secure_url');

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
        thumbnail:
          thumbnail ||
          'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
        platform,
        mediaType: 'video',
        sourceUrl: videoSrc || url,
        duration: 0,
        formats: [
          {
            formatId: 'best',
            extension: 'mp4',
            resolution: 'Best Available (H.264 / AAC MP4)',
            qualityLabel: 'Universal MP4',
            hasVideo: true,
            hasAudio: true,
            codec: 'H.264 / AAC',
          },
          {
            formatId: '720p',
            extension: 'mp4',
            resolution: 'Standard 720p (H.264 / AAC)',
            qualityLabel: '720p H.264',
            hasVideo: true,
            hasAudio: true,
            codec: 'H.264 / AAC',
          },
          {
            formatId: 'audio_only',
            extension: 'mp3',
            resolution: 'Audio Only (AAC / MP3)',
            qualityLabel: 'Audio',
            hasVideo: false,
            hasAudio: true,
            codec: 'AAC',
          },
        ],
      });
    }

    return res.status(400).json({ error: 'Could not fetch page details from the provided URL' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Media extraction error' });
  }
}
