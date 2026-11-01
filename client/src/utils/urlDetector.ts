import { SupportedPlatform } from '../../../shared/types';

export interface PlatformInfo {
  id: SupportedPlatform;
  name: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  sampleUrl: string;
}

export const PLATFORMS_INFO: Record<SupportedPlatform, PlatformInfo> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    badgeBg: 'bg-red-500/15 border-red-500/30 text-red-400',
    accentColor: '#ef4444',
    badgeText: 'text-red-400',
    sampleUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
    accentColor: '#00f2fe',
    badgeText: 'text-cyan-400',
    sampleUrl: 'https://www.tiktok.com/@creative/video/731110022394857216',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    badgeBg: 'bg-pink-500/15 border-pink-500/30 text-pink-400',
    accentColor: '#e1306c',
    badgeText: 'text-pink-400',
    sampleUrl: 'https://www.instagram.com/reel/C3xL9v1P3qm/',
  },
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    badgeBg: 'bg-slate-500/20 border-slate-500/30 text-slate-300',
    accentColor: '#94a3b8',
    badgeText: 'text-slate-300',
    sampleUrl: 'https://x.com/OpenAI/status/1758209823468519632',
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    badgeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
    accentColor: '#ff4500',
    badgeText: 'text-orange-400',
    sampleUrl: 'https://www.reddit.com/r/technology/comments/1example/super_ai_breakthrough',
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
    accentColor: '#e60023',
    badgeText: 'text-rose-400',
    sampleUrl: 'https://www.pinterest.com/pin/1234567890123456/',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    badgeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    accentColor: '#1877f2',
    badgeText: 'text-blue-400',
    sampleUrl: 'https://www.facebook.com/watch/?v=102234059483',
  },
  vimeo: {
    id: 'vimeo',
    name: 'Vimeo',
    badgeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    accentColor: '#1ab7ea',
    badgeText: 'text-sky-400',
    sampleUrl: 'https://vimeo.com/76979871',
  },
  soundcloud: {
    id: 'soundcloud',
    name: 'SoundCloud',
    badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    accentColor: '#ff5500',
    badgeText: 'text-amber-400',
    sampleUrl: 'https://soundcloud.com/artist/track-title',
  },
  webpage: {
    id: 'webpage',
    name: 'Webpage',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    accentColor: '#10b981',
    badgeText: 'text-emerald-400',
    sampleUrl: 'https://unsplash.com/t/wallpapers',
  },
  direct: {
    id: 'direct',
    name: 'Direct Link',
    badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
    accentColor: '#6366f1',
    badgeText: 'text-indigo-400',
    sampleUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
};

export function detectPlatform(url: string): SupportedPlatform {
  if (!url || typeof url !== 'string') return 'direct';
  const clean = url.trim().toLowerCase();

  if (clean.includes('youtube.com') || clean.includes('youtu.be')) return 'youtube';
  if (clean.includes('tiktok.com')) return 'tiktok';
  if (clean.includes('instagram.com')) return 'instagram';
  if (clean.includes('twitter.com') || clean.includes('x.com')) return 'twitter';
  if (clean.includes('reddit.com')) return 'reddit';
  if (clean.includes('pinterest.com') || clean.includes('pin.it')) return 'pinterest';
  if (clean.includes('facebook.com') || clean.includes('fb.watch')) return 'facebook';
  if (clean.includes('vimeo.com')) return 'vimeo';
  if (clean.includes('soundcloud.com')) return 'soundcloud';

  // Check if direct file extension
  if (/\.(mp4|webm|mkv|mov|mp3|m4a|wav|flac|png|jpe?g|webp|gif)(\?.*)?$/i.test(clean)) {
    return 'direct';
  }

  // Any standard HTTP URL without matching known video sites is treated as webpage
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return 'webpage';
  }

  return 'direct';
}
