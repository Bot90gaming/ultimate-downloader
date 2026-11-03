import { DownloadProgress } from '../../../shared/types';
import { getApiBaseUrl } from './api';

export type ProgressCallback = (progress: DownloadProgress) => void;

class SseProgressManager {
  private eventSource: EventSource | null = null;
  private listeners = new Set<ProgressCallback>();
  private activeSimulations = new Map<string, number>(); // taskId -> interval ID

  public connect(): void {
    if (this.eventSource) return;

    try {
      const base = getApiBaseUrl();
      this.eventSource = new EventSource(`${base}/api/events`);

      const handleIncoming = (event: MessageEvent) => {
        try {
          if (!event.data || typeof event.data !== 'string' || event.data.startsWith(':')) return;
          const data: DownloadProgress = JSON.parse(event.data);
          if (data && data.taskId) {
            this.notify(data);
          }
        } catch {
          // ignore parsing error
        }
      };

      this.eventSource.onmessage = handleIncoming;
      this.eventSource.addEventListener('progress', handleIncoming);
      this.eventSource.addEventListener('complete', handleIncoming);
      this.eventSource.addEventListener('error', handleIncoming);
      this.eventSource.addEventListener('message', handleIncoming);

      this.eventSource.onerror = () => {
        // SSE disconnected, will auto-reconnect after close
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto-reconnect after delay
        setTimeout(() => {
          if (this.listeners.size > 0) {
            this.connect();
          }
        }, 2000);
      };
    } catch {
      this.eventSource = null;
    }
  }

  public subscribe(callback: ProgressCallback): () => void {
    this.listeners.add(callback);
    this.connect();

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    };
  }

  public notify(progress: DownloadProgress): void {
    this.listeners.forEach((listener) => {
      try {
        listener(progress);
      } catch (err) {
        console.error('Error in progress listener:', err);
      }
    });
  }

  // Simulation fallback for offline/demo/serverless mode
  public simulateTaskProgress(
    taskId: string,
    fileName: string,
    totalBytes = 85000000,
    downloadUrl?: string
  ): void {
    if (this.activeSimulations.has(taskId)) return;

    let progress = 8;
    const startTime = Date.now();
    const interval = window.setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 6; // increment 6-14%
      if (progress >= 100) {
        progress = 100;
        window.clearInterval(interval);
        this.activeSimulations.delete(taskId);

        this.notify({
          taskId,
          status: 'completed',
          progressPercentage: 100,
          downloadedBytes: totalBytes,
          totalBytes,
          speedBytesPerSecond: 0,
          etaSeconds: 0,
          fileName,
          downloadUrl: downloadUrl || `/api/files/${taskId}?name=${encodeURIComponent(fileName)}`,
          timestamp: Date.now(),
        });
        return;
      }

      const downloaded = Math.floor((progress / 100) * totalBytes);
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speed = elapsedSec > 0 ? downloaded / elapsedSec : 3500000;
      const remainingBytes = totalBytes - downloaded;
      const eta = speed > 0 ? remainingBytes / speed : 10;

      this.notify({
        taskId,
        status: progress < 10 ? 'fetching_info' : progress > 85 ? 'processing' : 'downloading',
        progressPercentage: progress,
        downloadedBytes: downloaded,
        totalBytes,
        speedBytesPerSecond: speed,
        etaSeconds: eta,
        fileName,
        downloadUrl,
        timestamp: Date.now(),
      });
    }, 350);

    this.activeSimulations.set(taskId, interval);
  }

  public isSimulating(taskId: string): boolean {
    return this.activeSimulations.has(taskId);
  }

  public cancelSimulation(taskId: string): void {
    const interval = this.activeSimulations.get(taskId);
    if (interval) {
      window.clearInterval(interval);
      this.activeSimulations.delete(taskId);
    }
  }
}

export const sseManager = new SseProgressManager();
