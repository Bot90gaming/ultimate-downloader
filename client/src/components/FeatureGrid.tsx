import React from 'react';
import { Film, Music, Layers, Scissors, ShieldCheck, HeartHandshake } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
  accentGradient: string;
}

export const FeatureGrid: React.FC = () => {
  const features: FeatureCardProps[] = [
    {
      icon: <Film className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />,
      title: '4K & 8K Ultra HD Video',
      description:
        'Extract crystal-clear original video up to 60fps with HDR colors and high-bitrate AV1/H.264 streams directly from source servers.',
      tag: 'Lossless Visuals',
      accentGradient: 'from-cyan-500/10 to-blue-500/5 dark:from-cyan-500/20 dark:to-blue-500/10 border-cyan-500/20 dark:border-cyan-500/30',
    },
    {
      icon: <Music className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      title: 'High-Fidelity Audio',
      description:
        'Demux lossless audio tracks in 320kbps MP3, Opus, or AAC. Perfect for music videos, podcasts, and sound effect libraries.',
      tag: 'Studio Grade',
      accentGradient: 'from-amber-500/10 to-orange-500/5 dark:from-amber-500/20 dark:to-orange-500/10 border-amber-500/20 dark:border-amber-500/30',
    },
    {
      icon: <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
      title: 'Batch Image & Album Scraper',
      description:
        'Crawl full web pages, Instagram carousels, or photo galleries. Bundle dozens of high-res image files into clean ZIP archives.',
      tag: 'Bulk Automation',
      accentGradient: 'from-indigo-500/10 to-purple-500/5 dark:from-indigo-500/20 dark:to-purple-500/10 border-indigo-500/20 dark:border-indigo-500/30',
    },
    {
      icon: <Scissors className="w-6 h-6 text-pink-600 dark:text-pink-400" />,
      title: 'Built-in FFmpeg Trimmer',
      description:
        'Select precision start and end timestamps before starting your download. Extract exactly the video clip or audio sample you need.',
      tag: 'Zero Re-encoding',
      accentGradient: 'from-pink-500/10 to-rose-500/5 dark:from-pink-500/20 dark:to-rose-500/10 border-pink-500/20 dark:border-pink-500/30',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
      title: 'Privacy-First Architecture',
      description:
        'No tracking cookies, zero user telemetry, and no intermediate third-party logging. Your links and media remain completely private.',
      tag: '100% Private',
      accentGradient: 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10 border-emerald-500/20 dark:border-emerald-500/30',
    },
    {
      icon: <HeartHandshake className="w-6 h-6 text-violet-600 dark:text-violet-400" />,
      title: '100% Free & Open Source',
      description:
        'Powered by open-source tools: yt-dlp, FFmpeg, Vite, and React. No premium paywalls, no bandwidth limits, and no subscriptions.',
      tag: 'Community Driven',
      accentGradient: 'from-violet-500/10 to-indigo-500/5 dark:from-violet-500/20 dark:to-indigo-500/10 border-violet-500/20 dark:border-violet-500/30',
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto my-12 px-4 sm:px-6">
      <div className="text-center mb-8">
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          Engineered for Media Power-Users
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          Every tool you need to extract, convert, and archive media with uncompromising speed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feat, index) => (
          <div
            key={index}
            className={`p-6 rounded-2xl bg-white/90 dark:bg-slate-900/80 border ${feat.accentGradient} backdrop-blur-xl hover:translate-y-[-4px] transition-all duration-300 group shadow-soft hover:shadow-soft-lg`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform duration-200">
                {feat.icon}
              </div>
              <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                {feat.tag}
              </span>
            </div>

            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
              {feat.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {feat.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
