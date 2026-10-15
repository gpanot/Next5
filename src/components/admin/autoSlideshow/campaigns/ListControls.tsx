'use client';

import { createLocalStore } from '../../../../lib/localStore';

/** "all": everything, newest first. "calendar": only what the Calendar shows. */
export type ListFilter = 'all' | 'calendar';

/** Cards: 9:16 covers in a grid. List: one row each, denser. */
export type ListView = 'cards' | 'list';

const FILTERS: { id: ListFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'calendar', label: 'On calendar' },
];

/** The picked view, kept for this browser so Campaigns and the Library open the way they were left. */
const viewStore = createLocalStore('next5-campaigns-view');

export const useListView = (): [ListView, (view: ListView) => void] => {
  const stored = viewStore.useValue();
  return [stored === 'list' ? 'list' : 'cards', (view) => viewStore.set(view)];
};

/** The filter as a native select, so phones get their own picker. */
export function FilterSelect({ value, onChange }: { value: ListFilter; onChange: (f: ListFilter) => void }) {
  return (
    <div className="relative shrink-0">
      <select
        aria-label="Filter"
        value={value}
        onChange={(e) => onChange(e.target.value as ListFilter)}
        className="min-h-10 cursor-pointer appearance-none rounded-full border border-app-line bg-app-panel py-1.5 pr-9 pl-4 text-sm font-medium text-app-ink shadow-sm transition hover:border-app-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-app-cta"
      >
        {FILTERS.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-app-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

const viewButton = (on: boolean) =>
  `flex h-9 w-10 items-center justify-center rounded-full transition active:scale-95 ${on ? 'bg-app-cta text-app-cta-ink shadow-sm' : 'text-app-muted hover:text-app-ink'}`;

/** Cards or list, as two icon buttons. */
export function ViewToggle({ value, onChange }: { value: ListView; onChange: (v: ListView) => void }) {
  return (
    <div role="radiogroup" aria-label="View" className="flex shrink-0 rounded-full border border-app-line bg-app-panel p-0.5 shadow-sm">
      <button type="button" role="radio" aria-checked={value === 'cards'} aria-label="Cards" title="Cards" onClick={() => onChange('cards')} className={viewButton(value === 'cards')}>
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="9" rx="1.5" /><rect x="3" y="15" width="7" height="6" rx="1.5" /><rect x="14" y="15" width="7" height="6" rx="1.5" />
        </svg>
      </button>
      <button type="button" role="radio" aria-checked={value === 'list'} aria-label="List" title="List" onClick={() => onChange('list')} className={viewButton(value === 'list')}>
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
        </svg>
      </button>
    </div>
  );
}
