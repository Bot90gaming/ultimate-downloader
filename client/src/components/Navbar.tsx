import React from 'react';
import { Download, Layers, Image as ImageIcon, History, Settings, Sun, Moon, Github } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 dark:bg-slate-950/80 border-b border-slate-800/80 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('single')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 via-accent-violet to-accent-cyan p-[2px] shadow-glow-sm group-hover:shadow-glow transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Download className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors duration-200 group-hover:scale-110" />
              </div>
            </div>
            {/* Ambient ping */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBackendOnline ? 'bg-emerald-400' : 'bg-cyan-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isBackendOnline ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
            </span>
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                ULTIMATE
              </span>
              <span className="font-display font-extrabold text-xl tracking-tight text-accent-cyan">
                DL
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-indigo-300 border border-brand-500/30">
                PRO MAX
              </span>
            </div>
            {/* Status indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
              <span className="text-[11px] font-medium text-slate-300">
                {isBackendOnline ? 'Engine Online' : 'Engine Ready (Fast Engine)'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('single')}
            aria-label="Single Download Tab"
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer transition-all duration-200 select-none ${
              activeTab === 'single'
                ? 'bg-gradient-to-r from-brand-600 to-accent-violet text-white shadow-glow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
            }`}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Single DL</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            aria-label="Batch Crawl Tab"
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer transition-all duration-200 select-none ${
              activeTab === 'batch'
                ? 'bg-gradient-to-r from-brand-600 to-accent-violet text-white shadow-glow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">Batch Crawl</span>
            <span className="xs:hidden">Batch</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            aria-label="Image Extractor Tab"
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer transition-all duration-200 select-none ${
              activeTab === 'gallery'
                ? 'bg-gradient-to-r from-brand-600 to-accent-violet text-white shadow-glow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">Image Scraper</span>
            <span className="xs:hidden">Images</span>
          </button>
        </nav>

        {/* Right Tools & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Active downloads badge */}
          {activeDownloadsCount > 0 && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>{activeDownloadsCount} Active</span>
            </div>
          )}

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            aria-label="Download History"
            title="Download History"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/80 cursor-pointer transition-all duration-200"
          >
            <History className="w-5 h-5" />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Preferences & Settings"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/80 cursor-pointer transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-slate-700 hover:bg-slate-800/80 cursor-pointer transition-all duration-200"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* GitHub Link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            title="GitHub Repository"
            className="min-w-[44px] min-h-[44px] hidden sm:flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/80 cursor-pointer transition-all duration-200"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
};
