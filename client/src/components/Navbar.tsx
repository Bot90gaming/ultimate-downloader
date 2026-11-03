import React from 'react';
import { Download, Layers, Image as ImageIcon, History, Settings, Sun, Moon } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  isBackendOnline: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeDownloadsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenHistory,
  onOpenSettings,
  isBackendOnline,
  theme,
  onToggleTheme,
  activeDownloadsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-surface-900/80 border-b border-slate-200/80 dark:border-white/5 transition-colors duration-200 shadow-soft-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Status */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            className="relative group cursor-pointer"
            onClick={() => setActiveTab('single')}
            title="Return to Home"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-brand-500 via-accent-indigo to-accent-purple p-[2px] shadow-soft-sm group-hover:shadow-glow-brand transition-all duration-300">
              <div className="w-full h-full bg-white dark:bg-surface-900 rounded-[10px] flex items-center justify-center">
                <Download className="w-5 h-5 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform duration-200" />
              </div>
            </div>
            {/* Live Indicator Dot */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isBackendOnline ? 'bg-accent-green' : 'bg-accent-yellow'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isBackendOnline ? 'bg-accent-green' : 'bg-accent-yellow'
                }`}
              />
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-slate-900 via-brand-600 to-accent-purple dark:from-white dark:via-slate-100 dark:to-brand-300 bg-clip-text text-transparent">
                ULTIMATE
              </span>
              <span className="font-display font-extrabold text-base sm:text-xl tracking-tight text-brand-500 dark:text-brand-400">
                DL
              </span>
              <span className="hidden xs:inline text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/80 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30">
                PRO MAX
              </span>
            </div>
            {/* Engine status subtitle */}
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 text-left text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer group mt-0.5"
              title="Click to configure Engine Settings"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBackendOnline ? 'bg-accent-green' : 'bg-accent-yellow'
                }`}
              />
              <span className="text-[10px] sm:text-[11px] font-medium">
                {isBackendOnline ? 'Engine Online' : 'Engine: Offline / Config'}
              </span>
            </button>
          </div>
        </div>

        {/* Center Navigation Tabs (Desktop / Tablet) */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-surface-800/90 border border-slate-200/80 dark:border-white/5 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveTab('single')}
            aria-label="Single Download Tab"
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer transition-all duration-200 select-none ${
              activeTab === 'single'
                ? 'bg-brand-500 text-white shadow-soft-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-surface-700/60'
            }`}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Single DL</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            aria-label="Batch Crawl Tab"
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer transition-all duration-200 select-none ${
              activeTab === 'batch'
                ? 'bg-brand-500 text-white shadow-soft-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-surface-700/60'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Batch Crawl</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            aria-label="Image Extractor Tab"
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer transition-all duration-200 select-none ${
              activeTab === 'gallery'
                ? 'bg-brand-500 text-white shadow-soft-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-surface-700/60'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Image Scraper</span>
          </button>
        </nav>

        {/* Right Tools & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Active downloads badge */}
          {activeDownloadsCount > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 dark:bg-brand-500/20 dark:border-brand-500/30 dark:text-brand-300 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-progress-glow" />
              <span>{activeDownloadsCount} Active</span>
            </div>
          )}

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            aria-label="Download History"
            title="Download History"
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white dark:bg-surface-800 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white hover:border-brand-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-surface-700/80 shadow-soft-xs cursor-pointer transition-all duration-200 active:scale-95"
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Preferences & Settings"
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white dark:bg-surface-800 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white hover:border-brand-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-surface-700/80 shadow-soft-xs cursor-pointer transition-all duration-200 active:scale-95"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white dark:bg-surface-800 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-accent-yellow hover:border-accent-yellow/40 hover:bg-amber-50/50 dark:hover:bg-surface-700/80 shadow-soft-xs cursor-pointer transition-all duration-200 active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 hover:text-brand-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Tab Pills Bar (under header row) */}
      <div className="md:hidden flex items-center justify-center px-3 pb-2.5 pt-0.5 border-t border-slate-100 dark:border-white/5">
        <nav className="flex items-center justify-center w-full max-w-md gap-1 p-1 bg-slate-100/90 dark:bg-surface-800/90 border border-slate-200/80 dark:border-white/5 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveTab('single')}
            aria-label="Single Download Tab"
            className={`flex-1 min-h-[38px] px-2 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none ${
              activeTab === 'single'
                ? 'bg-brand-500 text-white shadow-soft-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Single</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            aria-label="Batch Crawl Tab"
            className={`flex-1 min-h-[38px] px-2 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none ${
              activeTab === 'batch'
                ? 'bg-brand-500 text-white shadow-soft-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Batch</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            aria-label="Image Extractor Tab"
            className={`flex-1 min-h-[38px] px-2 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none ${
              activeTab === 'gallery'
                ? 'bg-brand-500 text-white shadow-soft-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Images</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
