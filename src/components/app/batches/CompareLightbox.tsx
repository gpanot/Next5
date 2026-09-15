'use client';

import { Download, Maximize2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { SegmentedControl } from '../../ui/SegmentedControl';

type CompareLightboxProps = {
  originalUrl: string | null;
  generatedUrl: string;
  title: string;
  onClose: () => void;
  /** Saves the generated photo. */
  onDownload?: () => void;
  downloading?: boolean;
  panel?: ReactNode;
};

type Side = 'original' | 'generated';

const DownloadButton = ({ onClick, busy, className = '' }: { onClick: () => void; busy: boolean; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    className={`inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-medium text-black transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:opacity-60 ${className}`}
  >
    <Download aria-hidden className="h-4 w-4" />{busy ? 'Downloading…' : 'Download'}
  </button>
);

/** One photo in the compare view; tap to see it full screen. */
const ComparePhoto = ({ src, alt, caption, visible, onZoom }: { src: string; alt: string; caption: string; visible: boolean; onZoom: () => void }) => (
  <figure className={`h-full min-h-0 flex-1 flex-col items-center gap-2 ${visible ? 'flex' : 'hidden'} sm:flex`}>
    <button type="button" onClick={onZoom} aria-label={`See ${caption.toLowerCase()} full screen`} className="group relative flex min-h-0 max-w-full flex-1 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
      <img src={src} alt={alt} className="max-h-full max-w-full cursor-zoom-in rounded-xl object-contain" />
      <Maximize2 aria-hidden className="absolute right-3 top-3 h-5 w-5 text-white opacity-80 drop-shadow transition-opacity duration-200 group-hover:opacity-100" />
    </button>
    <figcaption className="label-caps text-[10px] text-white/70">{caption}</figcaption>
  </figure>
);

/** Side by side on desktop; a toggle between original and generated on phones. Tap a photo for full screen. */
export const CompareLightbox = ({ originalUrl, generatedUrl, title, onClose, onDownload, downloading = false, panel }: CompareLightboxProps) => {
  const [view, setView] = useState<Side>('generated');
  const [zoomed, setZoomed] = useState<Side | null>(null);

  useEffect(() => {
    // The full-screen viewer handles Escape itself (and stops it), so this only closes the compare view.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <>
      <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex flex-col bg-black/92 p-4 animate-fade-in">
        <div className="flex items-center justify-between gap-3 text-white">
          <p className="min-w-0 truncate text-[15px] font-medium">{title}</p>
          <div className="flex shrink-0 items-center gap-2">
            {onDownload && <DownloadButton onClick={onDownload} busy={downloading} />}
            <button type="button" aria-label="Close" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10"><X aria-hidden className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="mt-2 flex justify-center sm:hidden">
          <SegmentedControl options={[{ value: 'original', label: 'Original' }, { value: 'generated', label: 'Generated' }]} value={view} onChange={(v) => setView(v)} />
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center gap-4 py-4">
          {originalUrl && <ComparePhoto src={originalUrl} alt="Your product photo" caption="Your product" visible={view === 'original'} onZoom={() => setZoomed('original')} />}
          <ComparePhoto src={generatedUrl} alt="Generated photo" caption="Next5" visible={view === 'generated'} onZoom={() => setZoomed('generated')} />
        </div>
        {panel && <div className="mx-auto w-full max-w-xl shrink-0">{panel}</div>}
      </div>
      {zoomed && (
        <ImageLightbox
          src={zoomed === 'original' && originalUrl ? originalUrl : generatedUrl}
          alt={zoomed === 'original' ? 'Your product photo' : 'Generated photo'}
          onClose={() => setZoomed(null)}
          overlay={zoomed === 'generated' && onDownload ? (
            <DownloadButton onClick={onDownload} busy={downloading} className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 shadow-lg" />
          ) : undefined}
        />
      )}
    </>,
    document.body,
  );
};
