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
    <section className="relative pt-6 pb-6 text-center">
      {/* Radiant Glow ambient lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-brand-600/15 via-accent-violet/15 to-accent-cyan/15 blur-3xl pointer-events-none -z-10" />

      {/* Trust pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300 mb-5 shadow-sm backdrop-blur-sm">
        <Sparkles className="w-3.5 h-3.5 text-accent-cyan animate-pulse" />
        <span className="bg-gradient-to-r from-indigo-200 to-cyan-200 bg-clip-text text-transparent font-semibold">
          v2.0 Next-Gen Media Engine
        </span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400">4K 60fps & 320kbps Lossless</span>
      </div>

      {/* Main Headline */}
      <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
        Download Anything.{' '}
        <span className="bg-gradient-to-r from-brand-400 via-accent-violet to-accent-cyan bg-clip-text text-transparent">
          Anywhere.
        </span>{' '}
        In Seconds.
      </h1>

      {/* Subheading */}
      <p className="mt-4 text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
        High-fidelity video, lossless audio, carousel albums, and full-page image scrapers
        built for modern creators. Free, unlimited, and lightning-fast.
      </p>

      {/* Interactive Platform Pill Tags */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
        {FEATURED_PLATFORMS.map((platKey) => {
          const info = PLATFORMS_INFO[platKey];
          return (
            <button
              key={platKey}
              onClick={() => onSelectPlatformSample(info.sampleUrl)}
              title={`Click to test ${info.name}`}
              aria-label={`Test ${info.name} sample`}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 group shadow-sm"
            >
              <BrandIcon platform={platKey} size={18} />
              <span className="font-medium tracking-tight group-hover:text-white transition-colors">
                {info.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick metrics / trust perks */}
      <div className="mt-5 flex items-center justify-center gap-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Zero watermarks</span>
        </span>
        <span className="text-slate-700">•</span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>No rate-limits</span>
        </span>
        <span className="text-slate-700">•</span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Built-in FFmpeg</span>
        </span>
      </div>
    </section>
  );
};
