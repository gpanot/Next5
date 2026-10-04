'use client';

/**
 * "Website to post" story on the /slideshow home. On large screens a phone stays
 * pinned (CSS sticky) while 5 steps scroll past; each step shows the matching
 * slide of a real Auto Slideshow output. Phones get each slide inline instead.
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

/** Plain words, only claims the FAQ backs up. */
const STEPS = [
  { title: 'You paste your website.', body: 'We read it to learn what you sell and who buys it.' },
  { title: 'We pick a format that already gets views.', body: 'Only formats from our approved list. No guessing.' },
  { title: 'We make the slides.', body: 'Photos and text on every slide. 5 to 9 slides a post.' },
  { title: 'We write the caption.', body: 'A hook, a caption and hashtags, ready to go.' },
  { title: 'You say yes. We post it.', body: 'Nothing goes live until you approve it.' },
];

const slideSrc = (i: number) => `/images/auto-slideshow/${STORY_SLUG}/${i + 1}.jpg`;

function StoryPhone({ active }: { active: number }) {
  return (
    <div className="sticky top-28 mx-auto w-[260px] rounded-[2.25rem] bg-ink p-2.5 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.55)] dark:bg-zinc-100">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-zinc-100 dark:bg-zinc-800">
        {STEPS.map((step, i) => (
          <FittedImage key={step.title} src={slideSrc(i)} alt={i === 0 ? STORY_ALT : ''} sizes="260px"
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
        <FittedImage src={slideSrc(index)} alt="" sizes="(min-width: 640px) 160px, 128px" />
      </div>
      <div className={`min-w-0 motion-safe:transition-opacity motion-safe:duration-500 ${active ? 'lg:opacity-100' : 'lg:opacity-30'}`}>
        <span className="text-sm font-semibold text-blue-600 tabular-nums dark:text-blue-400">Step {index + 1} of {STEPS.length}</span>
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
        <SplitWords text="From your website to a post in 5 steps." />
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
