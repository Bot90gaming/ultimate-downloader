import { DownloadProgress } from '../../../shared/types';

export type ProgressCallback = (progress: DownloadProgress) => void;

class SseProgressManager {
  private eventSource: EventSource | null = null;
  private listeners = new Set<ProgressCallback>();
  private activeSimulations = new Map<string, number>(); // taskId -> interval ID

  public connect(): void {
    if (this.eventSource) return;

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onmessage = (event) => {
        try {
          const data: DownloadProgress = JSON.parse(event.data);
          this.notify(data);
        } catch {
          // ignore parsing error
        }
      };

      this.eventSource.onerror = () => {
        // SSE disconnected, will auto-reconnect
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      };
    } catch {
      // EventSource not supported or failed to create
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

  // Simulation fallback for offline/demo mode
  public simulateTaskProgress(
    taskId: string,
    fileName: string,
    totalBytes = 85000000
  ): void {
    if (this.activeSimulations.has(taskId)) return;

    let progress = 0;
    const startTime = Date.now();
    const interval = window.setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 4; // increment 4-12%
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
          downloadUrl: `/api/downloads/${fileName}`,
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
        status: progress < 5 ? 'fetching_info' : progress > 90 ? 'processing' : 'downloading',
        progressPercentage: progress,
        downloadedBytes: downloaded,
        totalBytes,
        speedBytesPerSecond: speed,
        etaSeconds: eta,
        fileName,
        timestamp: Date.now(),
      });
    }, 450);

    this.activeSimulations.set(taskId, interval);
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
