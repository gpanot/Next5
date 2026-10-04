'use client';

/** Floating example slideshows around the Auto Slideshow start screen (side decks on wide screens, swipe strip below). */
import { useEffect, useRef, useState } from 'react';
import { FittedImage } from '../shared/FittedImage';
import { useAutoScroll } from './useAutoScroll';

type Stat = 'views' | 'likes' | 'saves' | 'comments';

/** Real Auto Slideshow outputs (latest runs), copied from the object store into public/. Slide text is baked into each image. */
/** Two of the four KPIs per card, mixed across cards so the row doesn't read like a table. */
/** `video` cards play one looping clip from public/videos instead of cycling slide images. */
type ShowcaseSlideshow = { slug: string; alt: string; slides: number; stats: Partial<Record<Stat, string>>; video?: string };

const SLIDES_PER_SHOW = 5;
/** Seconds per slide, like a TikTok carousel on auto-advance. */
const SLIDE_MS = 2_500;

const SHOWCASE: ShowcaseSlideshow[] = [
  { slug: 'pantry-gaps', alt: '3 ways to avoid empty gaps (without double-buying)', slides: SLIDES_PER_SHOW, stats: { views: '412K', saves: '9.4K' } },
  { slug: 'booking-ugc', alt: 'UGC video about online booking', slides: 1, stats: { views: '97K', likes: '6.8K' }, video: '/videos/perfect-ads/booking-ugc.mp4' },
  { slug: 'porsche-calmer', alt: 'Last visit: overloaded. This year: calmer decisions and smoother drives.', slides: SLIDES_PER_SHOW, stats: { likes: '14.2K', comments: '284' } },
  { slug: 'r1', alt: 'UGC video: 24 hours a day', slides: 1, stats: { saves: '31K', comments: '1.8K' }, video: '/videos/perfect-ads/r1.mp4' },
  { slug: 'meal-planning', alt: 'Hot take: a long list is not the problem. Planning is.', slides: SLIDES_PER_SHOW, stats: { likes: '9.9K', saves: '4.2K' } },
  { slug: 'reminders-ugc', alt: 'UGC video about appointment reminders', slides: 1, stats: { views: '254K', comments: '395' }, video: '/videos/perfect-ads/reminders-ugc.mp4' },
];

/** Absolute slots for the wide-screen side decks: 3 cards per side, anchored to the page center so they hug the hero. */
/** Top cards clear the one-line headline (~1065px wide, plus tilt); lower cards keep ~70px off the 672px form and FAQ. */
/** Cards are ~400px tall; 27rem steps keep them apart even when tilted. */
const LEFT_SLOTS = ['right-[calc(50%+36rem)] top-4', 'right-[calc(50%+26.5rem)] top-[27rem]', 'right-[calc(50%+28rem)] top-[54rem]'];
const RIGHT_SLOTS = ['left-[calc(50%+36rem)] top-0', 'left-[calc(50%+26.5rem)] top-[27rem]', 'left-[calc(50%+28rem)] top-[54rem]'];
const LEFT_TILTS = ['-rotate-6', 'rotate-3', '-rotate-3'];
const RIGHT_TILTS = ['rotate-6', '-rotate-3', 'rotate-3'];
/** Side deck cards are 10% wider than strip cards (192px). */
const DECK_CARD_WIDTH = 'w-[211px]';
/** Float delays so the six cards bob out of sync. */
const FLOAT_DELAYS_S = [0, 1.4, 2.6, 0.8, 2, 3.2];
/** Strip drift speed: slow enough to read the cards. */
const STRIP_PX_PER_SECOND = 24;
const STRIP_TILTS = ['-rotate-2', 'rotate-2', '-rotate-1', 'rotate-1'];

const ICON_PATHS: Record<Stat, string> = {
  views: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  likes: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  saves: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  comments: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z',
};

const STAT_LABELS: Record<Stat, string> = { views: 'Views', likes: 'Likes', saves: 'Saved', comments: 'Comments' };

function StatIcon({ stat }: { stat: Stat }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted">
      <path d={ICON_PATHS[stat]} />
    </svg>
  );
}

/** Cycles slides on a timer; `offset` staggers cards so they don't flip together. Off for reduced motion. */
function useAutoplay(count: number, offset: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setIndex((i) => (i + 1) % count);
      timer = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    }, SLIDE_MS + offset);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [count, offset]);
  return index;
}

/** Side decks keep the 9:16 phone frame; the strip uses the slides' own 4:5, so phones get bigger, readable slides with no blur bands. */
type CardFrame = 'phone' | 'post';
const FRAME_CLASS: Record<CardFrame, string> = { phone: 'aspect-[9/16]', post: 'aspect-[4/5]' };

/** Image slideshow: slides cross-fade on the autoplay index, with TikTok-style progress bars on top. */
function SlideStack({ show, index, sizes }: { show: ShowcaseSlideshow; index: number; sizes: string }) {
  return (
    <>
      {Array.from({ length: show.slides }, (_, i) => (
        <FittedImage
          key={i}
          src={`/images/auto-slideshow/${show.slug}/${i + 1}.jpg`}
          alt={i === 0 ? `TikTok slideshow: "${show.alt}"` : ''}
          sizes={sizes}
          className={`transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div aria-hidden className="absolute inset-x-2 top-2 flex gap-1">
        {Array.from({ length: show.slides }, (_, i) => (
          <span key={i} className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${i <= index ? 'bg-white' : 'bg-white/40'}`} />
        ))}
      </div>
    </>
  );
}

/** Video card: muted autoplay loop, like a TikTok in the feed. Reduced motion shows the first frame only. */
function ShowcaseVideo({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ref.current?.play().catch(() => {});
  }, []);
  return (
    <video
      ref={ref}
      src={`${src}#t=0.1`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={`TikTok video: ${alt}`}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

type CardProps = { show: ShowcaseSlideshow; order: number; className: string; frame?: CardFrame; sizes?: string };

function SlideshowCard({ show, order, className, frame = 'phone', sizes = '211px' }: CardProps) {
  const index = useAutoplay(show.slides, (order * 700) % SLIDE_MS);
  return (
    <figure className={`shrink-0 rounded-2xl border border-line bg-white p-2 shadow-sm transition duration-300 hover:z-10 hover:scale-105 hover:rotate-0 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      <div className={`relative ${FRAME_CLASS[frame]} overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800`}>
        {show.video ? <ShowcaseVideo src={show.video} alt={show.alt} /> : <SlideStack show={show} index={index} sizes={sizes} />}
      </div>
      <figcaption className="mt-2 flex items-center justify-center gap-3 text-xs sm:gap-2.5 sm:text-[11px] whitespace-nowrap text-muted dark:text-zinc-400">
        {(Object.keys(STAT_LABELS) as Stat[]).filter((stat) => show.stats[stat]).map((stat) => (
          <span key={stat} className="flex items-center gap-1" title={STAT_LABELS[stat]}>
            <StatIcon stat={stat} />
            <span className="sr-only sm:not-sr-only">{STAT_LABELS[stat]}</span>
            <b className="font-semibold text-ink dark:text-zinc-100">{show.stats[stat]}</b>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** One side-deck slot. Layers, outer to inner: slot position, GSAP intro (data-deck-card), CSS float, card tilt and hover. */
function DeckCard({ show, order, slot, tilt }: { show: ShowcaseSlideshow; order: number; slot: string; tilt: string }) {
  return (
    <div className={`pointer-events-auto absolute ${slot}`} data-deck-card="">
      <div className="animate-float" style={{ animationDelay: `-${FLOAT_DELAYS_S[order]}s` }}>
        <SlideshowCard show={show} order={order} className={`${DECK_CARD_WIDTH} ${tilt}`} />
      </div>
    </div>
  );
}

/** Wide screens only: cards float in the empty space on both sides of the hero. Each side is one pointer-depth layer (data-deck-side). */
export function SlideshowSideDecks() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-x-clip 2xl:block" data-decks="">
      <div className="absolute inset-0" data-deck-side="left">
        {SHOWCASE.slice(0, 3).map((show, i) => (
          <DeckCard key={show.slug} show={show} order={i} slot={LEFT_SLOTS[i]} tilt={LEFT_TILTS[i]} />
        ))}
      </div>
      <div className="absolute inset-0" data-deck-side="right">
        {SHOWCASE.slice(3, 6).map((show, i) => (
          <DeckCard key={show.slug} show={show} order={i + 3} slot={RIGHT_SLOTS[i]} tilt={RIGHT_TILTS[i]} />
        ))}
      </div>
    </div>
  );
}

/** Phones to laptops: one row that drifts sideways on its own and loops. Swipe pauses it. Cards are listed twice for the loop. */
export function SlideshowStrip() {
  const rowRef = useAutoScroll<HTMLDivElement>(STRIP_PX_PER_SECOND);
  const loop = [...SHOWCASE, ...SHOWCASE];
  return (
    <div className="-mx-4 mt-10 w-[calc(100%+2rem)] 2xl:hidden" data-intro="5" data-intro-lift="56">
      <div ref={rowRef} className="flex overflow-x-auto overscroll-x-contain px-6 pt-3 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loop.map((show, i) => (
          <div key={`${show.slug}-${i}`} aria-hidden={i >= SHOWCASE.length || undefined} className="shrink-0 pr-4">
            <SlideshowCard show={show} order={i} frame="post" sizes="(min-width: 640px) 240px, 224px" className={`w-56 sm:w-60 ${STRIP_TILTS[i % STRIP_TILTS.length]}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
