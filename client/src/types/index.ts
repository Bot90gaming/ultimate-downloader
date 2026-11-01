export * from '../../../shared/types';
import type { SupportedPlatform, MediaFormat, MediaMetadata, DownloadStatus } from '../../../shared/types';

export type ActiveTab = 'single' | 'batch' | 'gallery';

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  platform: SupportedPlatform;
  fileName: string;
  fileSizeFormatted?: string;
  format: string;
  downloadedAt: number; // timestamp
  filePath?: string;
}

export interface UserSettings {
  defaultFormat: 'best' | '1080p' | '720p' | 'audio_only';
  autoDownload: boolean;
  maxConcurrentDownloads: number;
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
  downloadsDirectory: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

export interface DownloadTaskItem {
  taskId: string;
  url: string;
  metadata?: MediaMetadata;
  selectedFormat?: MediaFormat;
  status: DownloadStatus;
  progressPercentage: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSecond: number;
  etaSeconds: number;
  fileName?: string;
  filePath?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: number;
  isPaused?: boolean;
}
