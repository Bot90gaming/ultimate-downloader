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
  FileCheck,
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
    <div className="w-full max-w-4xl mx-auto my-6 p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
            <Download className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
              <span>Download Manager</span>
              {activeCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {activeCount} active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Real-time asynchronous stream pipeline</p>
          </div>
        </div>

        {completedCount > 0 && (
          <button
            onClick={onClearCompleted}
            aria-label="Clear completed downloads"
            className="min-h-[44px] px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Completed</span>
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
              className={`p-4 rounded-xl border transition-all duration-200 ${
                isDone
                  ? 'bg-slate-950/60 border-emerald-500/30'
                  : isError
                  ? 'bg-slate-950/60 border-red-500/30'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              {/* Top row: Title, status badge, action buttons */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  {task.metadata && (
                    <div className="mt-0.5">
                      <BrandIcon platform={task.metadata.platform} size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate max-w-md sm:max-w-xl">
                      {task.fileName || task.metadata?.title || task.url}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                      <span>{formatBytes(task.downloadedBytes)}</span>
                      <span>/</span>
                      <span>{task.totalBytes ? formatBytes(task.totalBytes) : 'Unknown size'}</span>
                      {task.selectedFormat?.resolution && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-indigo-400 font-medium">
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </span>
                  ) : isError ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Failed</span>
                    </span>
                  ) : isProcessing ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      <span>Optimizing {Math.round(task.progressPercentage)}%</span>
                    </span>
                  ) : isFetching ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Extracting streams</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-xs font-semibold">
                      <span>{Math.round(task.progressPercentage)}%</span>
                    </span>
                  )}

                  {/* Open File / Download Direct when completed */}
                  {isDone && task.downloadUrl && (
                    <a
                      href={task.downloadUrl}
                      download={task.fileName || 'download'}
                      aria-label="Download finished file"
                      title="Save / Download File"
                      className="min-h-[44px] px-3.5 py-1.5 flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Save to Device</span>
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
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
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
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-300 text-slate-400 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-3">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isDone
                      ? 'bg-emerald-400'
                      : isError
                      ? 'bg-red-500'
                      : 'bg-gradient-to-r from-brand-500 via-accent-violet to-accent-cyan shimmer-active'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, task.progressPercentage))}%` }}
                />
              </div>

              {/* Bottom statistics: Speed, ETA, status notes */}
              {!isDone && !isError && (
                <div className="flex items-center justify-between mt-2.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-mono">
                      {isProcessing ? 'FFmpeg Transcoding' : isFetching ? 'Connecting to source...' : formatSpeed(task.speedBytesPerSecond)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-mono">
                      {isProcessing ? 'Finalizing audio & video...' : isFetching ? 'Analyzing...' : formatEta(task.etaSeconds)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error message if any */}
              {isError && task.error && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
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
