'use client';

import { Loader2, LocateFixed, MapPin, Plus, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { cityId, MAX_CITIES, placeCount, US_STATES, type MarketCity } from '../../../lib/marketPlaces';
import { CityInput } from './CityInput';
import { addCity, canSuggestMore, removeCity, type PlacesDraft } from './placesDraft';

type Props = {
  draft: PlacesDraft | null;
  busy: boolean;
  error: string | null;
  onChange: (d: PlacesDraft) => void;
  onLocate: () => void;
  onTypeBase: (city: MarketCity) => void;
  onMore: () => void;
};

const TEXT_BUTTON = 'inline-flex h-9 items-center gap-1.5 rounded-lg px-1 text-[14px] font-medium text-app-accent transition-colors duration-200 hover:text-app-ink disabled:opacity-40';

const PlaceChip = ({ label, sub, onRemove }: { label: string; sub?: string; onRemove: () => void }) => (
  <li className="flex h-10 items-center gap-1 rounded-full border border-app-line bg-app-sunken pl-3.5 pr-1 text-[14px] text-app-ink">
    <span className="truncate">{label}</span>
    {sub && <span className="text-[12px] text-app-muted">{sub}</span>}
    <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="flex h-8 w-8 items-center justify-center rounded-full text-app-muted transition-colors duration-200 hover:bg-app-panel hover:text-app-ink">
      <X aria-hidden className="h-4 w-4" />
    </button>
  </li>
);

const ChipsSkeleton = () => (
  <ul aria-hidden className="flex flex-wrap gap-2">
    {[96, 120, 88, 104].map((w) => <li key={w} style={{ width: w }} className="h-10 animate-pulse rounded-full bg-app-sunken" />)}
  </ul>
);

/** No city yet: share her location (one tap) or type it. */
const BaseAsk = ({ busy, onLocate, onTypeBase, onCancel }: Pick<Props, 'busy' | 'onLocate' | 'onTypeBase'> & { onCancel?: () => void }) => (
  <div className="flex flex-col gap-3">
    <button
      type="button"
      onClick={onLocate}
      disabled={busy}
      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 text-[14px] font-medium text-white transition-opacity duration-200 disabled:opacity-60"
    >
      {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <LocateFixed aria-hidden className="h-4 w-4" />} Use my location
    </button>
    <p className="text-center text-[12px] text-app-muted">or type your city</p>
    <CityInput label="Find cities near me" busy={busy} onSubmit={onTypeBase} onCancel={onCancel} />
  </div>
);

/** The places she keeps: one post each, every 2 days. */
const Places = ({ draft, busy, onChange, onMore }: Pick<Props, 'busy' | 'onChange' | 'onMore'> & { draft: PlacesDraft }) => {
  const [adding, setAdding] = useState(false);
  const baseState = draft.base?.state ?? draft.cities[0]?.state ?? null;
  return (
    <div className="flex flex-col gap-3">
      {busy && draft.cities.length === 0 ? (
        <ChipsSkeleton />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {draft.cities.map((c) => <PlaceChip key={cityId(c)} label={c.city} sub={c.state} onRemove={() => onChange(removeCity(draft, c))} />)}
          {draft.state && <PlaceChip label={US_STATES[draft.state] ?? draft.state} sub="state" onRemove={() => onChange({ ...draft, state: null })} />}
        </ul>
      )}
      {placeCount(draft) === 0 && <p className="text-[13px] text-app-muted">No places left. Add a city or suggest more.</p>}
      {adding ? (
        <CityInput label="Add" onSubmit={(c) => { onChange(addCity(draft, c)); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-x-4">
          <button type="button" onClick={onMore} disabled={busy || !canSuggestMore(draft)} className={TEXT_BUTTON}>
            <RefreshCw aria-hidden className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Suggest more cities
          </button>
          {draft.cities.length < MAX_CITIES && (
            <button type="button" onClick={() => setAdding(true)} className={TEXT_BUTTON}>
              <Plus aria-hidden className="h-4 w-4" /> Add a city
            </button>
          )}
          {!draft.state && baseState && (
            <button type="button" onClick={() => onChange({ ...draft, state: baseState })} className={TEXT_BUTTON}>
              <Plus aria-hidden className="h-4 w-4" /> Add {US_STATES[baseState] ?? baseState}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const postsLine = (n: number) => (n === 0 ? 'One post per place, every 2 days.' : `${n} post${n === 1 ? '' : 's'}: one per place, every 2 days.`);

/** "Where do you sell?": up to 3 cities + her state, guessed or from her location, all editable. */
export const MarketPlacesPicker = ({ draft, busy, error, onChange, onLocate, onTypeBase, onMore }: Props) => {
  const [changing, setChanging] = useState(false);
  const asking = changing || (!draft && !busy);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="flex items-center gap-2 text-[14px] font-medium text-app-ink">
            <MapPin aria-hidden className="h-4 w-4 text-app-accent" /> Where do you sell?
          </p>
          <p className="text-[12px] text-app-muted">{postsLine(placeCount(draft))}</p>
        </div>
        {draft && !changing && (
          <button type="button" onClick={() => setChanging(true)} className="h-8 shrink-0 rounded-lg px-2 text-[13px] font-medium text-app-muted transition-colors duration-200 hover:text-app-ink">
            Change
          </button>
        )}
      </div>

      {asking ? (
        <BaseAsk
          busy={busy}
          onLocate={() => { onLocate(); setChanging(false); }}
          onTypeBase={(c) => { onTypeBase(c); setChanging(false); }}
          onCancel={draft ? () => setChanging(false) : undefined}
        />
      ) : draft ? (
        <Places draft={draft} busy={busy} onChange={onChange} onMore={onMore} />
      ) : (
        <ChipsSkeleton />
      )}

      {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
      <p className="text-[12px] text-app-muted">Every number comes from a real source (Redfin, Realtor.com, Freddie Mac…) and shows it on the slide.</p>
    </div>
  );
};
