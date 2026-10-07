'use client';

/**
 * "Website to post" story on the Auto Slideshow home. On large screens a phone stays
 * pinned (CSS sticky) while 5 steps scroll past; each step shows a real output:
 * a slide of an Auto Slideshow post or a short video (compressed, public/videos/story).
 * Phones get each one inline instead.
 * The active step is plain state, so it also works with reduced motion.
 */
import { useEffect, useRef, useState } from 'react';
import { FittedImage } from '../../shared/FittedImage';
import { ScrollTrigger } from '../../../motion/gsap';
import { SplitWords } from '../../../motion/SplitWords';

/** On 2xl the section narrows to the gap between the floating side decks (inner edges sit ~26.5rem from center). */
/** Real output from the showcase (public/images/auto-slideshow, listed in the image manifest). */
const STORY_SLUG = 'slide-chapters';
const STORY_ALT = 'TikTok slideshow: "The clarity glow-up: your slideshow finally reads like chapters."';

/** Each step: a short name, a promise, then what it means for the business. */
const STEPS = [
  { name: 'Choose Your Outcome', title: 'What do you want more of?', body: 'Leads. Enquiries. Bookings. Sales. Or simply more people discovering your business.' },
  { name: 'Find Your Winning Angles', title: 'We find what already gets attention in your market.', body: 'We research proven content patterns, hooks and angles—so you’re not guessing what to post.' },
  { name: 'Build Your Content Machine', title: 'We turn winning ideas into content for YOUR business.', body: 'Your offers, products, services, location and audience become the raw material for content designed to get attention and drive action.' },
  { name: 'Fill Your Next 30 Days', title: 'Your content is created, organized and ready to publish.', body: 'No blank calendar. No wondering what to post tomorrow. Just a pipeline of content you can publish consistently.' },
  { name: 'Turn Attention Into Customers', title: 'We identify what actually works—and make more of it.', body: 'Double down on the posts that generate views, enquiries and customers. Stop wasting time on content that doesn’t move the business.' },
];

type StoryMedia = { kind: 'slide'; src: string } | { kind: 'video'; src: string; poster: string };

const slideSrc = (i: number) => `/images/auto-slideshow/${STORY_SLUG}/${i + 1}.jpg`;
const shortMedia = (n: number): StoryMedia => ({ kind: 'video', src: `/videos/story/short-${n}.mp4`, poster: `/videos/story/short-${n}.jpg` });

/** One output per step: shorts and slideshow slides, mixed. */
const MEDIA: StoryMedia[] = [
  shortMedia(1),
  { kind: 'slide', src: slideSrc(1) },
  shortMedia(2),
  { kind: 'slide', src: slideSrc(3) },
  { kind: 'slide', src: slideSrc(4) },
];

/** Muted looping clip. Plays only while `playing`, so off-screen steps cost nothing. */
function StoryVideo({ media, playing, className = '' }: { media: Extract<StoryMedia, { kind: 'video' }>; playing: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [playing]);
  return (
    <video ref={ref} src={media.src} poster={media.poster} muted loop playsInline preload="metadata" aria-hidden
      className={`absolute inset-0 h-full w-full object-cover ${className}`} />
  );
}

function StoryMediaView({ media, alt, sizes, playing, className = '' }: { media: StoryMedia; alt: string; sizes: string; playing: boolean; className?: string }) {
  return media.kind === 'video'
    ? <StoryVideo media={media} playing={playing} className={className} />
    : <FittedImage src={media.src} alt={alt} sizes={sizes} className={className} />;
}

function StoryPhone({ active }: { active: number }) {
  return (
    <div className="sticky top-28 mx-auto w-[260px] rounded-[2.25rem] bg-ink p-2.5 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.55)] dark:bg-zinc-100">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-zinc-100 dark:bg-zinc-800">
        {STEPS.map((step, i) => (
          <StoryMediaView key={step.title} media={MEDIA[i]} alt={i === 1 ? STORY_ALT : ''} sizes="260px" playing={i === active}
            className={`motion-safe:transition-opacity motion-safe:duration-500 ${i === active ? 'opacity-100' : 'opacity-0'}`} />
        ))}
        <div aria-hidden className="absolute inset-x-3 top-3 flex gap-1">
          {STEPS.map((step, i) => (
            <span key={step.title} className={`h-0.5 flex-1 rounded-full motion-safe:transition-colors ${i <= active ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryStep({ index, active }: { index: number; active: boolean }) {
  const step = STEPS[index];
  return (
    <li data-story-step="" className="flex items-center gap-4 sm:gap-6 lg:min-h-[48vh]">
      <div className="relative aspect-[4/5] w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-100 shadow-sm sm:w-40 lg:hidden dark:bg-zinc-800">
        <StoryMediaView media={MEDIA[index]} alt="" sizes="(min-width: 640px) 160px, 128px" playing={active} />
      </div>
      <div className={`min-w-0 motion-safe:transition-opacity motion-safe:duration-500 ${active ? 'lg:opacity-100' : 'lg:opacity-30'}`}>
        <span className="text-sm font-semibold text-blue-600 tabular-nums dark:text-blue-400">{String(index + 1).padStart(2, '0')} — {step.name}</span>
        <h3 className="mt-1 text-xl leading-tight font-extrabold sm:text-2xl tracking-tight text-balance text-ink md:text-4xl dark:text-zinc-100">{step.title}</h3>
        <p className="mt-1.5 max-w-md text-[15px] leading-snug sm:mt-2 sm:text-base sm:leading-relaxed text-muted md:text-lg dark:text-zinc-400">{step.body}</p>
      </div>
    </li>
  );
}

/** Tracks which step sits in the middle of the viewport. */
function useActiveStep(listRef: React.RefObject<HTMLOListElement | null>) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const steps = listRef.current?.querySelectorAll<HTMLElement>('[data-story-step]');
    if (!steps) return;
    const triggers = Array.from(steps).map((el, i) =>
      ScrollTrigger.create({ trigger: el, start: 'top center', end: 'bottom center', onToggle: (self) => self.isActive && setActive(i) }),
    );
    return () => triggers.forEach((t) => t.kill());
  }, [listRef]);
  return active;
}

export function HomeStory() {
  const listRef = useRef<HTMLOListElement>(null);
  const active = useActiveStep(listRef);
  return (
    <section aria-labelledby="slideshow-story" className="relative mx-auto w-full max-w-5xl px-1 pt-10 pb-8 text-left md:pt-16 lg:pt-24 2xl:max-w-[50rem]">
      <h2 id="slideshow-story" data-split="" className="mx-auto max-w-2xl text-center text-3xl font-extrabold tracking-tight text-balance text-ink md:text-5xl dark:text-zinc-100">
        <SplitWords text="Get 30 Days of Content Built to Grow Your Business" />
      </h2>
      <div className="mt-8 grid gap-10 md:mt-14 lg:grid-cols-[260px_1fr] lg:gap-16 2xl:gap-10">
        <div className="hidden lg:block"><StoryPhone active={active} /></div>
        <ol ref={listRef} className="flex flex-col gap-6 sm:gap-8 lg:gap-0 lg:pb-[12vh]">
          {STEPS.map((step, i) => <StoryStep key={step.title} index={i} active={i === active} />)}
        </ol>
      </div>
    </section>
  );
}
