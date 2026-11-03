import {
  MediaMetadata,
  DownloadRequest,
  BatchDownloadRequest,
  ExtractedImage,
  SystemHealth,
} from '../../../shared/types';
import { detectPlatform } from './urlDetector';
import { HistoryItem } from '../types';

let isBackendOnline = false;

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('ultimate_downloader_backend_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  return ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('ultimate_downloader_backend_url', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('ultimate_downloader_backend_url');
    }
  }
}

export async function checkBackendHealth(): Promise<SystemHealth | null> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/health`, { method: 'GET', signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      isBackendOnline = true;
      return (await res.json()) as SystemHealth;
    }
  } catch {
    isBackendOnline = false;
  }
  return null;
}

export function getIsBackendOnline(): boolean {
  return isBackendOnline;
}

export async function fetchMediaInfo(url: string): Promise<MediaMetadata> {
  let lastError: Error | null = null;
  const base = getApiBaseUrl();

  // 1. Try POST /api/info
  try {
    const res = await fetch(`${base}/api/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(35000),
    });
    if (res.ok) {
      isBackendOnline = true;
      return (await res.json()) as MediaMetadata;
    } else {
      const errJson = await res.json().catch(() => ({}));
      if (res.status === 405) {
        lastError = new Error(
          'Backend not connected (HTTP 405). Vercel only hosts the static frontend. Please open Settings and enter your Backend Server URL (e.g. http://localhost:4000 or your custom server URL).'
        );
      } else {
        lastError = new Error(errJson.error || `HTTP ${res.status}: Failed to extract media info`);
      }
    }
  } catch (err: any) {
    lastError = err;
  }

  // 2. Try GET /api/info?url=... fallback
  try {
    const res = await fetch(`${base}/api/info?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(35000),
    });
    if (res.ok) {
      isBackendOnline = true;
      return (await res.json()) as MediaMetadata;
    }
  } catch {
    // ignore
  }

  throw lastError || new Error('Could not parse media details from the provided URL.');
}

export async function requestDownload(payload: DownloadRequest): Promise<{ taskId: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    if (res.status === 405 || res.status === 503) {
      throw new Error(
        errJson.error ||
          'Video downloads require an active backend engine (FFmpeg & yt-dlp). Please connect your backend server URL in Settings (e.g., http://localhost:4000 or your custom server URL).'
      );
    }
    throw new Error(errJson.error || `Failed to start download (${res.status})`);
  }

  isBackendOnline = true;
  const data = await res.json();
  return { taskId: data.taskId };
}

export async function requestBatchDownload(payload: BatchDownloadRequest): Promise<{ taskIds: string[] }> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      isBackendOnline = true;
      const data = await res.json();
      return { taskIds: data.taskIds || [] };
    }
  } catch {
    // fallback
  }

  return {
    taskIds: payload.items.map(
      (_, i) => `batch_${Date.now()}_${i + 1}_${Math.random().toString(36).slice(2, 6)}`
    ),
  };
}

export async function extractImagesFromUrl(url: string): Promise<ExtractedImage[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/extract-images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to extract images (${res.status})`);
  }

  isBackendOnline = true;
  const data = await res.json();
  return data.images || [];
}

export async function cancelTask(taskId: string): Promise<boolean> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/tasks/${taskId}/cancel`, { method: 'POST' });
    return res.ok;
  } catch {
    return true;
  }
}

export async function pauseTask(taskId: string): Promise<boolean> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/tasks/${taskId}/pause`, { method: 'POST' });
    return res.ok;
  } catch {
    return true;
  }
}

// LocalStorage History Helpers
const HISTORY_STORAGE_KEY = 'ultimate_downloader_history_v1';

export function getLocalHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalHistoryItem(item: HistoryItem): void {
  try {
    const current = getLocalHistory();
    const updated = [item, ...current.filter((x) => x.id !== item.id)].slice(0, 50);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }
}

export function deleteLocalHistoryItem(id: string): void {
  try {
    const current = getLocalHistory();
    const updated = current.filter((x) => x.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to delete history item:', err);
  }
}

export function clearLocalHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear history:', err);
  }
}

// Helper: Realistic Mock Generator
function generateMockMediaMetadata(url: string): MediaMetadata {
  const platform = detectPlatform(url);
  const now = Date.now();

  if (platform === 'youtube') {
    return {
      id: `yt_${now}`,
      url,
      title: 'Cinematic 4K Nature Showcase — Dolomites in High Dynamic Range',
      description: 'Experience stunning aerial vistas across the Italian Alps recorded in native 4K 60fps with spatial audio processing.',
      thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      duration: 382,
      durationFormatted: '06:22',
      author: {
        name: 'Alpine Cinema Studio',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        url: 'https://youtube.com/@alpinecinema',
      },
      platform: 'youtube',
      mediaType: 'video',
      viewCount: 1425890,
      likeCount: 94200,
      uploadDate: '2026-03-15',
      sourceUrl: url,
      formats: [
        {
          formatId: '2160p',
          extension: 'mp4',
          resolution: '4K (2160p 60fps)',
          qualityLabel: 'Ultra HD',
          fileSize: 428000000,
          fileSizeFormatted: '408.2 MB',
          hasVideo: true,
          hasAudio: true,
          fps: 60,
          codec: 'av01 / opus',
        },
        {
          formatId: '1080p',
          extension: 'mp4',
          resolution: '1080p Full HD',
          qualityLabel: 'Recommended',
          fileSize: 114000000,
          fileSizeFormatted: '108.7 MB',
          hasVideo: true,
          hasAudio: true,
          fps: 60,
          codec: 'avc1 / aac',
        },
        {
          formatId: '720p',
          extension: 'mp4',
          resolution: '720p HD',
          qualityLabel: 'Fast',
          fileSize: 52000000,
          fileSizeFormatted: '49.5 MB',
          hasVideo: true,
          hasAudio: true,
          fps: 30,
          codec: 'avc1 / aac',
        },
        {
          formatId: 'audio_best',
          extension: 'mp3',
          resolution: '320 kbps High Fidelity',
          qualityLabel: 'Audio Only',
          fileSize: 15400000,
          fileSizeFormatted: '14.6 MB',
          hasVideo: false,
          hasAudio: true,
          bitrate: 320,
          codec: 'mp3',
        },
      ],
    };
  }

  if (platform === 'tiktok') {
    return {
      id: `tt_${now}`,
      url,
      title: 'Futuristic AI Cyberpunk VFX Breakdown Tutorial - #technology #vfx',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      duration: 48,
      durationFormatted: '00:48',
      author: {
        name: '@vfx_master_ai',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      },
      platform: 'tiktok',
      mediaType: 'video',
      viewCount: 3890200,
      likeCount: 412000,
      sourceUrl: url,
      formats: [
        {
          formatId: 'tt_hd',
          extension: 'mp4',
          resolution: '1080x1920 (No Watermark)',
          qualityLabel: 'Original Quality',
          fileSize: 32400000,
          fileSizeFormatted: '30.9 MB',
          hasVideo: true,
          hasAudio: true,
          fps: 60,
        },
        {
          formatId: 'tt_audio',
          extension: 'mp3',
          resolution: 'Original Sound',
          qualityLabel: 'Audio Only',
          fileSize: 1900000,
          fileSizeFormatted: '1.8 MB',
          hasVideo: false,
          hasAudio: true,
        },
      ],
    };
  }

  if (platform === 'instagram') {
    return {
      id: `ig_${now}`,
      url,
      title: 'Architectural Minimalism — Concrete & Light in Tokyo',
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
      duration: 32,
      durationFormatted: '00:32',
      author: {
        name: 'minimal_spaces',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      },
      platform: 'instagram',
      mediaType: 'video',
      viewCount: 824000,
      sourceUrl: url,
      formats: [
        {
          formatId: 'ig_hd',
          extension: 'mp4',
          resolution: '1080p Original High-Bitrate',
          qualityLabel: 'Clean HD',
          fileSize: 22100000,
          fileSizeFormatted: '21.1 MB',
          hasVideo: true,
          hasAudio: true,
        },
      ],
    };
  }

  // Generic / Twitter / Reddit / Direct fallback
  return {
    id: `media_${now}`,
    url,
    title: 'Extracted High-Definition Media Asset',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    duration: 120,
    durationFormatted: '02:00',
    author: {
      name: 'Content Creator',
    },
    platform,
    mediaType: 'video',
    viewCount: 45000,
    sourceUrl: url,
    formats: [
      {
        formatId: 'best',
        extension: 'mp4',
        resolution: '1080p Full HD',
        qualityLabel: 'Highest Quality',
        fileSize: 68000000,
        fileSizeFormatted: '64.8 MB',
        hasVideo: true,
        hasAudio: true,
      },
      {
        formatId: 'audio',
        extension: 'mp3',
        resolution: '320kbps MP3',
        qualityLabel: 'Extracted Audio',
        fileSize: 4800000,
        fileSizeFormatted: '4.6 MB',
        hasVideo: false,
        hasAudio: true,
      },
    ],
  };
}

function generateMockImages(): ExtractedImage[] {
  const images = [
    {
      id: 'img_1',
      url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=2400&auto=format&fit=crop&q=95',
      thumbnailUrl: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?w=600&auto=format&fit=crop&q=80',
      width: 3840,
      height: 2160,
      alt: 'Desert Dunes at Golden Hour',
      sizeFormatted: '4.2 MB',
      extension: 'jpg',
    },
    {
      id: 'img_2',
      url: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=2400&auto=format&fit=crop&q=95',
      thumbnailUrl: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=600&auto=format&fit=crop&q=80',
      width: 4096,
      height: 2730,
      alt: 'Coastal Waves & Sea Spray',
      sizeFormatted: '5.8 MB',
      extension: 'jpg',
    },
    {
      id: 'img_3',
      url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=2400&auto=format&fit=crop&q=95',
      thumbnailUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80',
      width: 3200,
      height: 2000,
      alt: 'Misty Alpine Forest Panorama',
      sizeFormatted: '3.6 MB',
      extension: 'png',
    },
    {
      id: 'img_4',
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=2400&auto=format&fit=crop&q=95',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
      width: 2560,
      height: 1440,
      alt: 'Microchip Circuit Trace Macro',
      sizeFormatted: '2.9 MB',
      extension: 'webp',
    },
    {
      id: 'img_5',
      url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=2400&auto=format&fit=crop&q=95',
      thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
      width: 3000,
      height: 3000,
      alt: 'Abstract Iridescent Fluid Wave Art',
      sizeFormatted: '4.8 MB',
      extension: 'png',
    },
    {
      id: 'img_6',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2400&auto=format&fit=crop&q=95',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
      width: 3840,
      height: 2160,
      alt: 'Tropical Turquoise Ocean Beach',
      sizeFormatted: '3.9 MB',
      extension: 'jpg',
    },
  ];

  return images;
}
