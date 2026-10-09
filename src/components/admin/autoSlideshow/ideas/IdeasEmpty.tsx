'use client';

import { Images, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { IDEAS_PER_BATCH, REQUESTED_SLIDESHOWS } from '../../../../types/admin/calendarIdeas';
import { CreateDialog } from './DeckMenu';
import type { IdeasState } from './useIdeas';

const primary = 'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95 disabled:opacity-40';
const secondary = 'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-app-line bg-app-panel px-5 text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95 disabled:opacity-40';

const COPY = {
  all: `No ideas left to swipe. Get new ones: each one you keep fills your next empty day.`,
  blitz: `No Blitz ideas left. Get ${IDEAS_PER_BATCH} new ones, free to look at.`,
  slideshow: `No slideshow ideas left. Get ${REQUESTED_SLIDESHOWS} new photo slideshows, ready in about 2 minutes.`,
};

/** The two ways to get more ideas: a free Blitz batch, or slideshows (keeping one uses a credit, so it asks first). */
export function useMoreIdeas(ideas: IdeasState) {
  const [asking, setAsking] = useState(false);
  const blitz = () => void ideas.generate();
  const slideshows = () => setAsking(true);
  const dialog = asking ? <CreateDialog onCreate={ideas.createSlideshows} onClose={() => setAsking(false)} /> : null;
  return { blitz, slideshows, dialog };
}

/** Nothing left to swipe in this filter: the button that fills it again (both, on All). */
export function IdeasEmpty({ ideas }: { ideas: IdeasState }) {
  const more = useMoreIdeas(ideas);
  const { filter } = ideas;
  const blitzButton = (
    <button type="button" onClick={more.blitz} disabled={ideas.generating} className={filter === 'all' ? secondary : primary}>
      <Sparkles aria-hidden className="h-4 w-4" /> {ideas.error && filter !== 'slideshow' ? 'Try again' : `Get ${IDEAS_PER_BATCH} Blitz ideas`}
    </button>
  );
  const slideButton = (
    <button type="button" onClick={more.slideshows} className={primary}>
      <Images aria-hidden className="h-4 w-4" /> Get {REQUESTED_SLIDESHOWS} slideshow ideas
    </button>
  );
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="max-w-[34ch] text-sm leading-relaxed text-app-muted">{COPY[filter]}</p>
      {ideas.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{ideas.error}</p>}
      <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
        {filter !== 'slideshow' && blitzButton}
        {filter !== 'blitz' && slideButton}
      </div>
      {more.dialog}
    </div>
  );
}
