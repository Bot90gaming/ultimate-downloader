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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <History className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">Download History</h3>
              <p className="text-xs text-slate-400">{history.length} saved media items</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                aria-label="Clear all history"
                title="Clear all"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close history drawer"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
                <History className="w-7 h-7 text-indigo-400/70" />
              </div>
              <h4 className="font-display font-semibold text-sm text-slate-200">
                No history records yet
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Downloads completed in this session or saved locally will appear here for fast access.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail / Platform */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
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
                    <h5 className="text-xs font-semibold text-white truncate">{item.title}</h5>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                      <span className="uppercase text-indigo-400 font-semibold">{item.format}</span>
                      {item.fileSizeFormatted && (
                        <>
                          <span>•</span>
                          <span>{item.fileSizeFormatted}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(item.downloadedAt)}</span>
                    </div>
                  </div>

                  {/* Delete Item */}
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    aria-label="Delete history entry"
                    title="Delete item"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors -mr-2 -mt-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Actions bottom row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Link</span>
                  </a>

                  <button
                    onClick={() => {
                      onRedownload(item.url);
                      onClose();
                    }}
                    className="min-h-[36px] px-3 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
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
