'use client';

import { Sparkles, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IDEAS_PER_BATCH, type IdeaDto } from '../../../../types/admin/calendarIdeas';
import { RotatingLine } from '../../shared/RotatingLine';
import { MakingCountdown } from '../calendar/MakingCountdown';
import { KeptIdeas } from './KeptIdeas';
import { LiveDeck } from './LiveDeck';
import { MakeStatus } from './MakeStatus';
import type { IdeasState } from './useIdeas';

export type Make = { making: boolean; errors: Record<string, string>; make: (kept: IdeaDto[], prepare?: () => Promise<boolean>) => Promise<void> };
/** `placeOf`: where a kept idea goes when its own day is already filled (empty days first). */
type Placer = (idea: IdeaDto) => string | undefined;
type Props = { ideas: IdeasState; maker: Make; onClose: () => void; placeOf?: Placer };

const WRITING_LINES = [
  'Reading what your customers care about…',
  'Writing first lines that stop the scroll…',
  'Picking photos and clips for each idea…',
  'Getting them ready to swipe…',
];

/** Writing a batch of ideas usually takes about three and a half minutes (14 stories, footage and images). */
const TYPICAL_IDEAS_MS = 210_000;

/** As in the canvas: ✕ (back to the start card), the title, "3 / 14", and a progress bar. */
function Header({ ideas, onClose }: { ideas: IdeasState; onClose: () => void }) {
  const total = ideas.deck.length + ideas.kept.length + ideas.skipped.length;
  const decided = ideas.kept.length + ideas.skipped.length;
  return (
    <div className="space-y-2 lg:space-y-3">
      <header className="flex items-center gap-1.5">
        <button type="button" onClick={onClose} aria-label="Close ideas" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
          <X aria-hidden className="h-5 w-5" strokeWidth={2.4} />
        </button>
        <h2 className="min-w-0 flex-1 font-heading text-xl font-normal text-ink dark:text-zinc-100">Your next 2 weeks</h2>
        {total > 0 && <span className="text-[13px] font-bold text-zinc-600 tabular-nums dark:text-zinc-400">{Math.min(decided + 1, total)} / {total}</span>}
      </header>
      {total > 0 && (
        <div className="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={decided} aria-label="Ideas looked at">
          <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${(decided / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

/** The empty card while ideas are written: the slide animation and a 2:00 countdown, so the wait never looks stuck. */
function Writing({ since }: { since: string | null }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Writing your ideas">
      <div className={`relative mx-auto aspect-[9/16] h-[min(680px,calc(100dvh-13rem))] max-w-full rounded-[26px] bg-zinc-100 lg:h-[min(560px,calc(100dvh-28rem))] dark:bg-zinc-800 ${since ? '' : 'animate-pulse'}`}>
        {since && <MakingCountdown since={since} totalMs={TYPICAL_IDEAS_MS} label="Writing your ideas" />}
      </div>
      <RotatingLine lines={WRITING_LINES} />
      <p className="text-center text-xs text-muted">This takes 1 to 3 minutes. You can keep using the calendar.</p>
    </div>
  );
}

function Empty({ onGenerate, error }: { onGenerate: () => void; error: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"><Sparkles aria-hidden className="h-6 w-6" /></span>
      <p className="max-w-[30ch] text-sm text-muted">Get {IDEAS_PER_BATCH} post ideas. Each one you keep fills your next empty day. Skip the rest.</p>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={onGenerate} className="min-h-12 rounded-full bg-app-cta px-6 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95">
        {error ? 'Try again' : `Get my ${IDEAS_PER_BATCH} ideas`}
      </button>
    </div>
  );
}

/** What the panel shows: writing, empty, the deck, or the kept list once every idea was looked at. */
function Body({ ideas, maker, placeOf }: { ideas: IdeasState; maker: Make; placeOf?: Placer }): ReactNode {
  if (ideas.loading) return <div className="mx-auto aspect-[9/16] h-[min(680px,calc(100dvh-13rem))] max-w-full animate-pulse rounded-[26px] bg-zinc-100 lg:h-[min(560px,calc(100dvh-28rem))] dark:bg-zinc-800" />;
  if (ideas.generating && ideas.deck.length === 0) return <Writing since={ideas.generatingSince} />;
  const total = ideas.deck.length + ideas.making.length + ideas.kept.length + ideas.skipped.length;
  if (total === 0) return <Empty onGenerate={() => void ideas.generate()} error={ideas.error} />;
  const current = ideas.current;
  if (!current) return <KeptIdeas kept={ideas.kept} skipped={ideas.skipped.length} errors={maker.errors} generating={ideas.generating} onReviewSkipped={ideas.reviewSkipped} onMore={() => void ideas.generate()} />;
  const next = ideas.deck.find((i) => i.id !== current.id) ?? null;
  return <LiveDeck ideas={ideas} maker={maker} idea={current} next={next} placeOf={placeOf} />;
}

/**
 * The ideas panel beside the calendar (a full-screen sheet on phones): swipe through free ideas, then "Make N" puts the
 * kept ones on their days. Videos and photo slideshows mix as set in Settings › Content.
 */
export function IdeasPanel({ ideas, maker, onClose, placeOf }: Props) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-white px-4 pt-[max(0.25rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:gap-4 lg:p-4 dark:bg-zinc-900">
      <Header ideas={ideas} onClose={onClose} />
      {ideas.making.length > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-muted dark:bg-zinc-950">
          <span aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
          Making {ideas.making.length === 1 ? 'a photo slideshow' : `${ideas.making.length} photo slideshows`} for you. {ideas.making.length === 1 ? 'It joins' : 'They join'} the ideas in 1 to 2 minutes.
        </p>
      )}
      {ideas.error && ideas.deck.length + ideas.kept.length > 0 && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{ideas.error}</p>}
      <div className="flex-1"><Body ideas={ideas} maker={maker} placeOf={placeOf} /></div>
      <MakeStatus kept={ideas.kept} maker={maker} />
    </div>
  );
}
