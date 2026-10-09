'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { money, PRICE_CENTS } from '../pricing/pricing';
import { IDEAS_PER_BATCH } from '../../../../types/admin/calendarIdeas';
import type { Make } from './IdeasPanel';
import { MakeStatus } from './MakeStatus';
import type { IdeasState } from './useIdeas';

type Props = { ideas: IdeasState; maker: Make; onOpen: () => void };

const box = 'flex flex-col gap-3.5 rounded-[20px] border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40';
const cta = 'flex min-h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-[15px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400';

/** The words and the button: write ideas, see them, or look at what was kept. */
function Pitch({ ideas, onOpen }: Omit<Props, 'maker'>) {
  const n = ideas.deck.length;
  if (ideas.generating && n === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <span aria-hidden className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" /> Writing your post ideas… 1 to 3 minutes.
      </p>
    );
  }
  if (n > 0) {
    return (
      <>
        <p className="text-[15px] leading-normal text-zinc-700 dark:text-zinc-300">{n} post {n === 1 ? 'idea' : 'ideas'} to swipe. Each one you keep goes on your next empty day. Skip the rest.</p>
        <button type="button" onClick={onOpen} className={`${cta} animate-nudge`}>{n === 1 ? 'Your next post idea' : `Your next ${n} post ideas`} <ArrowRight aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.5} /></button>
        <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">Free to look. {money(PRICE_CENTS)} for each idea you keep.</p>
      </>
    );
  }
  if (ideas.kept.length > 0) {
    return <button type="button" onClick={onOpen} className="min-h-11 rounded-full border border-blue-200 bg-white text-sm font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-95 dark:border-blue-900 dark:bg-zinc-900 dark:text-blue-300">See the {ideas.kept.length} ideas you kept</button>;
  }
  return (
    <>
      <p className="text-[15px] leading-normal text-zinc-700 dark:text-zinc-300">Get {IDEAS_PER_BATCH} post ideas to swipe. Each one you keep fills your next empty day. Skip the rest.</p>
      {ideas.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{ideas.error}</p>}
      <button type="button" onClick={() => void ideas.generate()} className={cta}><Sparkles aria-hidden className="h-4 w-4" /> Get my {IDEAS_PER_BATCH} ideas</button>
      <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">Free to look. {money(PRICE_CENTS)} for each idea you keep.</p>
    </>
  );
}

/** The right side before the deck is opened (and after ✕), as in the canvas's start card. */
export function IdeasStart({ ideas, maker, onOpen }: Props) {
  return (
    <section className={box}>
      <div>
        <p className="text-xs font-bold tracking-wide text-blue-700 uppercase dark:text-blue-300">What&apos;s next</p>
        <h2 className="mt-1 text-xl leading-tight font-extrabold text-ink dark:text-zinc-100">Your next 2 weeks</h2>
      </div>
      <Pitch ideas={ideas} onOpen={onOpen} />
      {ideas.making.length > 0 && <p className="text-xs text-zinc-600 dark:text-zinc-400">A photo slideshow is being made for you. It joins the ideas in 1 to 2 minutes.</p>}
      <MakeStatus kept={ideas.kept} maker={maker} />
    </section>
  );
}
