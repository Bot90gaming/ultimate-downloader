import { spawn, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface MediaProbeResult {
  duration: number; // in seconds
  durationFormatted: string;
  formatName: string;
  size: number;
  bitrate: number;
  video?: {
    codec: string;
    width: number;
    height: number;
    fps: number;
  };
  audio?: {
    codec: string;
    channels: number;
    sampleRate: number;
    bitrate: number;
  };
}

export interface MediaProcessOptions {
  inputPath: string;
  outputPath: string;
  audioOnly?: boolean;
  audioFormat?: 'mp3' | 'wav' | 'flac' | 'aac';
  audioBitrate?: string;
  trimStart?: string; // "00:00:10" or "10"
  trimEnd?: string;   // "00:00:30" or "30"
  copyVideo?: boolean; // stream copy video (1-2s) when only audio or container needs conversion
  onProgress?: (progressPercent: number) => void;
}

export class FfmpegService {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor() {
    this.ffmpegPath = this.resolveBinary('ffmpeg', '/usr/bin/ffmpeg');
    this.ffprobePath = this.resolveBinary('ffprobe', '/usr/bin/ffprobe');
  }

  private resolveBinary(binName: string, defaultPath: string): string {
    if (fs.existsSync(defaultPath)) {
      return defaultPath;
    }
    return binName;
  }

  /**
   * Checks whether ffmpeg is installed and callable on the host system.
   */
  public async isAvailable(): Promise<{ available: boolean; version?: string; path: string }> {
    return new Promise((resolve) => {
      execFile(this.ffmpegPath, ['-version'], (error, stdout) => {
        if (error) {
          resolve({ available: false, path: this.ffmpegPath });
          return;
        }
        const firstLine = stdout.split('\n')[0] || '';
        const match = firstLine.match(/ffmpeg version ([^\s]+)/);
        const version = match ? match[1] : firstLine.trim();
        resolve({ available: true, version, path: this.ffmpegPath });
      });
    });
  }

  /**
   * Checks whether ffprobe is installed and callable.
   */
  public async isProbeAvailable(): Promise<{ available: boolean; version?: string; path: string }> {
    return new Promise((resolve) => {
      execFile(this.ffprobePath, ['-version'], (error, stdout) => {
        if (error) {
          resolve({ available: false, path: this.ffprobePath });
          return;
        }
        const firstLine = stdout.split('\n')[0] || '';
        const match = firstLine.match(/ffprobe version ([^\s]+)/);
        const version = match ? match[1] : firstLine.trim();
        resolve({ available: true, version, path: this.ffprobePath });
      });
    });
  }

  /**
   * Probes a media file and returns structured video/audio metadata.
   */
  public async probeMedia(filePath: string): Promise<MediaProbeResult | null> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Probe failed: media file does not exist at ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      execFile(this.ffprobePath, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`ffprobe failed on ${filePath}: ${stderr || error.message}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          const format = parsed.format || {};
          const streams: any[] = parsed.streams || [];

          const duration = parseFloat(format.duration || '0');
          const size = parseInt(format.size || '0', 10);
          const bitrate = parseInt(format.bit_rate || '0', 10);
          const formatName = format.format_name || '';

          let video: MediaProbeResult['video'] = undefined;
          let audio: MediaProbeResult['audio'] = undefined;

          for (const s of streams) {
            if (s.codec_type === 'video' && !video) {
              let fps = 0;
              if (s.r_frame_rate) {
                const parts = s.r_frame_rate.split('/');
                if (parts.length === 2 && parseInt(parts[1], 10) > 0) {
                  fps = Math.round(parseInt(parts[0], 10) / parseInt(parts[1], 10));
                }
              }
              video = {
                codec: s.codec_name || '',
                width: parseInt(s.width || '0', 10),
                height: parseInt(s.height || '0', 10),
                fps
              };
            } else if (s.codec_type === 'audio' && !audio) {
              audio = {
                codec: s.codec_name || '',
                channels: parseInt(s.channels || '0', 10),
                sampleRate: parseInt(s.sample_rate || '0', 10),
                bitrate: parseInt(s.bit_rate || '0', 10)
              };
            }
          }

          resolve({
            duration,
            durationFormatted: this.formatSeconds(duration),
            formatName,
            size,
            bitrate,
            video,
            audio
          });
        } catch (err: any) {
          reject(new Error(`Failed to parse ffprobe json output: ${err.message}`));
        }
      });
    });
  }

  /**
   * Trims a media file from trimStart to trimEnd.
   */
  public async trimMedia(
    inputPath: string,
    outputPath: string,
    start?: string,
    end?: string
  ): Promise<string> {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const args: string[] = ['-y'];

    if (start && start.trim()) {
      args.push('-ss', start.trim());
    }

    if (end && end.trim()) {
      args.push('-to', end.trim());
    }

    args.push('-i', inputPath);

    // Try stream copy first for maximum speed and losslessness
    args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero', outputPath);

    try {
      await this.runFfmpeg(args);
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return outputPath;
      }
    } catch {
      // Stream copy might fail if timestamps aren't aligned to keyframes; fallback to re-encoding
    }

    // Re-encoding fallback
    const fallbackArgs: string[] = ['-y'];
    if (start && start.trim()) {
      fallbackArgs.push('-ss', start.trim());
    }
    if (end && end.trim()) {
      fallbackArgs.push('-to', end.trim());
    }
    fallbackArgs.push('-i', inputPath);
    fallbackArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac', '-b:a', '192k', outputPath);

    await this.runFfmpeg(fallbackArgs);
    return outputPath;
  }

  /**
   * Extracts or converts a media file into pure audio (mp3, wav, flac, aac).
   */
  public async extractAudio(
    inputPath: string,
    outputPath: string,
    format: 'mp3' | 'wav' | 'flac' | 'aac' = 'mp3',
    bitrate: string = '320k'
  ): Promise<string> {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input media does not exist: ${inputPath}`);
    }

    const args: string[] = ['-y', '-i', inputPath, '-vn'];

    switch (format) {
      case 'mp3':
        args.push('-c:a', 'libmp3lame', '-b:a', bitrate);
        break;
      case 'wav':
        args.push('-c:a', 'pcm_s16le');
        break;
      case 'flac':
        args.push('-c:a', 'flac');
        break;
      case 'aac':
        args.push('-c:a', 'aac', '-b:a', bitrate || '256k');
        break;
      default:
        args.push('-c:a', 'libmp3lame', '-b:a', '320k');
        break;
    }

    args.push(outputPath);

    await this.runFfmpeg(args);
    return outputPath;
  }

  /**
   * Combined processing pipeline: handles audio extraction, format conversion, and trimming.
   */
  public async processMedia(options: MediaProcessOptions): Promise<string> {
    const { inputPath, outputPath, audioOnly, audioFormat = 'mp3', audioBitrate = '320k', trimStart, trimEnd, copyVideo, onProgress } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Probe media to get total duration for progress calculation
    let totalDuration = 0;
    try {
      const probe = await this.probeMedia(inputPath);
      if (probe && probe.duration > 0) {
        totalDuration = probe.duration;
      }
    } catch {
      // Continue even if probe fails
    }

    const args: string[] = ['-y'];

    if (trimStart && trimStart.trim()) {
      args.push('-ss', trimStart.trim());
    }
    if (trimEnd && trimEnd.trim()) {
      args.push('-to', trimEnd.trim());
    }

    args.push('-i', inputPath);

    if (audioOnly) {
      args.push('-vn');
      switch (audioFormat) {
        case 'mp3':
          args.push('-c:a', 'libmp3lame', '-b:a', audioBitrate);
          break;
        case 'wav':
          args.push('-c:a', 'pcm_s16le');
          break;
        case 'flac':
          args.push('-c:a', 'flac');
          break;
        case 'aac':
          args.push('-c:a', 'aac', '-b:a', audioBitrate || '256k');
          break;
        default:
          args.push('-c:a', 'libmp3lame', '-b:a', '320k');
          break;
      }
    } else if (copyVideo && !trimStart && !trimEnd) {
      // High-speed lossless stream copy for video + universal AAC stereo audio (completes in 1-2s)
      args.push(
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart'
      );
    } else {
      // Universal Video Output: H.264 (AVC) + AAC + faststart + yuv420p for 100% universal multi-device playback
      // High-performance multi-threaded fast transcoding
      args.push(
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-threads', '0',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart'
      );
    }

    args.push(outputPath);

    await this.runFfmpegWithProgress(args, totalDuration, onProgress);
    return outputPath;
  }

  /**
   * Internal runner for basic ffmpeg invocation.
   */
  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.ffmpegPath, args);
      let stderrData = '';

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}. Stderr: ${stderrData.slice(-1000)}`));
        }
      });
    });
  }

  /**
   * Internal runner for ffmpeg that parses time output to calculate percentage progress.
   */
  private runFfmpegWithProgress(
    args: string[],
    totalDuration: number,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.ffmpegPath, args);
      let stderrData = '';

      child.stderr.on('data', (chunk) => {
        const str = chunk.toString();
        stderrData += str;

        if (totalDuration > 0 && onProgress) {
          const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
          if (timeMatch) {
            const hours = parseFloat(timeMatch[1]);
            const minutes = parseFloat(timeMatch[2]);
            const seconds = parseFloat(timeMatch[3]);
            const currentSeconds = hours * 3600 + minutes * 60 + seconds;
            const percent = Math.min(99.9, Math.round((currentSeconds / totalDuration) * 100 * 10) / 10);
            onProgress(percent);
          }
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn ffmpeg with progress: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new Error(`ffmpeg processing exited with code ${code}. Stderr: ${stderrData.slice(-1000)}`));
        }
      });
    });
  }

  /**
   * Helper to format seconds into HH:MM:SS or MM:SS.
   */
  public formatSeconds(totalSecs: number): string {
    if (isNaN(totalSecs) || totalSecs < 0) return '00:00';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = Math.floor(totalSecs % 60);

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }
}

export const ffmpegService = new FfmpegService();
