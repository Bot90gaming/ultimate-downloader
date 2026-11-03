import React from 'react';
import { Sparkles, Zap, ShieldCheck } from 'lucide-react';
import { BrandIcon } from './BrandIcons';
import { PLATFORMS_INFO } from '../utils/urlDetector';
import { SupportedPlatform } from '../../../shared/types';

interface HeroSectionProps {
  onSelectPlatformSample: (url: string) => void;
}

const FEATURED_PLATFORMS: SupportedPlatform[] = [
  'youtube',
  'tiktok',
  'instagram',
  'twitter',
  'reddit',
  'pinterest',
  'facebook',
  'vimeo',
  'soundcloud',
  'webpage',
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectPlatformSample }) => {
  return (
    <section className="relative pt-6 sm:pt-10 pb-6 text-center animate-fade-up overflow-hidden">
      {/* Ambient background light glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-full h-[300px] bg-gradient-to-tr from-brand-400/20 via-accent-purple/15 to-accent-cyan/15 blur-3xl pointer-events-none -z-10" />

      {/* Trust pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-surface-800/90 border border-slate-200/90 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 mb-5 shadow-soft-xs backdrop-blur-sm">
        <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
        <span className="bg-gradient-to-r from-brand-600 to-accent-purple dark:from-brand-400 dark:to-accent-purple bg-clip-text text-transparent font-bold">
          v2.0 Next-Gen Media Engine
        </span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <span className="text-slate-500 dark:text-slate-400 font-medium">4K 60fps & 320kbps Lossless</span>
      </div>

      {/* Main Headline */}
      <h1 className="font-display font-black text-3xl xs:text-4xl sm:text-5xl md:text-6xl tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.14]">
        Download Anything.{' '}
        <span className="bg-gradient-to-r from-brand-500 via-accent-indigo to-accent-purple bg-clip-text text-transparent">
          Anywhere.
        </span>{' '}
        In Seconds.
      </h1>

      {/* Subheading */}
      <p className="mt-3.5 sm:mt-4 text-slate-600 dark:text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed px-4">
        High-fidelity video, lossless audio, carousel albums, and full-page image scrapers
        built for modern creators. Free, unlimited, and lightning-fast.
      </p>

      {/* Interactive Platform Pill Tags */}
      <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-3xl mx-auto px-2">
        {FEATURED_PLATFORMS.map((platKey) => {
          const info = PLATFORMS_INFO[platKey];
          return (
            <button
              key={platKey}
              onClick={() => onSelectPlatformSample(info.sampleUrl)}
              title={`Click to test ${info.name}`}
              aria-label={`Test ${info.name} sample`}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/90 dark:bg-surface-800/80 hover:bg-brand-50/80 dark:hover:bg-surface-700 border border-slate-200/80 dark:border-white/10 hover:border-brand-300 dark:hover:border-white/20 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 group shadow-soft-xs"
            >
              <BrandIcon platform={platKey} size={16} />
              <span className="font-semibold tracking-tight">
                {info.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick metrics / trust perks */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-accent-yellow" />
          <span className="font-medium">Zero watermarks</span>
        </span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-green" />
          <span className="font-medium">Ephemeral storage (auto-deleted)</span>
        </span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span className="font-medium">Built-in FFmpeg & yt-dlp</span>
        </span>
      </div>
    </section>
  );
};
