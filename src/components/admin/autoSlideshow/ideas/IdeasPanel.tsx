'use client';

import { useState, type ReactNode } from 'react';
import { IDEAS_PER_BATCH, REQUESTED_SLIDESHOWS, type IdeaDto } from '../../../../types/admin/calendarIdeas';
import { RotatingLine } from '../../shared/RotatingLine';
import { MakingCountdown } from '../calendar/MakingCountdown';
import { FormatChips } from './FormatChips';
import { IdeasEmpty, useMoreIdeas } from './IdeasEmpty';
import { KeptIdeas } from './KeptIdeas';
import { LiveDeck } from './LiveDeck';
import { MakeStatus } from './MakeStatus';
import { PostDateTitle } from './PostDateTitle';
import type { IdeasState } from './useIdeas';
import type { KeptIdea } from './useMakeIdeas';

export type Make = { making: boolean; errors: Record<string, string>; make: (kept: KeptIdea[], prepare?: () => Promise<boolean>) => Promise<void> };
/** `placeOf`: where a kept idea goes when its own day is already filled (empty days first). */
type Placer = (idea: IdeaDto) => string | undefined;
type Props = { ideas: IdeasState; maker: Make; placeOf?: Placer };

const WRITING_LINES = [
  'Reading what your customers care about…',
  'Writing first lines that stop the scroll…',
  'Picking photos and clips for each idea…',
  'Getting them ready to swipe…',
];

const SLIDESHOW_LINES = [
  'Picking formats that already get views…',
  'Writing each slide…',
  'Making the photos…',
  'Getting them ready to swipe…',
];

/** Writing a batch of ideas takes about a minute and a half at most (stories come from the bank; AI images and caption
 *  fitting finish after the deck shows). */
const TYPICAL_IDEAS_MS = 90_000;

const deckBox = 'relative mx-auto aspect-[9/16] w-[min(calc(100vw-5rem),calc((100dvh-13.5rem)*0.5625))] rounded-[26px] bg-app-sunken lg:w-auto lg:max-w-full lg:h-[min(853px,calc(100dvh-20rem))]';

/**
 * The title, "3 / 14" for the filter, a progress bar, and the All · Blitz · Slideshow chips. Compact on phones; while the
 * deck shows there, the title is the day the idea will be posted and the chips move into its ⋯ menu.
 */
type HeaderProps = { ideas: IdeasState; placeOf: Placer; onPickDate: (idea: IdeaDto, at: string) => void };

function Header({ ideas, placeOf, onPickDate }: HeaderProps) {
  const total = ideas.deck.length + ideas.kept.length + ideas.skipped.length;
  const decided = ideas.kept.length + ideas.skipped.length;
  const shown = ideas.loading ? null : ideas.current;
  return (
    <div className="space-y-1.5 lg:space-y-3">
      <header className="flex items-baseline gap-3">
        <h1 className="min-w-0 flex-1 font-heading text-xl leading-tight font-normal text-app-ink lg:text-3xl">
          {shown ? (
            <>
              <span className="lg:hidden">
                <PostDateTitle idea={shown} at={placeOf(shown) ?? shown.plannedAt} onChange={(at) => onPickDate(shown, at)} />
              </span>
              <span className="max-lg:hidden">Your next 2 weeks</span>
            </>
          ) : 'Your next 2 weeks'}
        </h1>
        {total > 0 && <span className="text-[13px] font-medium text-app-muted tabular-nums">{Math.min(decided + 1, total)} / {total}</span>}
      </header>
      {total > 0 && (
        <div className="h-0.5 overflow-hidden rounded-full bg-app-sunken lg:h-1" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={decided} aria-label="Ideas looked at">
          <div className="h-full rounded-full bg-app-accent transition-[width] duration-300" style={{ width: `${(decided / total) * 100}%` }} />
        </div>
      )}
      <FormatChips ideas={ideas} className={shown ? 'hidden lg:flex' : ''} />
    </div>
  );
}

/** The empty card while ideas are written: the slide animation and a countdown, so the wait never looks stuck. */
function Writing({ since, lines, note }: { since: string | null; lines: string[]; note: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Writing your ideas">
      <div className={`${deckBox} ${since ? '' : 'animate-pulse'}`}>
        {since && <MakingCountdown since={since} totalMs={TYPICAL_IDEAS_MS} label="Writing your ideas" />}
      </div>
      <RotatingLine lines={lines} />
      <p className="text-center text-xs text-app-muted">{note}</p>
    </div>
  );
}

/** "Get more" once every idea of the filter was looked at: a Blitz batch, or slideshows (asked first). */
function Kept({ ideas, maker }: { ideas: IdeasState; maker: Make }) {
  const more = useMoreIdeas(ideas);
  const slides = ideas.filter === 'slideshow';
  return (
    <>
      <KeptIdeas
        kept={ideas.kept}
        skipped={ideas.skipped.length}
        errors={maker.errors}
        generating={!slides && ideas.generating}
        onReviewSkipped={ideas.reviewSkipped}
        onMore={slides ? more.slideshows : more.blitz}
        moreLabel={slides ? `Get ${REQUESTED_SLIDESHOWS} slideshow ideas` : `Get ${IDEAS_PER_BATCH} more Blitz ideas (free)`}
      />
      {more.dialog}
    </>
  );
}

/** What the page shows for the filter: writing, empty (get more), the deck, or the kept list once all were looked at. */
function Body({ ideas, maker, placeOf }: Props): ReactNode {
  if (ideas.loading) return <div className={`${deckBox} animate-pulse`} />;
  const writingBlitz = ideas.generating && ideas.filter !== 'slideshow';
  if (ideas.deck.length === 0 && writingBlitz) {
    return <Writing since={ideas.generatingSince} lines={WRITING_LINES} note="This takes about 90 seconds. You can keep using the calendar." />;
  }
  if (ideas.deck.length === 0 && ideas.making.length > 0 && ideas.filter === 'slideshow') {
    return <Writing since={null} lines={SLIDESHOW_LINES} note="Your slideshows join the deck in about 2 minutes." />;
  }
  const total = ideas.deck.length + ideas.making.length + ideas.kept.length + ideas.skipped.length;
  if (total === 0) return <IdeasEmpty ideas={ideas} />;
  const current = ideas.current;
  if (!current) return <Kept ideas={ideas} maker={maker} />;
  const next = ideas.deck.find((i) => i.id !== current.id) ?? null;
  return <LiveDeck ideas={ideas} maker={maker} idea={current} next={next} placeOf={placeOf} size="page" />;
}

/**
 * The Ideas page: swipe through free ideas (All, or only Blitz or only slideshows); each one kept is made and goes on
 * its day. When a filter runs out, its own "Get more" starts that format's generation.
 */
export function IdeasPanel({ ideas, maker, placeOf }: Props) {
  const making = ideas.making.length;
  // Dates picked from the title's pen (phones): shown there and used when the idea is kept.
  const [picked, setPicked] = useState<Record<string, string>>({});
  const placeWith: Placer = (idea) => picked[idea.id] ?? placeOf?.(idea);
  const pickDate = (idea: IdeaDto, at: string) => setPicked((p) => ({ ...p, [idea.id]: at }));
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-2 lg:gap-4">
      <Header ideas={ideas} placeOf={placeWith} onPickDate={pickDate} />
      {making > 0 && ideas.deck.length > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-app-sunken px-3 py-2 text-xs text-app-muted">
          <span aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-app-line border-t-app-accent" />
          Making {making === 1 ? 'a photo slideshow' : `${making} photo slideshows`} for you. {making === 1 ? 'It joins' : 'They join'} the ideas in 1 to 2 minutes.
        </p>
      )}
      {ideas.error && ideas.deck.length + ideas.kept.length > 0 && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{ideas.error}</p>}
      <Body ideas={ideas} maker={maker} placeOf={placeWith} />
      <MakeStatus kept={ideas.kept} maker={maker} />
    </div>
  );
}
