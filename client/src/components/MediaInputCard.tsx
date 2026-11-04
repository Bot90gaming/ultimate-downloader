import React, { useState, useEffect } from 'react';
import { Search, ClipboardPaste, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { detectPlatform, PLATFORMS_INFO } from '../utils/urlDetector';
import { BrandIcon } from './BrandIcons';

interface MediaInputCardProps {
  inputUrl: string;
  setInputUrl: (url: string) => void;
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  onClear?: () => void;
}

export const MediaInputCard: React.FC<MediaInputCardProps> = ({
  inputUrl,
  setInputUrl,
  onAnalyze,
  isLoading,
  onClear,
}) => {
  const [platform, setPlatform] = useState(detectPlatform(inputUrl));

  useEffect(() => {
    setPlatform(detectPlatform(inputUrl));
  }, [inputUrl]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text.trim();
        setInputUrl(clean);
        // Immediately refetch the newly pasted link
        onAnalyze(clean);
      }
    } catch {
      // In case clipboard permission is denied, focus input
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || isLoading) return;
    onAnalyze(inputUrl.trim());
  };

  const handleClear = () => {
    setInputUrl('');
    if (onClear) {
      onClear();
    }
  };

  const platformInfo = PLATFORMS_INFO[platform];

  return (
    <div className="w-full max-w-4xl mx-auto my-4 sm:my-6 animate-fade-up">
      <form onSubmit={handleSubmit} className="relative group">
        {/* Animated Glow halo behind input container */}
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-400 via-accent-indigo to-accent-purple rounded-2xl blur-md opacity-25 group-hover:opacity-45 transition duration-500 -z-10 group-focus-within:opacity-70 group-focus-within:blur-lg" />

        <div className="relative flex flex-col md:flex-row items-stretch gap-2 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-surface-800 border border-slate-200/90 dark:border-white/10 shadow-soft-xl transition-all duration-300 group-focus-within:border-brand-500/80 group-focus-within:ring-4 group-focus-within:ring-brand-500/10">
          {/* Main Input Field */}
          <div className="relative flex-1 flex items-center min-h-[54px] px-3 sm:px-4">
            <div className="pr-3 text-brand-500 dark:text-brand-400 shrink-0">
              <Search className="w-5 h-5" />
            </div>

            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onPaste={(e) => {
                const pastedText = e.clipboardData?.getData('text');
                if (pastedText && pastedText.trim()) {
                  const clean = pastedText.trim();
                  setInputUrl(clean);
                  onAnalyze(clean);
                }
              }}
              placeholder="Paste any link: YouTube, TikTok, Instagram, X/Twitter, Reddit, Pinterest..."
              aria-label="Media or webpage link"
              className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 font-mono text-xs sm:text-sm md:text-base focus:outline-none pr-8 selection:bg-brand-500/20"
            />

            {/* Clear button if has input */}
            {inputUrl && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear input"
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-surface-700 transition-colors animate-fade-in shrink-0 mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Platform detection badge */}
            {inputUrl && (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${platformInfo.badgeBg} transition-all duration-200 shrink-0 mr-1 animate-slide-down`}
              >
                <BrandIcon platform={platform} size={15} />
                <span className="font-semibold">{platformInfo.name}</span>
              </div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-2 px-1 pb-1 md:pb-0 shrink-0">
            {/* Paste Button */}
            <button
              type="button"
              onClick={handlePaste}
              title="Paste from clipboard"
              aria-label="Paste from clipboard"
              className="min-h-[46px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 dark:bg-surface-700 dark:hover:bg-surface-600 border border-slate-200 dark:border-white/5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 shadow-soft-xs"
            >
              <ClipboardPaste className="w-4 h-4 text-brand-500 dark:text-brand-400" />
              <span className="hidden sm:inline">Paste</span>
            </button>

            {/* Primary Submit CTA (Liquid brand sheen) */}
            <button
              type="submit"
              disabled={!inputUrl.trim() || isLoading}
              aria-label="Analyze and Fetch Media"
              className="min-h-[46px] flex-1 md:flex-none px-6 rounded-xl bg-gradient-to-r from-brand-500 via-brand-600 to-accent-indigo hover:from-brand-600 hover:to-accent-purple text-white font-bold text-xs sm:text-sm md:text-base shadow-soft-md hover:shadow-glow-brand flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze & Fetch</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Example Demo Links */}
      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Try quick demos:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setInputUrl(PLATFORMS_INFO.youtube.sampleUrl);
              onAnalyze(PLATFORMS_INFO.youtube.sampleUrl);
            }}
            className="hover:text-brand-600 dark:hover:text-brand-300 hover:underline cursor-pointer transition-colors font-medium"
          >
            YouTube 4K
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            type="button"
            onClick={() => {
              setInputUrl(PLATFORMS_INFO.tiktok.sampleUrl);
              onAnalyze(PLATFORMS_INFO.tiktok.sampleUrl);
            }}
            className="hover:text-brand-600 dark:hover:text-brand-300 hover:underline cursor-pointer transition-colors font-medium"
          >
            TikTok HD
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            type="button"
            onClick={() => setInputUrl(PLATFORMS_INFO.instagram.sampleUrl)}
            className="hover:text-brand-600 dark:hover:text-brand-300 hover:underline cursor-pointer transition-colors font-medium"
          >
            Instagram Reel
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            type="button"
            onClick={() => setInputUrl(PLATFORMS_INFO.twitter.sampleUrl)}
            className="hover:text-brand-600 dark:hover:text-brand-300 hover:underline cursor-pointer transition-colors font-medium"
          >
            X / Twitter
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            type="button"
            onClick={() => setInputUrl(PLATFORMS_INFO.webpage.sampleUrl)}
            className="hover:text-brand-600 dark:hover:text-brand-300 hover:underline cursor-pointer transition-colors font-medium"
          >
            Web Gallery
          </button>
        </div>
      </div>
    </div>
  );
};
