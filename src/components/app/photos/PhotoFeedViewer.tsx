'use client';

import { ChevronUp, Download, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHistoryBack } from '../../../hooks/useHistoryBack';
import { AppButton } from '../../ui/AppButton';
import { Sheet } from '../../ui/Sheet';
import { ScorePill } from './ScorePill';

export type FeedPhoto = { id: string; url: string | null; score: number | null };

type Props<T extends FeedPhoto> = {
  photos: readonly T[];
  startIndex: number;
  alt: (photo: T) => string;
  onClose: () => void;
  onDownload: (photo: T, index: number) => void;
  downloading?: boolean;
  /** The score breakdown and Post Kit, shown in a sheet when the pill is tapped. */
  details: (photo: T) => ReactNode;
  /** A secondary action shown at the top of the details sheet, e.g. "Open batch". Kept off the photo. */
  action?: (photo: T) => ReactNode;
};

/**
 * Full-screen photos you scroll up and down, one per screen, like a Reels or TikTok feed.
 * The photo gets the whole screen; the score is a pill on top, and everything else lives
 * in a sheet she opens on purpose.
 */
export const PhotoFeedViewer = <T extends FeedPhoto>({ photos, startIndex, alt, onClose, onDownload, downloading = false, details, action }: Props<T>) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const current = photos[Math.min(index, photos.length - 1)];

  useHistoryBack(true, onClose);

  // Open on the photo she tapped, with no animation from the top.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = startIndex * el.clientHeight;
  }, [startIndex]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    scroller.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previous; };
  }, []);

  const onScroll = () => {
    const el = scroller.current;
    if (!el || el.clientHeight === 0) return;
    const next = Math.round(el.scrollTop / el.clientHeight);
    if (next !== index) {
      setIndex(next);
      setScrolled(true);
      setDetailsOpen(false);
    }
  };

  // On the document, not the scroller: after the details sheet closes, focus is back on the pill.
  const count = photos.length;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (detailsOpen) return;
      const el = scroller.current;
      const step = (delta: number) => {
        e.preventDefault();
        if (el) el.scrollTo({ top: Math.max(0, Math.min(count - 1, index + delta)) * el.clientHeight, behavior: 'smooth' });
      };
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'j') step(1);
      if (e.key === 'ArrowUp' || e.key === 'k') step(-1);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detailsOpen, index, count, onClose]);

  if (typeof document === 'undefined' || !current) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photos" className="fixed inset-0 z-[90] bg-black">
      <div
        ref={scroller}
        tabIndex={-1}
        onScroll={onScroll}
        className="h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <section key={photo.id} aria-label={`Photo ${i + 1} of ${photos.length}`} className="flex h-[100dvh] snap-start snap-always items-center justify-center">
            {photo.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt={alt(photo)}
                loading={Math.abs(i - startIndex) <= 1 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                className="max-h-[100dvh] w-full select-none object-contain"
              />
            )}
          </section>
        ))}
      </div>

      {/* Controls sit over the feed and act on whichever photo is on screen. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/50 to-transparent px-3 pb-8 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="pointer-events-auto flex gap-2">
          <AppButton size="sm" variant="secondary" loading={downloading} iconLeft={<Download aria-hidden className="h-3.5 w-3.5" />} onClick={() => onDownload(current, index)}>
            Download
          </AppButton>
        </div>
        <ScorePill score={current.score} open={detailsOpen} onToggle={() => setDetailsOpen((v) => !v)} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-md transition-colors duration-200 hover:bg-black/60"
        >
          <X aria-hidden className="h-5 w-5" />
        </button>
      </div>

      {photos.length > 1 && (
        <p aria-live="polite" className="pointer-events-none absolute bottom-[max(env(safe-area-inset-bottom),16px)] left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-[12px] tabular-nums text-white/85 backdrop-blur-sm">
          {!scrolled && index < photos.length - 1 && <ChevronUp aria-hidden className="h-3.5 w-3.5 motion-safe:animate-bounce" />}
          {!scrolled && index < photos.length - 1 ? 'Swipe up · ' : ''}{index + 1} / {photos.length}
        </p>
      )}

      <Sheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title="About this photo" side="bottom" className="sm:mx-auto sm:max-w-lg">
        <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-8 pt-2">
          {action && <div className="flex gap-2">{action(current)}</div>}
          {details(current)}
        </div>
      </Sheet>
    </div>,
    document.body,
  );
};
