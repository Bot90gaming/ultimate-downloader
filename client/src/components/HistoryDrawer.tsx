import React from 'react';
import { History, X, Trash2, Download, ExternalLink, Calendar } from 'lucide-react';
import { HistoryItem } from '../types';
import { formatDate } from '../utils/formatters';
import { BrandIcon } from './BrandIcons';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  onRedownload: (url: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onDeleteItem,
  onRedownload,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-surface-800 border-l border-slate-200/90 dark:border-white/10 h-full flex flex-col shadow-2xl z-10 animate-slideInRight duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 border border-brand-200/80 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Download History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {history.length} saved media items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                aria-label="Clear all history"
                title="Clear all"
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-surface-700 rounded-lg cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close history drawer"
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-surface-700/60 border border-brand-200/80 dark:border-white/5 flex items-center justify-center text-brand-500 mb-3 shadow-soft-xs">
                <History className="w-7 h-7" />
              </div>
              <h4 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200">
                No history records yet
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Downloads completed in this session will appear here for fast re-access.
              </p>
            </div>
          ) : (
            history.map((item, i) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-white/5 hover:border-brand-300 dark:hover:border-white/20 transition-all flex flex-col gap-2.5 shadow-soft-xs animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail / Platform */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-200 dark:bg-surface-950 border border-slate-200 dark:border-white/10 shrink-0">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BrandIcon platform={item.platform} size={22} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span className="uppercase text-brand-600 dark:text-brand-400 font-bold">
                        {item.format}
                      </span>
                      {item.fileSizeFormatted && (
                        <>
                          <span>•</span>
                          <span>{item.fileSizeFormatted}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(item.downloadedAt)}</span>
                    </div>
                  </div>

                  {/* Delete Item */}
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    aria-label="Delete history entry"
                    title="Delete item"
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 dark:hover:bg-surface-800 rounded-md cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Actions bottom row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/5 text-xs">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300 flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Source</span>
                  </a>

                  <button
                    onClick={() => {
                      onRedownload(item.url);
                      onClose();
                    }}
                    className="min-h-[32px] px-3 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/20 dark:text-brand-300 dark:hover:bg-brand-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Re-download</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
