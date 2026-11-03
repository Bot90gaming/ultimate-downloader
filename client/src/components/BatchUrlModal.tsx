import React, { useState } from 'react';
import { Layers, X, Play } from 'lucide-react';
import { BatchDownloadRequest, DownloadRequest } from '../../../shared/types';

interface BatchUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBatch: (batch: BatchDownloadRequest) => void;
}

export const BatchUrlModal: React.FC<BatchUrlModalProps> = ({ isOpen, onClose, onSubmitBatch }) => {
  const [text, setText] = useState<string>(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ\nhttps://www.tiktok.com/@creative/video/731110022394857216\nhttps://www.instagram.com/reel/C3xL9v1P3qm/'
  );
  const [concurrency, setConcurrency] = useState<number>(3);
  const [quality, setQuality] = useState<'best' | '1080p' | '720p' | 'audio'>('best');

  if (!isOpen) return null;

  // Extract clean URLs
  const rawUrls = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 5 && (line.startsWith('http://') || line.startsWith('https://')));

  const handleStart = () => {
    if (rawUrls.length === 0) return;

    const items: DownloadRequest[] = rawUrls.map((url) => ({
      url,
      formatId: quality,
      audioOnly: quality === 'audio',
      mediaType: quality === 'audio' ? 'audio' : 'video',
    }));

    onSubmitBatch({
      items,
      simultaneousLimit: concurrency,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative max-w-2xl w-full bg-white dark:bg-surface-800 border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl animate-bounce-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 border border-brand-200/80 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Batch Media Crawler
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste multiple URLs to queue bulk asynchronous downloads.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close batch modal"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Textarea input */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Target URLs (one per line):
            </label>
            <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">
              {rawUrls.length} valid {rawUrls.length === 1 ? 'URL' : 'URLs'} detected
            </span>
          </div>

          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste multiple URLs here..."
            className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 selection:bg-brand-500/20"
          />
        </div>

        {/* Batch configuration options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Concurrency Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1.5">
              Simultaneous Downloads
            </label>
            <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-white/10 rounded-xl">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setConcurrency(num)}
                  className={`flex-1 min-h-[38px] rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    concurrency === num
                      ? 'bg-brand-500 text-white shadow-soft-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800'
                  }`}
                >
                  {num}x
                </button>
              ))}
            </div>
          </div>

          {/* Quality preset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1.5">
              Quality Target Preset
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="best">Highest Available (4K / 1080p)</option>
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD (Faster)</option>
              <option value="audio">Extract Audio (MP3 320k)</option>
            </select>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200/80 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={rawUrls.length === 0}
            className="min-h-[42px] px-6 rounded-xl bg-gradient-to-r from-brand-500 via-brand-600 to-accent-indigo hover:from-brand-600 hover:to-accent-purple text-white font-bold text-xs sm:text-sm shadow-soft-md hover:shadow-glow-brand flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>Enqueue {rawUrls.length} Downloads</span>
          </button>
        </div>
      </div>
    </div>
  );
};
