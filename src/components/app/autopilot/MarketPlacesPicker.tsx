'use client';

import { CalendarDays, Loader2, LocateFixed, MapPin, Plus, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { cityId, MAX_CITIES, placeCount, US_STATES, type MarketCity } from '../../../lib/marketPlaces';
import { CityInput } from './CityInput';
import { addCity, canSuggestMore, placeIds, removeCity, type PlacesDraft } from './placesDraft';

type Props = {
  draft: PlacesDraft | null;
  busy: boolean;
  error: string | null;
  /** Post day per place, same order as placeIds (cities, then the state). */
  dates: string[];
  today: string;
  onChange: (d: PlacesDraft) => void;
  onLocate: () => void;
  onTypeBase: (city: MarketCity) => void;
  onMore: () => void;
};

const TEXT_BUTTON = 'inline-flex h-9 items-center gap-1.5 rounded-lg px-1 text-[14px] font-medium text-app-accent transition-colors duration-200 hover:text-app-ink disabled:opacity-40';

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

type RowProps = { label: string; sub: string; date: string; today: string; onDate: (date: string) => void; onRemove: () => void };

/** One post: the place, its day (tap to change), remove. */
const PlaceRow = ({ label, sub, date, today, onDate, onRemove }: RowProps) => (
  <li className="flex h-12 items-center gap-2 border-b border-app-line last:border-b-0">
    <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
      <span className="truncate text-[14px] font-medium text-app-ink">{label}</span>
      <span className="shrink-0 text-[12px] text-app-muted">{sub}</span>
    </span>
    <label className="relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-app-line px-2.5 text-[13px] text-app-ink transition-colors duration-200 hover:border-app-accent">
      <CalendarDays aria-hidden className="h-3.5 w-3.5 text-app-muted" />
      {dayLabel(date)}
      <input
        type="date"
        aria-label={`Post day for ${label}`}
        min={today}
        value={date}
        onChange={(e) => e.target.value && onDate(e.target.value)}
        onClick={(e) => e.currentTarget.showPicker?.()}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
    <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink">
      <X aria-hidden className="h-4 w-4" />
    </button>
  </li>
);

const RowsSkeleton = () => (
  <ul aria-hidden className="flex flex-col gap-2">
    {[0, 1, 2, 3].map((i) => <li key={i} className="h-10 animate-pulse rounded-lg bg-app-sunken" />)}
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
const Places = ({ draft, dates, today, busy, onChange, onMore }: Pick<Props, 'dates' | 'today' | 'busy' | 'onChange' | 'onMore'> & { draft: PlacesDraft }) => {
  const [adding, setAdding] = useState(false);
  const baseState = draft.base?.state ?? draft.cities[0]?.state ?? null;
  const ids = placeIds(draft);
  const setDate = (i: number) => (date: string) => onChange({ ...draft, dates: { ...draft.dates, [ids[i]!]: date } });
  return (
    <div className="flex flex-col gap-3">
      {busy && draft.cities.length === 0 ? (
        <RowsSkeleton />
      ) : (
        <ul className="flex flex-col">
          {draft.cities.map((c, i) => (
            <PlaceRow key={cityId(c)} label={c.city} sub={c.state} date={dates[i] ?? today} today={today} onDate={setDate(i)} onRemove={() => onChange(removeCity(draft, c))} />
          ))}
          {draft.state && (
            <PlaceRow
              label={US_STATES[draft.state] ?? draft.state}
              sub="state"
              date={dates[draft.cities.length] ?? today}
              today={today}
              onDate={setDate(draft.cities.length)}
              onRemove={() => onChange({ ...draft, state: null })}
            />
          )}
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

const postsLine = (n: number) => (n === 0 ? 'One post per place, on your free days.' : `${n} post${n === 1 ? '' : 's'}: one per place, on your next free days.`);

/** "Where do you sell?": up to 3 cities + her state, guessed or from her location, all editable. */
export const MarketPlacesPicker = ({ draft, dates, today, busy, error, onChange, onLocate, onTypeBase, onMore }: Props) => {
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
        <Places draft={draft} dates={dates} today={today} busy={busy} onChange={onChange} onMore={onMore} />
      ) : (
        <RowsSkeleton />
      )}

      {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
      <p className="text-[12px] text-app-muted">Every number comes from a real source (Redfin, Realtor.com, Freddie Mac…) and shows it on the slide.</p>
    </div>
  );
};
