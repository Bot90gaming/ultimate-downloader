import React, { useState, useEffect } from 'react';
import { Search, ClipboardPaste, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { detectPlatform, PLATFORMS_INFO } from '../utils/urlDetector';
import { BrandIcon } from './BrandIcons';

interface MediaInputCardProps {
  inputUrl: string;
  setInputUrl: (url: string) => void;
  onAnalyze: (url: string) => void;
  isLoading: boolean;
}

export const MediaInputCard: React.FC<MediaInputCardProps> = ({
  inputUrl,
  setInputUrl,
  onAnalyze,
  isLoading,
}) => {
  const [platform, setPlatform] = useState(detectPlatform(inputUrl));

  useEffect(() => {
    setPlatform(detectPlatform(inputUrl));
  }, [inputUrl]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
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
  };

  const platformInfo = PLATFORMS_INFO[platform];

  return (
    <div className="w-full max-w-4xl mx-auto my-4">
      <form onSubmit={handleSubmit} className="relative group">
        {/* Glow ambient background behind input */}
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 via-accent-violet to-accent-cyan rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition-all duration-300 -z-10 group-focus-within:opacity-100 group-focus-within:blur-lg" />

        <div className="relative flex flex-col md:flex-row items-stretch gap-2 p-2 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl">
          {/* Main Input Box */}
          <div className="relative flex-1 flex items-center min-h-[56px] px-3">
            <div className="pl-1 pr-3 text-slate-400">
              <Search className="w-5 h-5 text-indigo-400 shrink-0" />
            </div>

            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste any link: YouTube, TikTok, Instagram, X/Twitter, Reddit, Pinterest..."
              aria-label="Media or webpage link"
              className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm sm:text-base font-normal focus:outline-none pr-8 selection:bg-indigo-500/30"
            />

            {/* Clear button if has input */}
            {inputUrl && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear input"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 cursor-pointer rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Platform detection badge */}
            {inputUrl && (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${platformInfo.badgeBg} transition-all duration-200 shrink-0 mr-1`}
              >
                <BrandIcon platform={platform} size={15} />
                <span>{platformInfo.name}</span>
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
              className="min-h-[48px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-xs sm:text-sm font-medium text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 shrink-0"
            >
              <ClipboardPaste className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Paste</span>
            </button>

            {/* Primary Submit CTA */}
            <button
              type="submit"
              disabled={!inputUrl.trim() || isLoading}
              aria-label="Analyze and Fetch Media"
              className="min-h-[48px] flex-1 md:flex-none px-6 rounded-xl bg-gradient-to-r from-accent-orange via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold text-sm sm:text-base shadow-glow-orange flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <span>Analyze & Fetch</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Example Links */}
      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 px-2 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="font-medium text-slate-300">Try quick demos:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setInputUrl(PLATFORMS_INFO.youtube.sampleUrl)}
            className="hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
          >
            YouTube 4K
          </button>
          <span className="text-slate-600">•</span>
          <button
            type="button"
            onClick={() => setInputUrl(PLATFORMS_INFO.tiktok.sampleUrl)}
            className="hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
          >
            TikTok HD
          </button>
          <span className="text-slate-600">•</span>
          <button
            type="button"
            onClick={() => setInputUrl(PLATFORMS_INFO.instagram.sampleUrl)}
            className="hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
          >
            Instagram Reel
          </button>
          <span className="text-slate-600">•</span>
          <button
            type="button"
            onClick={() => setInputUrl(PLATFORMS_INFO.webpage.sampleUrl)}
            className="hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
          >
            Image Scraper URL
          </button>
        </div>
      </div>
    </div>
  );
};
