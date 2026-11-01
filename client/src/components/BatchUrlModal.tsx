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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Batch Media Crawler</h3>
              <p className="text-xs text-slate-400">Paste multiple URLs to queue automatic bulk downloads.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close batch modal"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Textarea input */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <label className="font-medium text-slate-300">Target URLs (one per line):</label>
            <span className="font-mono text-cyan-300 font-semibold">
              {rawUrls.length} valid {rawUrls.length === 1 ? 'URL' : 'URLs'} detected
            </span>
          </div>

          <textarea
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste multiple URLs here..."
            className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Batch configuration options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Concurrency Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Simultaneous Downloads
            </label>
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-700 rounded-xl">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setConcurrency(num)}
                  className={`flex-1 min-h-[40px] rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    concurrency === num
                      ? 'bg-indigo-600 text-white shadow-glow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {num}x
                </button>
              ))}
            </div>
          </div>

          {/* Quality preset */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Quality Target Preset
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="best">Highest Available (4K / 1080p)</option>
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD (Faster)</option>
              <option value="audio">Extract Audio (MP3 320k)</option>
            </select>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={rawUrls.length === 0}
            className="min-h-[44px] px-6 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-cyan hover:from-brand-500 hover:to-cyan-400 text-white font-semibold text-xs sm:text-sm shadow-glow flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>Enqueue {rawUrls.length} Downloads</span>
          </button>
        </div>
      </div>
    </div>
  );
};
