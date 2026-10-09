'use client';

import type { IdeaFilter, IdeasState } from './useIdeas';

export const FORMAT_CHIPS: { id: IdeaFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'blitz', label: 'Blitz' },
  { id: 'slideshow', label: 'Slideshow' },
];

const chipClass = (active: boolean) =>
  [
    'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition active:scale-95',
    active ? 'bg-app-cta text-app-cta-ink shadow-sm' : 'border border-app-line bg-app-panel text-app-muted hover:text-app-ink',
  ].join(' ');

/** All · Blitz · Slideshow, each with the ideas left to swipe. Picks which ideas the deck shows. */
export function FormatChips({ ideas, className = '' }: { ideas: IdeasState; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Show ideas" className={`-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 ${className}`}>
      {FORMAT_CHIPS.map((c) => (
        <button key={c.id} type="button" role="radio" aria-checked={ideas.filter === c.id} onClick={() => ideas.setFilter(c.id)} className={chipClass(ideas.filter === c.id)}>
          {c.label}
          <span className="tabular-nums opacity-70">{ideas.counts[c.id]}</span>
        </button>
      ))}
    </div>
  );
}
