'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

type Person = {
  name: string;
  cards: { front: string; back: string }[];
};

const people: Person[] = [
  {
    name: 'Lily',
    cards: [
      { front: '/images/results-gallery/lily1.jpeg', back: '/images/results-gallery/lily2.jpeg' },
      { front: '/images/results-gallery/lily3.jpeg', back: '/images/results-gallery/lily4.jpeg' },
      { front: '/images/results-gallery/lily5.jpeg', back: '/images/results-gallery/lily6.jpeg' },
      { front: '/images/results-gallery/lily7.jpeg', back: '/images/results-gallery/lily1.jpeg' },
    ],
  },
  {
    name: 'Sandra',
    cards: [
      { front: '/images/results-gallery/sandra1.jpeg', back: '/images/results-gallery/sandra2.jpeg' },
      { front: '/images/results-gallery/sandra3.jpeg', back: '/images/results-gallery/sandra4.jpeg' },
      { front: '/images/results-gallery/sandra1.jpeg', back: '/images/results-gallery/sandra3.jpeg' },
      { front: '/images/results-gallery/sandra2.jpeg', back: '/images/results-gallery/sandra4.jpeg' },
    ],
  },
];

/** Flat list of every photo path for the lightbox. */
const allPhotos = people.flatMap((p) =>
  p.cards.flatMap((c) => [c.front, c.back]),
);

/* ------------------------------------------------------------------ */
/*  Card                                                                */
/* ------------------------------------------------------------------ */

type CardProps = {
  front: string;
  back: string;
  name: string;
  /** Index of the front photo in the global allPhotos flat list */
  globalFrontIndex: number;
  onOpen: (index: number) => void;
};

const FLIP_INTERVAL_MS = 7_000;

function GalleryCard({ front, back, name, globalFrontIndex, onOpen }: CardProps) {
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState<'flip' | 'unflip' | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFlip = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setAnimating('flip');
      setTimeout(() => {
        setFlipped(true);
        setAnimating(null);
        timerRef.current = setTimeout(() => {
          setAnimating('unflip');
          setTimeout(() => {
            setFlipped(false);
            setAnimating(null);
            scheduleFlip();
          }, 700);
        }, FLIP_INTERVAL_MS);
      }, 700);
    }, FLIP_INTERVAL_MS);
  }, []);

  useEffect(() => {
    scheduleFlip();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleFlip]);

  const innerClass =
    animating === 'flip'
      ? 'animate-flip'
      : animating === 'unflip'
        ? 'animate-unflip'
        : flipped
          ? 'rotate-y-180'
          : '';

  const visiblePhoto = flipped ? back : front;
  const visibleIndex = flipped ? globalFrontIndex + 1 : globalFrontIndex;

  return (
    <div
      className="perspective-800 relative w-[182px] shrink-0 cursor-pointer sm:w-[180px]"
      style={{ aspectRatio: '2/3' }}
      onClick={() => onOpen(visibleIndex)}
    >
      {/* Polaroid outer frame */}
      <div className="absolute inset-0 rounded-[4px] bg-white p-[6px] pb-7 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.45)] transition-transform duration-300 active:scale-[0.97] hover:-translate-y-1 hover:shadow-[0_14px_40px_-8px_rgb(0_0_0/0.55)] sm:p-[7px] sm:pb-8">
        {/* Flip inner */}
        <div
          className={`preserve-3d relative h-full w-full transition-transform duration-700 ${innerClass}`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front face */}
          <div
            className="backface-hidden absolute inset-0 overflow-hidden rounded-[2px]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={front} alt={`${name} result`} className="h-full w-full object-cover" />
          </div>

          {/* Back face */}
          <div
            className="backface-hidden absolute inset-0 overflow-hidden rounded-[2px]"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={back} alt={`${name} result`} className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Name label at the bottom of the polaroid */}
        <p className="absolute bottom-0 left-0 right-0 pb-1 text-center font-serif text-[9px] tracking-widest text-muted sm:pb-1.5 sm:text-[10px]">
          {name}
        </p>
      </div>

      {/* Watermark overlay (visible on hover) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 right-2 select-none font-serif text-[9px] tracking-[0.22em] text-white/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [text-shadow:0_1px_4px_rgb(0_0_0/0.55)]"
      >
        NEXT5
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lightbox                                                            */
/* ------------------------------------------------------------------ */

type LightboxProps = {
  photos: string[];
  index: number;
  onClose: () => void;
  onNav: (index: number) => void;
};

function Lightbox({ photos, index, onClose, onNav }: LightboxProps) {
  const touchStartX = useRef<number | null>(null);

  /* Keyboard navigation */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNav((index - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') onNav((index + 1) % photos.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, onClose, onNav, photos.length]);

  /* Lock body scroll while open */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Touch swipe handlers */
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return; // too small — treat as tap
    if (dx < 0) onNav((index + 1) % photos.length);
    else onNav((index - 1 + photos.length) % photos.length);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-fade-in"
      /* Safe-area aware padding via CSS env() — works on iPhone notch + Android gesture bar */
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Top bar: close + counter ── */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <span className="font-sans text-[11px] tracking-widest text-white/50">
          {index + 1} / {photos.length}
        </span>
        <button
          aria-label="Close"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors active:bg-white/25 hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Image (fills remaining height) ── */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2"
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photos[index]}
          src={photos[index]}
          alt="Full-screen result"
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-sm object-contain shadow-2xl animate-fade-in select-none"
          draggable={false}
        />

        {/* Watermark */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 right-4 select-none font-serif text-[12px] tracking-[0.22em] text-white/55 [text-shadow:0_1px_6px_rgb(0_0_0/0.7)]"
        >
          NEXT5
        </span>
      </div>

      {/* ── Bottom nav row: prev / next (finger-friendly 48 px targets) ── */}
      <div className="flex items-center justify-between px-6 py-4 sm:px-10">
        <button
          aria-label="Previous photo"
          onClick={() => onNav((index - 1 + photos.length) % photos.length)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors active:bg-white/30 hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Dot indicators (max 16 dots shown) */}
        <div className="flex gap-1.5 overflow-hidden">
          {photos.slice(0, 16).map((_, i) => (
            <button
              key={i}
              aria-label={`Go to photo ${i + 1}`}
              onClick={() => onNav(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>

        <button
          aria-label="Next photo"
          onClick={() => onNav((index + 1) % photos.length)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors active:bg-white/30 hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Marquee strip                                                       */
/* ------------------------------------------------------------------ */

type StripProps = {
  onOpen: (index: number) => void;
};

function MarqueeStrip({ onOpen }: StripProps) {
  // Build flat card list with global indices pointing at allPhotos
  let globalCursor = 0;
  const cards = people.flatMap((person) =>
    person.cards.map((card) => {
      const fi = globalCursor;
      globalCursor += 2; // front + back
      return { ...card, name: person.name, globalFrontIndex: fi };
    }),
  );

  // Duplicate the list for seamless looping
  const doubled = [...cards, ...cards];

  return (
    /* overflow-hidden hides the duplicate half; py-4 lets polaroid shadows breathe */
    <div className="gallery-strip overflow-hidden py-4">
      <div className="flex gap-4 sm:gap-5 animate-scroll-left" style={{ width: 'max-content' }}>
        {doubled.map((card, i) => (
          <GalleryCard
            key={`${card.front}-${i}`}
            front={card.front}
            back={card.back}
            name={card.name}
            globalFrontIndex={card.globalFrontIndex}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                             */
/* ------------------------------------------------------------------ */

export const ResultsGallery = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleOpen = useCallback((index: number) => setLightboxIndex(index), []);
  const handleClose = useCallback(() => setLightboxIndex(null), []);
  const handleNav = useCallback((index: number) => setLightboxIndex(index), []);

  return (
    <section className="bg-surface py-14 sm:py-20">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <p className="label-caps text-center text-[9.5px] font-medium text-accent-strong">
          Real results
        </p>
        <h2 className="mt-2 text-center font-serif text-[24px] text-ink sm:text-[30px]">
          This is what she got
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-[12.5px] text-muted">
          One selfie in, five studio-directed photos out — every look, every time.
        </p>
      </div>

      {/* Full-bleed marquee strip */}
      <div className="mt-10">
        <MarqueeStrip onOpen={handleOpen} />
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={allPhotos}
          index={lightboxIndex}
          onClose={handleClose}
          onNav={handleNav}
        />
      )}
    </section>
  );
};
