import { execFile, spawn } from 'child_process';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import type {
  SupportedPlatform,
  MediaType,
  MediaFormat,
  ExtractedImage,
  MediaMetadata,
} from '../../../shared/types';
import { imageBatchArchiver } from './imageBatchArchiver';

export class MediaExtractor {
  private ytDlpPath: string;

  private defaultHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  constructor() {
    this.ytDlpPath = this.resolveYtDlpBinary();
  }

  private resolveYtDlpBinary(): string {
    const home = process.env.HOME || '/home/hoshirun';
    const candidates = [
      path.join(home, '.local/bin/yt-dlp'),
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      path.join(home, 'bin/yt-dlp'),
      'yt-dlp',
    ];
    for (const c of candidates) {
      if (c !== 'yt-dlp' && fs.existsSync(c)) {
        return c;
      }
    }
    return 'yt-dlp';
  }

  /**
   * Checks if yt-dlp is available on the machine.
   */
  public async isYtDlpAvailable(): Promise<{ available: boolean; version?: string; path: string }> {
    return new Promise((resolve) => {
      execFile(this.ytDlpPath, ['--version'], { timeout: 4000 }, (error, stdout) => {
        if (error) {
          resolve({ available: false, path: this.ytDlpPath });
        } else {
          resolve({ available: true, version: stdout.trim(), path: this.ytDlpPath });
        }
      });
    });
  }

  /**
   * Detects the supported platform from any URL.
   */
  public detectPlatform(urlStr: string): SupportedPlatform {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return 'webpage';
    }

    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    if (hostname.includes('tiktok.com')) {
      return 'tiktok';
    }
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    }
    if (hostname.includes('instagram.com')) {
      return 'instagram';
    }
    if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) {
      return 'facebook';
    }
    if (hostname.includes('reddit.com') || hostname.includes('redd.it')) {
      return 'reddit';
    }
    if (hostname.includes('pinterest.com') || hostname.includes('pin.it')) {
      return 'pinterest';
    }
    if (hostname.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (hostname.includes('soundcloud.com')) {
      return 'soundcloud';
    }

    // Direct video / audio / image check
    if (/\.(mp4|webm|mkv|mov|avi|flv|wmv|m4v|mp3|wav|flac|aac|m4a|ogg|opus)(\?.*)?$/i.test(pathname)) {
      return 'direct';
    }
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp|svg)(\?.*)?$/i.test(pathname)) {
      return 'direct';
    }

    return 'webpage';
  }

  /**
   * Inspects and extracts complete metadata, format list, and gallery from a URL.
   */
  public async extractInfo(rawUrl: string): Promise<MediaMetadata> {
    const url = rawUrl.trim();
    if (!url) {
      throw new Error('URL must not be empty.');
    }

    const platform = this.detectPlatform(url);

    // 1. Try yt-dlp first if available and appropriate
    const ytDlpStatus = await this.isYtDlpAvailable();
    if (ytDlpStatus.available && platform !== 'webpage') {
      try {
        const metadata = await this.extractWithYtDlp(url, platform);
        if (metadata && metadata.formats && metadata.formats.length > 0) {
          return metadata;
        }
      } catch (err: any) {
        console.warn(`[MediaExtractor] yt-dlp extraction failed for ${url}: ${err.message}. Falling back...`);
      }
    }

    // 2. Intelligent Built-in Platform Fallbacks
    if (platform === 'reddit') {
      try {
        const redditMeta = await this.extractReddit(url);
        if (redditMeta) return redditMeta;
      } catch (err: any) {
        console.warn(`[MediaExtractor] Reddit fallback failed: ${err.message}`);
      }
    }

    if (platform === 'direct') {
      try {
        const directMeta = await this.extractDirectMedia(url);
        if (directMeta) return directMeta;
      } catch (err: any) {
        console.warn(`[MediaExtractor] Direct media fallback failed: ${err.message}`);
      }
    }

    // 3. OpenGraph / Meta scraping & Webpage Image Gallery
    return this.extractWebpageMeta(url, platform);
  }

  /**
   * Uses yt-dlp subprocess with --dump-single-json.
   */
  private async extractWithYtDlp(url: string, platform: SupportedPlatform): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-single-json',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--js-runtimes',
        'node:/usr/bin/node',
        url,
      ];

      execFile(this.ytDlpPath, args, { maxBuffer: 50 * 1024 * 1024, timeout: 35000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }

        try {
          const raw = JSON.parse(stdout);
          const formats: MediaFormat[] = [];
          const seenFormatKeys = new Set<string>();

          // Prepend high-level standard choices
          formats.push(
            {
              formatId: 'best',
              extension: 'mp4',
              resolution: 'Best Available',
              qualityLabel: 'Best Quality (Auto MP4)',
              hasVideo: true,
              hasAudio: true,
            },
            {
              formatId: '1080p',
              extension: 'mp4',
              resolution: '1080p',
              qualityLabel: 'Full HD 1080p (MP4)',
              hasVideo: true,
              hasAudio: true,
            },
            {
              formatId: '720p',
              extension: 'mp4',
              resolution: '720p',
              qualityLabel: 'HD 720p (MP4)',
              hasVideo: true,
              hasAudio: true,
            },
            {
              formatId: 'audio-mp3-320k',
              extension: 'mp3',
              resolution: '320kbps',
              qualityLabel: 'MP3 Audio (320kbps High Quality)',
              hasVideo: false,
              hasAudio: true,
            },
            {
              formatId: 'audio-mp3-128k',
              extension: 'mp3',
              resolution: '128kbps',
              qualityLabel: 'MP3 Audio (128kbps Standard)',
              hasVideo: false,
              hasAudio: true,
            }
          );

          seenFormatKeys.add('best');
          seenFormatKeys.add('1080p');
          seenFormatKeys.add('720p');
          seenFormatKeys.add('audio-mp3-320k');
          seenFormatKeys.add('audio-mp3-128k');

          const rawFormats: any[] = raw.formats || [];

          for (const f of rawFormats) {
            const hasVideo = f.vcodec && f.vcodec !== 'none';
            const hasAudio = f.acodec && f.acodec !== 'none';
            const height = f.height || 0;
            const ext = f.ext || (hasVideo ? 'mp4' : 'mp3');
            const resolution = height > 0 ? `${height}p` : f.format_note || (hasAudio && !hasVideo ? 'Audio' : undefined);

            const formatId = f.format_id || 'format';
            const key = `${formatId}`;

            if (seenFormatKeys.has(key)) continue;
            seenFormatKeys.add(key);

            const fileSize = f.filesize || f.filesize_approx || undefined;

            formats.push({
              formatId,
              extension: ext,
              resolution,
              qualityLabel: f.format_note || resolution || `${ext.toUpperCase()} stream`,
              fileSize,
              fileSizeFormatted: fileSize ? this.formatBytes(fileSize) : undefined,
              hasVideo: !!hasVideo,
              hasAudio: !!hasAudio,
              fps: f.fps ? Math.round(f.fps) : undefined,
              codec: [f.vcodec, f.acodec].filter((c) => c && c !== 'none').join(' / '),
              bitrate: f.tbr ? Math.round(f.tbr) : undefined,
              directUrl: f.url,
            });
          }

          const duration = raw.duration ? Math.round(raw.duration) : undefined;
          let thumbnail = raw.thumbnail || '';
          if (!thumbnail && raw.thumbnails && raw.thumbnails.length > 0) {
            thumbnail = raw.thumbnails[raw.thumbnails.length - 1].url;
          }
          if (!thumbnail && platform === 'youtube' && raw.id) {
            thumbnail = `https://i.ytimg.com/vi/${raw.id}/hqdefault.jpg`;
          }

          const author = raw.uploader || raw.channel || raw.creator
            ? {
                name: raw.uploader || raw.channel || raw.creator,
                url: raw.uploader_url || raw.channel_url,
              }
            : undefined;

          resolve({
            id: raw.id || `media-${Date.now()}`,
            url,
            title: raw.title || raw.fulltitle || 'Untitled Media',
            description: raw.description ? raw.description.slice(0, 500) : undefined,
            thumbnail,
            duration,
            durationFormatted: duration ? this.formatDuration(duration) : undefined,
            author,
            platform,
            mediaType: 'video',
            formats,
            sourceUrl: url,
            viewCount: raw.view_count,
            likeCount: raw.like_count,
            uploadDate: raw.upload_date,
          });
        } catch (parseErr: any) {
          reject(new Error(`Failed to parse yt-dlp JSON: ${parseErr.message}`));
        }
      });
    });
  }

  /**
   * Fallback for direct media links (mp4, webm, mp3, jpg, png, etc.).
   */
  private async extractDirectMedia(url: string): Promise<MediaMetadata> {
    let contentType = '';
    let contentLength = 0;

    try {
      const headRes = await axios.head(url, { headers: this.defaultHeaders, timeout: 8000 });
      contentType = String(headRes.headers['content-type'] || '');
      contentLength = parseInt(String(headRes.headers['content-length'] || '0'), 10);
    } catch {
      // Continue if HEAD fails; try GET range
      try {
        const getRes = await axios.get(url, {
          headers: { ...this.defaultHeaders, Range: 'bytes=0-1024' },
          timeout: 8000,
        });
        contentType = String(getRes.headers['content-type'] || '');
        const range = String(getRes.headers['content-range'] || '');
        if (range) {
          const match = range.match(/\/(\d+)$/);
          if (match) contentLength = parseInt(match[1], 10);
        }
      } catch {
        // ignore
      }
    }

    const filename = path.basename(new URL(url).pathname) || 'media';
    const ext = path.extname(filename).replace('.', '').toLowerCase() || 'mp4';
    const isImage = contentType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext);
    const isAudio = contentType.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext);
    const isVideo = contentType.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(ext);

    const mediaType: MediaType = isImage ? 'image' : isAudio ? 'audio' : 'video';

    const formats: MediaFormat[] = [
      {
        formatId: 'original',
        extension: ext,
        resolution: isVideo ? 'Original Quality' : isAudio ? 'High Quality' : undefined,
        qualityLabel: 'Original Source Stream',
        fileSize: contentLength > 0 ? contentLength : undefined,
        fileSizeFormatted: contentLength > 0 ? this.formatBytes(contentLength) : undefined,
        hasVideo: isVideo,
        hasAudio: isAudio || isVideo,
        directUrl: url,
      },
    ];

    if (isVideo) {
      formats.push(
        { formatId: 'mp4-1080p', extension: 'mp4', resolution: '1080p', qualityLabel: 'Full HD 1080p', hasVideo: true, hasAudio: true },
        { formatId: 'mp4-720p', extension: 'mp4', resolution: '720p', qualityLabel: 'HD 720p', hasVideo: true, hasAudio: true },
        { formatId: 'audio-mp3-320k', extension: 'mp3', resolution: '320kbps', qualityLabel: 'MP3 High Quality', hasVideo: false, hasAudio: true }
      );
    } else if (isAudio) {
      formats.push(
        { formatId: 'audio-mp3-320k', extension: 'mp3', resolution: '320kbps', qualityLabel: 'MP3 320kbps', hasVideo: false, hasAudio: true },
        { formatId: 'audio-wav', extension: 'wav', resolution: 'Lossless', qualityLabel: 'WAV 16-bit', hasVideo: false, hasAudio: true }
      );
    }

    const images: ExtractedImage[] = isImage
      ? [
          {
            id: 'direct-img-1',
            url,
            thumbnailUrl: url,
            extension: ext,
            sizeFormatted: contentLength > 0 ? this.formatBytes(contentLength) : undefined,
          },
        ]
      : [];

    return {
      id: `direct-${Date.now()}`,
      url,
      title: filename,
      thumbnail: isImage ? url : '',
      platform: 'direct',
      mediaType,
      formats,
      images,
      sourceUrl: url,
    };
  }

  /**
   * Reddit JSON API Fallback.
   */
  private async extractReddit(url: string): Promise<MediaMetadata | null> {
    const cleanUrl = url.split('?')[0].replace(/\/+$/, '');
    const jsonUrl = `${cleanUrl}.json`;

    const res = await axios.get(jsonUrl, {
      headers: { ...this.defaultHeaders, 'User-Agent': 'UltimateDownloader/1.0.0 (by /u/bot)' },
      timeout: 10000,
    });

    const listing = res.data;
    if (!Array.isArray(listing) || listing.length === 0) return null;

    const postData = listing[0]?.data?.children?.[0]?.data;
    if (!postData) return null;

    const title = postData.title || 'Reddit Post';
    const author = postData.author ? { name: `u/${postData.author}`, url: `https://reddit.com/user/${postData.author}` } : undefined;
    const thumbnail = postData.thumbnail && postData.thumbnail.startsWith('http') ? postData.thumbnail : '';

    const redditVideo = postData.secure_media?.reddit_video || postData.media?.reddit_video;

    if (redditVideo) {
      const videoUrl = redditVideo.fallback_url;
      const duration = redditVideo.duration ? Math.round(redditVideo.duration) : undefined;
      const height = redditVideo.height || 720;

      const formats: MediaFormat[] = [
        {
          formatId: 'reddit-video-best',
          extension: 'mp4',
          resolution: `${height}p`,
          qualityLabel: `Reddit Video ${height}p`,
          hasVideo: true,
          hasAudio: true,
          bitrate: redditVideo.bitrate_kbps,
          directUrl: videoUrl,
        },
        {
          formatId: 'reddit-audio-mp3',
          extension: 'mp3',
          resolution: '320kbps',
          qualityLabel: 'Audio Extract (MP3)',
          hasVideo: false,
          hasAudio: true,
        },
      ];

      return {
        id: postData.id || `reddit-${Date.now()}`,
        url,
        title,
        thumbnail: thumbnail || (postData.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&')) || '',
        duration,
        durationFormatted: duration ? this.formatDuration(duration) : undefined,
        author,
        platform: 'reddit',
        mediaType: 'video',
        formats,
        sourceUrl: url,
        viewCount: postData.view_count,
        likeCount: postData.score,
      };
    }

    // Reddit Gallery or Image post
    const images: ExtractedImage[] = [];
    if (postData.media_metadata) {
      for (const key of Object.keys(postData.media_metadata)) {
        const item = postData.media_metadata[key];
        const s = item.s;
        if (s && s.u) {
          const directImgUrl = s.u.replace(/&amp;/g, '&');
          images.push({
            id: key,
            url: directImgUrl,
            thumbnailUrl: directImgUrl,
            width: s.x,
            height: s.y,
            extension: 'jpg',
          });
        }
      }
    } else if (postData.url_overridden_by_dest && /\.(jpg|jpeg|png|webp|gif)/i.test(postData.url_overridden_by_dest)) {
      images.push({
        id: postData.id || 'reddit-img-1',
        url: postData.url_overridden_by_dest,
        thumbnailUrl: postData.url_overridden_by_dest,
        extension: 'jpg',
      });
    }

    if (images.length > 0) {
      return {
        id: postData.id || `reddit-${Date.now()}`,
        url,
        title,
        thumbnail: images[0].thumbnailUrl,
        author,
        platform: 'reddit',
        mediaType: images.length > 1 ? 'gallery' : 'image',
        formats: [
          {
            formatId: 'images-zip',
            extension: 'zip',
            qualityLabel: `Bulk Images Archive (${images.length} images)`,
            hasVideo: false,
            hasAudio: false,
          },
        ],
        images,
        sourceUrl: url,
        likeCount: postData.score,
      };
    }

    return null;
  }

  /**
   * General Webpage / OpenGraph HTML Fallback.
   */
  private async extractWebpageMeta(url: string, platform: SupportedPlatform): Promise<MediaMetadata> {
    const res = await axios.get<string>(url, {
      headers: this.defaultHeaders,
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = res.data;
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').first().text().trim() ||
      'Extracted Webpage';

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content');

    const ogVideo =
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:url"]').attr('content') ||
      $('meta[property="og:video:secure_url"]').attr('content') ||
      $('meta[name="twitter:player:stream"]').attr('content');

    const thumbnail =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      '';

    let directVideoUrl: string | undefined = undefined;
    if (ogVideo) {
      try {
        directVideoUrl = new URL(ogVideo, url).href;
      } catch {
        directVideoUrl = ogVideo;
      }
    }

    // Try finding HTML5 <video> elements
    if (!directVideoUrl) {
      const firstVideo = $('video source[src], video[src]').first();
      const videoSrc = firstVideo.attr('src');
      if (videoSrc) {
        try {
          directVideoUrl = new URL(videoSrc, url).href;
        } catch {
          directVideoUrl = videoSrc;
        }
      }
    }

    const formats: MediaFormat[] = [];
    if (directVideoUrl) {
      formats.push(
        {
          formatId: 'web-video-best',
          extension: 'mp4',
          resolution: 'Best',
          qualityLabel: 'Webpage Video Stream',
          hasVideo: true,
          hasAudio: true,
          directUrl: directVideoUrl,
        },
        {
          formatId: 'web-audio-mp3',
          extension: 'mp3',
          resolution: '320kbps',
          qualityLabel: 'Extract Audio (MP3)',
          hasVideo: false,
          hasAudio: true,
        }
      );
    }

    // Extract images gallery as well
    const crawlResult = await imageBatchArchiver.crawlImages(url);
    const images = crawlResult.images;

    if (images.length > 0) {
      formats.push({
        formatId: 'all-images-zip',
        extension: 'zip',
        qualityLabel: `Download All Images as ZIP (${images.length} items)`,
        hasVideo: false,
        hasAudio: false,
      });
    }

    const mediaType: MediaType = directVideoUrl ? 'video' : images.length > 1 ? 'gallery' : images.length === 1 ? 'image' : 'video';

    return {
      id: `web-${Date.now()}`,
      url,
      title,
      description: description ? description.slice(0, 500) : undefined,
      thumbnail: thumbnail ? new URL(thumbnail, url).href : images[0]?.url || '',
      platform,
      mediaType,
      formats,
      images,
      sourceUrl: url,
    };
  }

  /**
   * Ensures essential fallback options exist (1080p, 720p, audio 320k, audio 128k).
   */
  private ensureStandardFormats(formats: MediaFormat[], duration?: number): void {
    const hasMp3 = formats.some((f) => f.extension === 'mp3');
    if (!hasMp3) {
      formats.push(
        {
          formatId: 'audio-mp3-320k',
          extension: 'mp3',
          resolution: '320kbps',
          qualityLabel: 'Audio MP3 (320kbps Extreme Quality)',
          hasVideo: false,
          hasAudio: true,
          fileSize: duration ? Math.round(duration * 40000) : undefined,
          fileSizeFormatted: duration ? this.formatBytes(Math.round(duration * 40000)) : undefined,
        },
        {
          formatId: 'audio-mp3-128k',
          extension: 'mp3',
          resolution: '128kbps',
          qualityLabel: 'Audio MP3 (128kbps Standard Quality)',
          hasVideo: false,
          hasAudio: true,
          fileSize: duration ? Math.round(duration * 16000) : undefined,
          fileSizeFormatted: duration ? this.formatBytes(Math.round(duration * 16000)) : undefined,
        }
      );
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes <= 0 || isNaN(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = (bytes / Math.pow(1024, idx)).toFixed(1);
    return `${size} ${units[idx]}`;
  }

  private formatDuration(secs: number): string {
    if (!secs || secs < 0) return '00:00';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const rem = Math.floor(secs % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(rem)}`;
    return `${pad(mins)}:${pad(rem)}`;
  }
}

export const mediaExtractor = new MediaExtractor();
