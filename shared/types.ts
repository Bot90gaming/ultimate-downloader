export type SupportedPlatform =
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'reddit'
  | 'pinterest'
  | 'vimeo'
  | 'soundcloud'
  | 'direct'
  | 'webpage';

export type MediaType = 'video' | 'audio' | 'image' | 'gallery';

export interface MediaFormat {
  formatId: string;
  extension: string;
  resolution?: string; // e.g. "1080p", "4K", "720p", "320kbps"
  qualityLabel?: string;
  fileSize?: number; // bytes
  fileSizeFormatted?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  fps?: number;
  codec?: string;
  directUrl?: string;
  bitrate?: number;
}

export interface ExtractedImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  alt?: string;
  sizeFormatted?: string;
  extension: string;
}

export interface MediaMetadata {
  id: string;
  url: string;
  title: string;
  description?: string;
  thumbnail: string;
  duration?: number; // seconds
  durationFormatted?: string;
  author?: {
    name: string;
    url?: string;
    avatar?: string;
  };
  platform: SupportedPlatform;
  mediaType: MediaType;
  formats: MediaFormat[];
  images?: ExtractedImage[];
  sourceUrl: string;
  viewCount?: number;
  likeCount?: number;
  uploadDate?: string;
}

export type DownloadStatus =
  | 'queued'
  | 'fetching_info'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface DownloadProgress {
  taskId: string;
  status: DownloadStatus;
  progressPercentage: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSecond: number;
  etaSeconds: number;
  fileName?: string;
  filePath?: string;
  downloadUrl?: string;
  error?: string;
  timestamp: number;
}

export interface DownloadRequest {
  url: string;
  directUrl?: string;
  formatId?: string;
  extension?: string;
  mediaType?: MediaType;
  audioOnly?: boolean;
  trimStart?: string; // HH:MM:SS or seconds
  trimEnd?: string;
  customFilename?: string;
  extractImagesAsZip?: boolean;
  selectedImageUrls?: string[];
  reencodeH264?: boolean;
  videoCodec?: string; // e.g. "h264"
  audioCodec?: string; // e.g. "aac"
}

export interface BatchDownloadRequest {
  items: DownloadRequest[];
  simultaneousLimit?: number;
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  hasFfmpeg: boolean;
  hasYtDlp: boolean;
  downloadsDir?: string;
  diskFreeBytes?: number;
  serverless?: boolean;
}
