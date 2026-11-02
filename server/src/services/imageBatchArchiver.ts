import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import archiver from 'archiver';
import * as path from 'path';
import { Readable, Writable } from 'stream';
import type { ExtractedImage } from '../../../shared/types';

export interface CrawlResult {
  url: string;
  title: string;
  images: ExtractedImage[];
  count: number;
}

export class ImageBatchArchiver {
  private defaultHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
  };

  /**
   * Crawls a URL and extracts all images (HTML tags, OpenGraph, srcset, direct links).
   */
  public async crawlImages(targetUrl: string): Promise<CrawlResult> {
    try {
      new URL(targetUrl);
    } catch {
      throw new Error(`Invalid URL provided: ${targetUrl}`);
    }

    // 1. Direct image check by extension or query params
    const cleanUrlLower = targetUrl.toLowerCase();
    const hasImageExt =
      /\.(jpg|jpeg|png|webp|gif|avif|bmp|svg)($|\?)/i.test(targetUrl) ||
      cleanUrlLower.includes('format=jpg') ||
      cleanUrlLower.includes('format=png') ||
      cleanUrlLower.includes('format=webp');

    if (hasImageExt) {
      const ext = this.extractExtension(targetUrl);
      const filename = path.basename(new URL(targetUrl).pathname) || 'image';
      return {
        url: targetUrl,
        title: filename,
        images: [
          {
            id: 'img-1',
            url: targetUrl,
            thumbnailUrl: targetUrl,
            extension: ext,
            alt: 'Direct Image Asset',
          },
        ],
        count: 1,
      };
    }

    const response = await axios.get<string>(targetUrl, {
      headers: this.defaultHeaders,
      timeout: 20000,
      maxRedirects: 5,
      responseType: 'text',
      validateStatus: () => true,
    });

    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    if (contentType.startsWith('image/')) {
      const ext = contentType.split('/')[1]?.split(';')[0]?.trim() || this.extractExtension(targetUrl);
      const filename = path.basename(new URL(targetUrl).pathname) || 'image';
      return {
        url: targetUrl,
        title: filename,
        images: [
          {
            id: 'img-1',
            url: targetUrl,
            thumbnailUrl: targetUrl,
            extension: ext,
            alt: 'Direct Image Asset',
          },
        ],
        count: 1,
      };
    }

    const html = response.data;
    const $ = cheerio.load(html);
    const title = $('title').first().text().trim() || $('meta[property="og:title"]').attr('content') || 'Untitled Page';

    const seenUrls = new Set<string>();
    const extractedImages: ExtractedImage[] = [];

    const addImage = (rawUrl: string, altText?: string, width?: number, height?: number) => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      const trimmed = rawUrl.trim();
      if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) return;

      let absoluteUrl: string;
      try {
        absoluteUrl = new URL(trimmed, targetUrl).href;
      } catch {
        return;
      }

      if (seenUrls.has(absoluteUrl)) return;
      seenUrls.add(absoluteUrl);

      const ext = this.extractExtension(absoluteUrl);
      const id = `img-${extractedImages.length + 1}-${Math.random().toString(36).substring(2, 7)}`;

      extractedImages.push({
        id,
        url: absoluteUrl,
        thumbnailUrl: absoluteUrl,
        width,
        height,
        alt: altText ? altText.trim().slice(0, 150) : undefined,
        extension: ext,
      });
    };

    // 1. OpenGraph / Twitter meta tags
    $('meta[property="og:image"], meta[name="og:image"], meta[property="og:image:secure_url"]').each((_, el) => {
      const content = $(el).attr('content');
      if (content) addImage(content, 'OpenGraph Image');
    });

    $('meta[name="twitter:image"], meta[property="twitter:image"]').each((_, el) => {
      const content = $(el).attr('content');
      if (content) addImage(content, 'Twitter Image');
    });

    // 2. <img> tags: src, data-src, data-original, srcset
    $('img').each((_, el) => {
      const $img = $(el);
      const src = $img.attr('src');
      const dataSrc = $img.attr('data-src') || $img.attr('data-original') || $img.attr('data-lazy-src') || $img.attr('data-full-url');
      const srcset = $img.attr('srcset') || $img.attr('data-srcset');
      const alt = $img.attr('alt') || '';
      const w = parseInt($img.attr('width') || '0', 10) || undefined;
      const h = parseInt($img.attr('height') || '0', 10) || undefined;

      // Extract highest resolution candidate from srcset if available
      if (srcset) {
        const bestSrcset = this.parseBestSrcset(srcset, targetUrl);
        if (bestSrcset) {
          addImage(bestSrcset, alt, w, h);
        }
      }

      if (dataSrc) {
        addImage(dataSrc, alt, w, h);
      } else if (src) {
        addImage(src, alt, w, h);
      }
    });

    // 3. <picture> <source srcset>
    $('picture source').each((_, el) => {
      const srcset = $(el).attr('srcset');
      if (srcset) {
        const best = this.parseBestSrcset(srcset, targetUrl);
        if (best) addImage(best, 'Picture Source');
      }
    });

    // 4. Anchor links pointing to image files
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && /\.(jpg|jpeg|png|webp|gif|avif|bmp|svg)(\?.*)?$/i.test(href)) {
        addImage(href, $(el).text().trim() || 'Linked Image');
      }
    });

    // 5. CSS background-image
    $('[style*="background"]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const match = style.match(/background(?:-image)?\s*:\s*url\((['"]?)(.*?)\1\)/i);
      if (match && match[2]) {
        addImage(match[2], 'Background Image');
      }
    });

    return {
      url: targetUrl,
      title,
      images: extractedImages,
      count: extractedImages.length,
    };
  }

  /**
   * Bundles an array of image URLs into a streaming zip archive.
   */
  public async streamImageZip(
    imageUrls: string[],
    outputWritable: Writable,
    onProgress?: (processed: number, total: number, currentName: string) => void
  ): Promise<void> {
    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('No image URLs provided to archive.');
    }

    const archive = archiver('zip', {
      zlib: { level: 6 },
    });

    archive.on('warning', (err) => {
      console.warn('[ImageArchiver Warning]', err.message);
    });

    archive.on('error', (err) => {
      console.error('[ImageArchiver Error]', err.message);
      throw err;
    });

    archive.pipe(outputWritable);

    const total = imageUrls.length;
    let completed = 0;

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const ext = this.extractExtension(url);
      const paddedIndex = String(i + 1).padStart(3, '0');
      const filename = `image_${paddedIndex}.${ext}`;

      try {
        const imageRes: AxiosResponse<Readable> = await axios.get(url, {
          responseType: 'stream',
          headers: this.defaultHeaders,
          timeout: 15000,
          maxRedirects: 3,
        });

        archive.append(imageRes.data, { name: filename });
        completed++;
        if (onProgress) {
          onProgress(completed, total, filename);
        }
      } catch (err: any) {
        console.warn(`[ImageArchiver] Skipped image ${url}: ${err.message}`);
        // Insert a small placeholder text entry so the user knows this file was unreachable
        const errorNotice = `Failed to download: ${url}\nReason: ${err.message}\n`;
        archive.append(Buffer.from(errorNotice), { name: `image_${paddedIndex}_FAILED.txt` });
        completed++;
        if (onProgress) {
          onProgress(completed, total, `image_${paddedIndex}_FAILED.txt`);
        }
      }
    }

    await archive.finalize();
  }

  /**
   * Extracts file extension from URL or falls back to 'jpg'.
   */
  private extractExtension(url: string): string {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const ext = path.extname(pathname).toLowerCase().replace('.', '');
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'svg'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
      // Check query parameters (e.g. ?format=jpg)
      const formatParam = parsed.searchParams.get('format') || parsed.searchParams.get('ext');
      if (formatParam && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(formatParam.toLowerCase())) {
        return formatParam.toLowerCase() === 'jpeg' ? 'jpg' : formatParam.toLowerCase();
      }
    } catch {
      // ignore
    }
    return 'jpg';
  }

  /**
   * Selects the largest candidate from a srcset string.
   */
  private parseBestSrcset(srcset: string, baseUrl: string): string | null {
    const candidates = srcset.split(',').map((part) => part.trim()).filter(Boolean);
    if (candidates.length === 0) return null;

    let bestUrl: string | null = null;
    let maxMetric = -1;

    for (const item of candidates) {
      const parts = item.split(/\s+/);
      const urlPart = parts[0];
      const descriptor = parts[1] || '';

      let metric = 1;
      if (descriptor.endsWith('w')) {
        metric = parseInt(descriptor.replace('w', ''), 10) || 1;
      } else if (descriptor.endsWith('x')) {
        metric = (parseFloat(descriptor.replace('x', '')) || 1) * 1000;
      }

      if (metric > maxMetric) {
        maxMetric = metric;
        try {
          bestUrl = new URL(urlPart, baseUrl).href;
        } catch {
          bestUrl = urlPart;
        }
      }
    }

    return bestUrl;
  }
}

export const imageBatchArchiver = new ImageBatchArchiver();
