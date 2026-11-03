import React from 'react';
import { Command, Heart, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/80 backdrop-blur-md mt-16 py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Keyboard Shortcuts Hint Bar */}
        <div className="mb-8 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-300">Keyboard Shortcuts:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] shadow-2xs">
                Ctrl + V
              </kbd>
              <span>Paste URL</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] shadow-2xs">
                Enter
              </kbd>
              <span>Analyze & Extract</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] shadow-2xs">
                Esc
              </kbd>
              <span>Close Modals</span>
            </span>
          </div>
        </div>

        {/* Middle Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-900">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
              ULTIMATE <span className="text-cyan-600 dark:text-accent-cyan">DL</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              — Universal High-Performance Media Suite
            </span>
          </div>

          {/* Tech Stack Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-cyan-700 dark:text-cyan-300">
              React 18
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-violet-700 dark:text-violet-300">
              Vite 6
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sky-700 dark:text-sky-300">
              Tailwind CSS
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-300">
              FFmpeg Core
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-700 dark:text-red-300">
              yt-dlp
            </span>
          </div>

          {/* Back to top button */}
          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="min-h-[44px] px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>
            Designed & Engineered with{' '}
            <Heart className="w-3.5 h-3.5 text-rose-500 inline mx-0.5" /> for creators worldwide.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-600 max-w-md text-center sm:text-right">
            Please respect copyright and content creators’ rights. Only download content you own or have permission to save.
          </p>
        </div>
      </div>
    </footer>
  );
};
