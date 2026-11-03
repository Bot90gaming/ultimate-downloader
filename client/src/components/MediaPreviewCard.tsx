import React, { useState, useEffect } from 'react';
import {
  Download,
  Clock,
  Eye,
  Scissors,
  Music,
  Video,
  ExternalLink,
  Check,
  ChevronDown,
  User,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { MediaMetadata, MediaFormat, DownloadRequest } from '../../../shared/types';
import { BrandIcon } from './BrandIcons';
import { formatCompactNumber } from '../utils/formatters';

interface MediaPreviewCardProps {
  metadata: MediaMetadata;
  onStartDownload: (req: DownloadRequest) => void;
  onClose?: () => void;
  isStartingDownload?: boolean;
}

export const MediaPreviewCard: React.FC<MediaPreviewCardProps> = ({
  metadata,
  onStartDownload,
  onClose,
  isStartingDownload,
}) => {
  // Mode: 'video' | 'audio'
  const [mediaMode, setMediaMode] = useState<'video' | 'audio'>('video');

  // Format selector
  const [selectedFormatId, setSelectedFormatId] = useState<string>(
    metadata.formats[0]?.formatId || 'best'
  );

  // Audio only switch
  const [audioOnly, setAudioOnly] = useState<boolean>(false);

  // Trim toggle and times
  const [enableTrim, setEnableTrim] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<string>('00:00:00');
  const [trimEnd, setTrimEnd] = useState<string>(metadata.durationFormatted || '00:01:00');

  // Custom filename
  const [customFilename, setCustomFilename] = useState<string>('');

  // Dropdown open state
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Sync mode with audioOnly
  useEffect(() => {
    if (mediaMode === 'audio') {
      setAudioOnly(true);
      const audioFmt = metadata.formats.find((f) => !f.hasVideo && f.hasAudio);
      if (audioFmt) setSelectedFormatId(audioFmt.formatId);
    } else {
      setAudioOnly(false);
      const videoFmt = metadata.formats.find((f) => f.hasVideo) || metadata.formats[0];
      if (videoFmt) setSelectedFormatId(videoFmt.formatId);
    }
  }, [mediaMode, metadata.formats]);

  const activeFormat: MediaFormat | undefined =
    metadata.formats.find((f) => f.formatId === selectedFormatId) || metadata.formats[0];

  const handleDownload = () => {
    const directUrl = audioOnly
      ? (activeFormat?.directUrl || metadata.formats.find((f) => !f.hasVideo)?.directUrl)
      : (activeFormat?.directUrl || metadata.sourceUrl);

    const req: DownloadRequest = {
      url: metadata.url,
      directUrl: directUrl && directUrl !== metadata.url ? directUrl : undefined,
      formatId: activeFormat?.formatId,
      extension: audioOnly ? 'mp3' : activeFormat?.extension || 'mp4',
      mediaType: audioOnly ? 'audio' : 'video',
      audioOnly,
      trimStart: enableTrim ? trimStart : undefined,
      trimEnd: enableTrim ? trimEnd : undefined,
      customFilename: customFilename.trim() || undefined,
    };
    onStartDownload(req);
  };

  // Video formats vs Audio formats
  const videoFormats = metadata.formats.filter((f) => f.hasVideo);
  const audioFormats = metadata.formats.filter((f) => !f.hasVideo && f.hasAudio);

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-4 sm:p-6 rounded-2xl bg-white dark:bg-surface-800 border border-slate-200/90 dark:border-white/10 shadow-soft-xl backdrop-blur-xl transition-all duration-300 animate-fade-up">
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-white/5 mb-5">
        <div className="flex items-center gap-2">
          <BrandIcon platform={metadata.platform} size={20} />
          <span className="text-xs uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300">
            {metadata.platform} Media Found
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-xs font-semibold text-accent-green bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            Ready for extraction
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={metadata.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open original link"
            aria-label="Open original link"
            className="min-h-[38px] px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-700 rounded-lg cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Thumbnail + Right Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left: Thumbnail & Creator Meta */}
        <div className="md:col-span-5 relative group">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-surface-900 border border-slate-200/80 dark:border-white/5 shadow-soft-sm">
            <img
              src={
                metadata.thumbnail ||
                (metadata.platform === 'youtube' && metadata.id
                  ? `https://i.ytimg.com/vi/${metadata.id}/hqdefault.jpg`
                  : '')
              }
              alt={metadata.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.dataset.triedProxy && metadata.thumbnail && !metadata.thumbnail.startsWith('/api/')) {
                  target.dataset.triedProxy = 'true';
                  target.src = `/api/download-image?url=${encodeURIComponent(metadata.thumbnail)}&inline=true`;
                  return;
                }
                if (
                  metadata.platform === 'youtube' &&
                  metadata.id &&
                  !target.src.includes('hqdefault.jpg')
                ) {
                  target.src = `https://i.ytimg.com/vi/${metadata.id}/hqdefault.jpg`;
                }
              }}
              loading="lazy"
            />
            {/* Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Duration badge */}
            {metadata.durationFormatted && (
              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white text-xs font-mono font-medium flex items-center gap-1 border border-white/10 shadow-sm">
                <Clock className="w-3 h-3 text-brand-400" />
                <span>{metadata.durationFormatted}</span>
              </div>
            )}

            {/* Platform badge overlay */}
            <div className="absolute top-2.5 left-2.5 p-1.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 shadow-sm">
              <BrandIcon platform={metadata.platform} size={16} />
            </div>
          </div>

          {/* Author info & metrics */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 min-w-0">
              {metadata.author?.avatar ? (
                <img
                  src={metadata.author.avatar}
                  alt={metadata.author.name}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-surface-600"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-surface-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                {metadata.author?.name || 'Creator'}
              </span>
            </div>

            {metadata.viewCount !== undefined && (
              <div className="flex items-center gap-1 shrink-0">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">{formatCompactNumber(metadata.viewCount)} views</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Format, Quality & Trimmer Controls */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* Title */}
          <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-snug line-clamp-2">
            {metadata.title}
          </h3>

          {/* Mode Pill Switch: Video vs Audio (from Design Guide Section 5.5) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-surface-700/80 rounded-xl border border-slate-200/80 dark:border-white/5">
            <button
              type="button"
              onClick={() => setMediaMode('video')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                mediaMode === 'video'
                  ? 'bg-white dark:bg-surface-800 text-brand-600 dark:text-white shadow-soft-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video className="w-4 h-4 text-brand-500" />
              <span>Video (MP4)</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaMode('audio')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                mediaMode === 'audio'
                  ? 'bg-white dark:bg-surface-800 text-accent-purple dark:text-white shadow-soft-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Music className="w-4 h-4 text-accent-purple" />
              <span>Audio Only (MP3)</span>
            </button>
          </div>

          {/* Quality Grid Selector (Design Guide Section 5.5) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand-500" />
                <span>Choose Resolution / Bitrate</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400 uppercase">
                {activeFormat?.extension || 'mp4'}
              </span>
            </label>

            {/* Quick Quality Cards (Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(mediaMode === 'video' ? videoFormats : audioFormats)
                .slice(0, 6)
                .map((fmt) => {
                  const isSelected = selectedFormatId === fmt.formatId;
                  return (
                    <button
                      key={fmt.formatId}
                      type="button"
                      onClick={() => setSelectedFormatId(fmt.formatId)}
                      className={`group p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-brand-50/80 border-brand-500 dark:bg-brand-500/20 dark:border-brand-500 shadow-soft-xs ring-1 ring-brand-500/30'
                          : 'bg-white dark:bg-surface-700/60 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-surface-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isSelected
                              ? 'text-brand-700 dark:text-brand-300'
                              : 'text-slate-800 dark:text-white'
                          }`}
                        >
                          {fmt.resolution || fmt.qualityLabel || 'Stream'}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>.{fmt.extension}</span>
                        <span>{fmt.fileSizeFormatted || 'Adaptive'}</span>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Dropdown if more than 6 formats exist */}
            {metadata.formats.length > 6 && (
              <div className="relative pt-1">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-700/60 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <span className="font-medium">
                    More streams ({metadata.formats.length} total)
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 p-1.5 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-white/10 shadow-soft-xl max-h-48 overflow-y-auto">
                    {metadata.formats.map((fmt) => (
                      <button
                        key={fmt.formatId}
                        type="button"
                        onClick={() => {
                          setSelectedFormatId(fmt.formatId);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          selectedFormatId === fmt.formatId
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-white font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-700'
                        }`}
                      >
                        <span className="font-semibold">
                          {fmt.resolution || fmt.qualityLabel} (.{fmt.extension})
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {fmt.fileSizeFormatted || 'Adaptive'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Option Switches: Trimmer & Custom Name */}
          <div className="pt-1 space-y-2.5">
            {/* Trim Media Toggle Button */}
            <button
              type="button"
              onClick={() => setEnableTrim(!enableTrim)}
              aria-label="Toggle Media Trimmer"
              className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                enableTrim
                  ? 'bg-brand-50 border-brand-300 text-brand-800 dark:bg-brand-500/15 dark:border-brand-500/40 dark:text-brand-300 shadow-soft-xs'
                  : 'bg-slate-50 dark:bg-surface-700/40 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-brand-500" />
                <span>Trim Video Clip / Audio Segment</span>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${
                  enableTrim ? 'bg-brand-500' : 'bg-slate-300 dark:bg-surface-600'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    enableTrim ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Expanded Trimmer Inputs */}
            {enableTrim && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-brand-200/80 dark:border-brand-500/30 flex flex-col sm:flex-row items-center gap-3 animate-fade-in">
                <div className="flex-1 w-full">
                  <label className="block text-[11px] font-mono font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Start (HH:MM:SS)
                  </label>
                  <input
                    type="text"
                    value={trimStart}
                    onChange={(e) => setTrimStart(e.target.value)}
                    placeholder="00:00:00"
                    className="w-full min-h-[38px] px-3 rounded-lg bg-white dark:bg-surface-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex-1 w-full">
                  <label className="block text-[11px] font-mono font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    End (HH:MM:SS)
                  </label>
                  <input
                    type="text"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(e.target.value)}
                    placeholder="00:01:30"
                    className="w-full min-h-[38px] px-3 rounded-lg bg-white dark:bg-surface-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* Custom filename input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Custom File Name (Optional)
              </label>
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="e.g. Favorite_Track_2026"
                className="w-full min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </div>

          {/* Primary Action Button (Liquid brand sheen) */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isStartingDownload}
            aria-label="Start Download"
            className="w-full min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-brand-500 via-brand-600 to-accent-indigo hover:from-brand-600 hover:to-accent-purple text-white font-bold text-sm sm:text-base shadow-soft-md hover:shadow-glow-brand flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-1"
          >
            <Download className="w-5 h-5 shrink-0" />
            <span>
              Download {audioOnly ? 'Lossless Audio (MP3)' : activeFormat?.resolution || 'Video'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
