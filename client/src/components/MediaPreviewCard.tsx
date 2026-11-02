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

  // Auto-switch to audio format if audioOnly toggled
  useEffect(() => {
    if (audioOnly) {
      const audioFmt = metadata.formats.find((f) => !f.hasVideo && f.hasAudio);
      if (audioFmt) setSelectedFormatId(audioFmt.formatId);
    } else {
      const videoFmt = metadata.formats.find((f) => f.hasVideo);
      if (videoFmt) setSelectedFormatId(videoFmt.formatId);
    }
  }, [audioOnly, metadata.formats]);

  const activeFormat: MediaFormat | undefined =
    metadata.formats.find((f) => f.formatId === selectedFormatId) || metadata.formats[0];

  const handleDownload = () => {
    const req: DownloadRequest = {
      url: metadata.url,
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

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
        <div className="flex items-center gap-2">
          <BrandIcon platform={metadata.platform} size={20} />
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            {metadata.platform} Media Found
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready for extraction
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={metadata.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open original link"
            aria-label="Open original link"
            className="min-h-[44px] px-3 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Media Details Layout: Thumbnail Left + Config Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Thumbnail & Badges */}
        <div className="md:col-span-5 relative group">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
            <img
              src={metadata.thumbnail || (metadata.platform === 'youtube' && metadata.id ? `https://i.ytimg.com/vi/${metadata.id}/hqdefault.jpg` : '')}
              alt={metadata.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (metadata.platform === 'youtube' && metadata.id && !target.src.includes('hqdefault.jpg')) {
                  target.src = `https://i.ytimg.com/vi/${metadata.id}/hqdefault.jpg`;
                }
              }}
              loading="lazy"
            />
            {/* Ambient vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

            {/* Duration badge */}
            {metadata.durationFormatted && (
              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-950/90 text-white text-xs font-mono font-medium flex items-center gap-1 border border-slate-800">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>{metadata.durationFormatted}</span>
              </div>
            )}

            {/* Platform badge overlay */}
            <div className="absolute top-2.5 left-2.5 p-1.5 rounded-lg bg-slate-950/90 border border-slate-800">
              <BrandIcon platform={metadata.platform} size={16} />
            </div>
          </div>

          {/* Author info & metrics */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 min-w-0">
              {metadata.author?.avatar ? (
                <img
                  src={metadata.author.avatar}
                  alt={metadata.author.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="font-medium text-slate-200 truncate max-w-[150px]">
                {metadata.author?.name || 'Creator'}
              </span>
            </div>

            {metadata.viewCount !== undefined && (
              <div className="flex items-center gap-1 text-slate-400 shrink-0">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatCompactNumber(metadata.viewCount)} views</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls & Download Options */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* Title */}
          <h3 className="font-display font-bold text-lg text-white leading-snug line-clamp-2">
            {metadata.title}
          </h3>

          {/* Format / Quality Selector Dropdown */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Select Resolution & Encoding</span>
            </label>

            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 flex items-center justify-between text-sm text-left cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {audioOnly ? (
                  <Music className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
                <span className="font-semibold text-white truncate">
                  {activeFormat?.resolution || 'Original Quality'}
                </span>
                <span className="text-xs text-slate-400 uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800">
                  {activeFormat?.extension || 'mp4'}
                </span>
                {activeFormat?.fileSizeFormatted && (
                  <span className="text-xs text-indigo-300 font-medium">
                    ({activeFormat.fileSizeFormatted})
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-30 p-1.5 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl max-h-56 overflow-y-auto">
                {metadata.formats.map((fmt) => (
                  <button
                    key={fmt.formatId}
                    type="button"
                    onClick={() => {
                      setSelectedFormatId(fmt.formatId);
                      setIsDropdownOpen(false);
                      if (!fmt.hasVideo && fmt.hasAudio) {
                        setAudioOnly(true);
                      }
                    }}
                    className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                      selectedFormatId === fmt.formatId
                        ? 'bg-indigo-600/20 text-indigo-200 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {fmt.hasVideo ? (
                        <Video className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Music className="w-4 h-4 text-amber-400" />
                      )}
                      <span>{fmt.resolution || fmt.qualityLabel || 'Stream'}</span>
                      <span className="text-[11px] font-mono uppercase text-slate-400">
                        .{fmt.extension}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {fmt.fileSizeFormatted && (
                        <span className="text-xs text-slate-400 font-mono">
                          {fmt.fileSizeFormatted}
                        </span>
                      )}
                      {selectedFormatId === fmt.formatId && (
                        <Check className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Option Switches: Audio Only & Video Trimmer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Audio Only Toggle Button */}
            <button
              type="button"
              onClick={() => setAudioOnly(!audioOnly)}
              aria-label="Toggle Audio Only"
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                audioOnly
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                <span>Audio Only (MP3 320k)</span>
              </div>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ${
                  audioOnly ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    audioOnly ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Trim Media Toggle Button */}
            <button
              type="button"
              onClick={() => setEnableTrim(!enableTrim)}
              aria-label="Toggle Media Trimmer"
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                enableTrim
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-indigo-400" />
                <span>Trim Video Clip</span>
              </div>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ${
                  enableTrim ? 'bg-indigo-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    enableTrim ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Expanded Trimmer Inputs */}
          {enableTrim && (
            <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-200">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                  Start Point (HH:MM:SS)
                </label>
                <input
                  type="text"
                  value={trimStart}
                  onChange={(e) => setTrimStart(e.target.value)}
                  placeholder="00:00:05"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex-1 w-full">
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                  End Point (HH:MM:SS)
                </label>
                <input
                  type="text"
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(e.target.value)}
                  placeholder="00:00:30"
                  className="w-full min-h-[44px] px-3 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Custom filename input */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Custom File Name (Optional)
            </label>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="e.g. Highlight_Clip_1"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isStartingDownload}
            aria-label="Start Download"
            className="w-full min-h-[50px] px-6 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-cyan hover:from-brand-500 hover:to-cyan-400 text-white font-semibold text-sm sm:text-base shadow-glow flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-1"
          >
            <Download className="w-5 h-5 shrink-0" />
            <span>Download {audioOnly ? 'Lossless Audio' : activeFormat?.resolution || 'Video'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
