import React from 'react';
import {
  Download,
  Pause,
  Play,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Trash2,
} from 'lucide-react';
import { DownloadTaskItem } from '../types';
import { formatBytes, formatSpeed, formatEta } from '../utils/formatters';
import { BrandIcon } from './BrandIcons';

interface DownloadQueueCardProps {
  tasks: DownloadTaskItem[];
  onCancelTask: (taskId: string) => void;
  onPauseTask: (taskId: string) => void;
  onResumeTask: (taskId: string) => void;
  onClearCompleted: () => void;
}

export const DownloadQueueCard: React.FC<DownloadQueueCardProps> = ({
  tasks,
  onCancelTask,
  onPauseTask,
  onResumeTask,
  onClearCompleted,
}) => {
  if (tasks.length === 0) {
    return null;
  }

  const activeCount = tasks.filter(
    (t) => t.status === 'downloading' || t.status === 'fetching_info' || t.status === 'processing'
  ).length;

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-4 sm:p-6 rounded-2xl bg-white dark:bg-surface-800 border border-slate-200/90 dark:border-white/10 shadow-soft-xl backdrop-blur-xl animate-fade-up">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-white/5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 border border-brand-200/80 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <span>Download Pipeline</span>
              {activeCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30">
                  {activeCount} active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ephemeral stream processing & auto-cleanup
            </p>
          </div>
        </div>

        {completedCount > 0 && (
          <button
            onClick={onClearCompleted}
            aria-label="Clear completed downloads"
            className="min-h-[40px] px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Finished</span>
          </button>
        )}
      </div>

      {/* Task Items List */}
      <div className="flex flex-col gap-3">
        {tasks.map((task) => {
          const isDone = task.status === 'completed';
          const isError = task.status === 'error';
          const isProcessing = task.status === 'processing';
          const isFetching = task.status === 'fetching_info';

          return (
            <div
              key={task.taskId}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-200 ${
                isDone
                  ? 'bg-emerald-50/50 dark:bg-surface-900/60 border-emerald-200/80 dark:border-emerald-500/30 shadow-soft-xs'
                  : isError
                  ? 'bg-rose-50/50 dark:bg-surface-900/60 border-rose-200/80 dark:border-red-500/30 shadow-soft-xs'
                  : 'bg-slate-50/80 dark:bg-surface-900/80 border-slate-200/80 dark:border-white/5 shadow-soft-xs'
              }`}
            >
              {/* Top row: Title, status badge, action buttons */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  {task.metadata && (
                    <div className="mt-0.5 shrink-0">
                      <BrandIcon platform={task.metadata.platform} size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md md:max-w-xl">
                      {task.fileName || task.metadata?.title || task.url}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span>{formatBytes(task.downloadedBytes)}</span>
                      <span>/</span>
                      <span>{task.totalBytes ? formatBytes(task.totalBytes) : 'Unknown size'}</span>
                      {task.selectedFormat?.resolution && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-brand-600 dark:text-brand-400 font-semibold">
                            {task.selectedFormat.resolution}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status badge & Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Status Badge */}
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold animate-bounce-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </span>
                  ) : isError ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-red-500/20 dark:text-red-300 border border-rose-200 dark:border-red-500/30 text-xs font-bold animate-wiggle">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Failed</span>
                    </span>
                  ) : isProcessing ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                      <span>Optimizing {Math.round(task.progressPercentage)}%</span>
                    </span>
                  ) : isFetching ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                      <span>Analyzing</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-progress-glow" />
                      <span>{Math.round(task.progressPercentage)}%</span>
                    </span>
                  )}

                  {/* Save to Device link */}
                  {isDone && task.downloadUrl && (
                    <a
                      href={task.downloadUrl}
                      download={task.fileName || 'download'}
                      aria-label="Download completed file"
                      title="Save / Download File"
                      className="min-h-[38px] px-3.5 py-1.5 flex items-center gap-1.5 rounded-xl bg-accent-green hover:bg-emerald-600 text-white font-bold text-xs shadow-soft-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Save</span>
                    </a>
                  )}

                  {/* Pause / Resume Button */}
                  {!isDone && !isError && (
                    <button
                      type="button"
                      onClick={() =>
                        task.isPaused ? onResumeTask(task.taskId) : onPauseTask(task.taskId)
                      }
                      aria-label={task.isPaused ? 'Resume task' : 'Pause task'}
                      title={task.isPaused ? 'Resume' : 'Pause'}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors shadow-soft-xs"
                    >
                      {task.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={() => onCancelTask(task.taskId)}
                    aria-label="Cancel task"
                    title="Cancel download"
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-500/30 cursor-pointer transition-colors shadow-soft-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar with shimmer overlay (Design Guide Section 5.6) */}
              <div
                role="progressbar"
                aria-valuenow={Math.round(task.progressPercentage)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="relative w-full h-2.5 rounded-full bg-slate-200/90 dark:bg-surface-700 overflow-hidden mt-3"
              >
                <div
                  className={`h-full transition-all duration-300 rounded-full relative overflow-hidden ${
                    isDone
                      ? 'bg-accent-green'
                      : isError
                      ? 'bg-accent-red animate-wiggle'
                      : 'bg-gradient-to-r from-brand-500 via-brand-600 to-accent-purple'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, task.progressPercentage))}%` }}
                >
                  {!isDone && !isError && (
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                      style={{ backgroundSize: '200% 100%' }}
                    />
                  )}
                </div>
              </div>

              {/* Bottom statistics: Speed, ETA, status notes */}
              {!isDone && !isError && (
                <div className="flex items-center justify-between mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Zap className="w-3.5 h-3.5 text-brand-500" />
                    <span className="font-mono">
                      {isProcessing
                        ? 'FFmpeg Transcoding...'
                        : isFetching
                        ? 'Connecting to source...'
                        : formatSpeed(task.speedBytesPerSecond)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-accent-purple" />
                    <span className="font-mono">
                      {isProcessing
                        ? 'Finalizing media...'
                        : isFetching
                        ? 'Inspecting...'
                        : formatEta(task.etaSeconds)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error message if any */}
              {isError && task.error && (
                <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{task.error}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
