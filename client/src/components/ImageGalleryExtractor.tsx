import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Search,
  CheckSquare,
  Square,
  Archive,
  Download,
  Maximize2,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ExtractedImage } from '../../../shared/types';
import { extractImagesFromUrl } from '../utils/api';

interface ImageGalleryExtractorProps {
  onNotify: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

export const ImageGalleryExtractor: React.FC<ImageGalleryExtractorProps> = ({ onNotify }) => {
  const [targetUrl, setTargetUrl] = useState<string>('https://unsplash.com/t/wallpapers');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zoomedImage, setZoomedImage] = useState<ExtractedImage | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetUrl.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const results = await extractImagesFromUrl(targetUrl.trim());
      setImages(results);
      // Auto-select all by default
      setSelectedIds(new Set(results.map((img) => img.id)));
      onNotify('success', 'Images Extracted', `Successfully scanned ${results.length} image assets.`);
    } catch {
      onNotify('error', 'Extraction Failed', 'Could not extract images from this webpage.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  };

  const handleDownloadZip = async () => {
    const selectedUrls = images.filter((img) => selectedIds.has(img.id)).map((img) => img.url);
    if (selectedUrls.length === 0) return;

    setIsZipping(true);
    onNotify('info', 'Creating ZIP Archive', `Bundling ${selectedUrls.length} images into a ZIP archive...`);

    try {
      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: selectedUrls,
          zipName: 'extracted_images',
        }),
      });

      if (!response.ok) {
        throw new Error('Server failed to assemble ZIP archive');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `images_archive_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      onNotify('success', 'ZIP Downloaded', `Successfully downloaded ${selectedUrls.length} images.`);
    } catch (err: any) {
      onNotify('error', 'ZIP Failed', err.message || 'Could not download ZIP archive');
    } finally {
      setIsZipping(false);
    }
  };

  const handleSingleDownload = (img: ExtractedImage) => {
    const downloadUrl = `/api/download-image?url=${encodeURIComponent(img.url)}&filename=image_${img.id}.${img.extension || 'jpg'}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `image_${img.id}.${img.extension || 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('success', 'Download Started', `Downloading image ${img.id}`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto my-6 p-4 sm:p-7 rounded-2xl bg-white dark:bg-surface-800 border border-slate-200/90 dark:border-white/10 shadow-soft-xl backdrop-blur-xl animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-200/80 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 border border-brand-200/80 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
              Webpage & Album Image Scraper
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Extract high-resolution images, carousels, and photo galleries into a single ZIP archive.
            </p>
          </div>
        </div>

        {/* Scan input form */}
        <form onSubmit={handleScan} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="Enter page URL: e.g. unsplash.com, pinterest.com..."
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !targetUrl.trim()}
            className="min-h-[44px] px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shrink-0 shadow-soft-xs"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Scrape</span>
          </button>
        </form>
      </div>

      {/* Toolbar when images loaded */}
      {images.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 my-4 sm:my-5 p-3 rounded-xl bg-slate-50 dark:bg-surface-900 border border-slate-200/80 dark:border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="min-h-[40px] px-3 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface-800 flex items-center gap-2 cursor-pointer transition-colors shadow-soft-xs"
            >
              {selectedIds.size === images.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-brand-500" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Select All ({images.length})</span>
                </>
              )}
            </button>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              <span className="text-slate-900 dark:text-white font-bold">{selectedIds.size}</span> of {images.length} selected
            </span>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={selectedIds.size === 0 || isZipping}
            className="min-h-[40px] px-5 rounded-xl bg-gradient-to-r from-brand-500 via-brand-600 to-accent-indigo hover:from-brand-600 hover:to-accent-purple text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-soft-md hover:shadow-glow-brand cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isZipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating ZIP...</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                <span>Download Selected as ZIP</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty State before scanning */}
      {images.length === 0 && !isLoading && (
        <div className="py-12 sm:py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-surface-700/60 border border-brand-100 dark:border-white/5 mx-auto flex items-center justify-center text-brand-500 mb-4 shadow-soft-xs">
            <ImageIcon className="w-8 h-8 text-brand-500" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-200">
            No images scanned yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Paste any webpage, portfolio, or wallpaper URL above and hit Scrape to extract all media assets.
          </p>
          <button
            onClick={() => handleScan()}
            className="mt-4 min-h-[40px] px-4 rounded-xl bg-white dark:bg-surface-700 hover:bg-slate-50 dark:hover:bg-surface-600 text-xs font-bold text-brand-600 dark:text-brand-300 border border-slate-200 dark:border-white/10 cursor-pointer transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 shadow-soft-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Wallpaper Gallery</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 my-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-surface-700 dark:via-surface-600 dark:to-surface-700 animate-shimmer border border-slate-200 dark:border-white/5"
              style={{ backgroundSize: '200% 100%' }}
            />
          ))}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && !isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {images.map((img) => {
            const isSelected = selectedIds.has(img.id);

            return (
              <div
                key={img.id}
                className={`group relative rounded-xl overflow-hidden border transition-all duration-200 bg-white dark:bg-surface-900 shadow-soft-xs hover:shadow-soft-md ${
                  isSelected
                    ? 'border-brand-500 ring-2 ring-brand-500/30'
                    : 'border-slate-200/80 dark:border-white/5 hover:border-slate-300'
                }`}
              >
                {/* Thumbnail */}
                <div
                  className="aspect-square overflow-hidden bg-slate-100 dark:bg-surface-950 relative cursor-pointer"
                  onClick={() => toggleSelect(img.id)}
                >
                  <img
                    src={img.thumbnailUrl}
                    alt={img.alt || 'Extracted Image'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors" />
                </div>

                {/* Selection Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelect(img.id)}
                  aria-label={isSelected ? 'Deselect image' : 'Select image'}
                  className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center cursor-pointer z-10"
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all shadow-sm ${
                      isSelected
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-white/90 dark:bg-surface-900/90 border-slate-300 dark:border-surface-600 text-transparent'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 text-white" />
                  </div>
                </button>

                {/* Zoom / Lightbox Trigger */}
                <button
                  type="button"
                  onClick={() => setZoomedImage(img)}
                  aria-label="Zoom image preview"
                  title="Zoom full image"
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 dark:bg-surface-900/90 hover:bg-white text-slate-700 dark:text-slate-200 hover:text-brand-600 border border-slate-200 dark:border-surface-600 cursor-pointer shadow-sm transition-transform active:scale-90 z-10"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Bottom details bar */}
                <div className="p-2.5 bg-white dark:bg-surface-900/90 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-bold uppercase">
                      {img.extension}
                    </span>
                    {img.width && img.height && (
                      <span className="text-slate-400 dark:text-slate-500 ml-1.5 font-mono text-[11px]">
                        {img.width}x{img.height}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSingleDownload(img)}
                    title="Download this image directly"
                    aria-label="Download image"
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-brand-600 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative max-w-4xl w-full bg-white dark:bg-surface-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Top Bar */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-white/5">
              <div className="text-xs text-slate-600 dark:text-slate-300 font-mono font-medium">
                {zoomedImage.width}x{zoomedImage.height} • {zoomedImage.sizeFormatted || 'Full Resolution'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSingleDownload(zoomedImage)}
                  className="min-h-[38px] px-3.5 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-brand-100"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setZoomedImage(null)}
                  className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-surface-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image display */}
            <div className="max-h-[75vh] flex items-center justify-center bg-slate-50 dark:bg-surface-950 p-2">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.alt || 'Full Resolution'}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
