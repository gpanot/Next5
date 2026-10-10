'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PreviewShow } from './previewSlides';
import { PreviewSlideView } from './PreviewSlideView';

type Props = { shows: PreviewShow[]; rendered: boolean; startShow?: number; onClose: () => void; makeButton: React.ReactNode };

const arrow = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-25 max-sm:hidden';

function Chevron({ left }: { left?: boolean }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={left ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

/** One slideshow's slides in a phone-sized frame: swipe on phones, arrows or keys on wide screens. */
function SlidePlayer({ show }: { show: PreviewShow }) {
  const track = useRef<HTMLOListElement>(null);
  const [at, setAt] = useState(0);
  const go = (i: number) => {
    const box = track.current;
    if (box) box.scrollTo({ left: i * box.clientWidth, behavior: 'smooth' });
  };
  const onScroll = () => {
    const box = track.current;
    if (box) setAt(Math.round(box.scrollLeft / Math.max(1, box.clientWidth)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(Math.min(at + 1, show.slides.length - 1));
      if (e.key === 'ArrowLeft') go(Math.max(at - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at, show.slides.length]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous slide" className={arrow}><Chevron left /></button>
        <div className="relative aspect-[9/16] h-[min(calc(100dvh-15rem),640px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-zinc-900 shadow-xl ring-1 ring-white/10">
          <ol ref={track} onScroll={onScroll} aria-label="Slides" className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
            {show.slides.map((s, i) => (
              <li key={i} className="h-full w-full shrink-0 snap-center" aria-label={`Slide ${i + 1} of ${show.slides.length}`}>
                <PreviewSlideView slide={s} />
              </li>
            ))}
          </ol>
          <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{at + 1}/{show.slides.length}</span>
        </div>
        <button type="button" onClick={() => go(at + 1)} disabled={at >= show.slides.length - 1} aria-label="Next slide" className={arrow}><Chevron /></button>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {show.slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === at ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} />)}
      </div>
    </div>
  );
}

/**
 * Plays the campaign's slideshows as they will post: pick a slideshow (one per hook) at the top, swipe its slides.
 * Before "Make" (or after a change) it shows the draft drawn in the browser, with a note and the Make button.
 */
export function CampaignPreview({ shows, rendered, startShow = 0, onClose, makeButton }: Props) {
  const [showAt, setShowAt] = useState(Math.min(startShow, shows.length - 1));
  const show = shows[showAt]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Preview" className="fixed inset-0 z-[110] flex flex-col bg-zinc-950/95 text-white backdrop-blur-sm">
      <header className="flex min-h-14 shrink-0 items-center gap-2 px-3 pt-[env(safe-area-inset-top)]">
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">Preview</h2>
        <button type="button" onClick={onClose} aria-label="Close preview" className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10">✕</button>
      </header>
      {shows.length > 1 && (
        <div role="tablist" aria-label="Slideshows" className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {shows.map((s, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === showAt} onClick={() => setShowAt(i)} className={`min-h-10 max-w-60 shrink-0 truncate rounded-full px-4 text-sm font-medium transition active:scale-95 ${i === showAt ? 'bg-white text-zinc-950' : 'border border-white/15 text-white/70'}`}>
              {i + 1}. {s.hook || 'Hook'}
            </button>
          ))}
        </div>
      )}
      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <SlidePlayer key={showAt} show={show} />
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {rendered ? <p className="text-sm text-white/50">As it will post</p> : (
          <>
            <p className="text-sm text-white/60">Draft preview. Make the slideshows to see the final render.</p>
            {makeButton}
          </>
        )}
      </footer>
    </div>,
    document.body,
  );
}
