'use client';

import { Check, Home, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useListingImport } from '../../../hooks/useListingImport';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ListingDto } from '../../../types/business/listings';
import { ZillowLinkStep } from '../listings/ZillowLinkStep';

type Props = {
  listings: ListingDto[];
  value: string | null;
  onChange: (listingId: string | null) => void;
  /** A Zillow import finished or started; reload the list. */
  onRefresh: () => void;
};

/** Playbooks are made from Zillow photos only (never invented rooms), so only Zillow homes can be picked. */
export const isPlaybookReady = (l: ListingDto) => l.source === 'zillow' && l.importStatus === 'ready' && l.candidates.length >= 4;

const HomeRow = ({ listing, active, onPick }: { listing: ListingDto; active: boolean; onPick: () => void }) => {
  const busy = listing.importStatus === 'fetching';
  const cover = listing.candidates[0]?.thumbUrl;
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!isPlaybookReady(listing)}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors duration-200 disabled:opacity-60 ${
        active ? 'border-app-accent bg-app-accent-soft' : 'border-app-line bg-app-panel hover:border-app-ink/40'
      }`}
    >
      <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-app-sunken">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <Home aria-hidden className="h-5 w-5 text-app-muted" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-medium text-app-ink">{listing.address ?? listing.label}</span>
        <span className="truncate text-[12px] text-app-muted">{busy ? 'Getting photos from Zillow…' : (listing.facts ?? 'Needs Zillow photos')}</span>
      </span>
      {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin text-app-muted" /> : active ? <Check aria-hidden className="h-4 w-4 text-app-accent" /> : null}
    </button>
  );
};

export const HomePicker = ({ listings, value, onChange, onRefresh }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<ListingDto | null>(null);
  const [adding, setAdding] = useState(listings.length === 0);

  useListingImport(started, (result) => {
    if (result.error) setError(result.error);
    if (result.listing && isPlaybookReady(result.listing)) onChange(result.listing.id);
    onRefresh();
  });

  const importLink = async (url: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ listing: ListingDto }>('/api/app/listings/import', { method: 'POST', json: { url, attest: true } });
      setStarted(res.listing);
      setAdding(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not reach Zillow. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const zillow = listings.filter((l) => l.source === 'zillow');
  return (
    <div className="flex flex-col gap-2.5">
      {zillow.map((l) => (
        <HomeRow key={l.id} listing={l} active={l.id === value} onPick={() => onChange(l.id)} />
      ))}
      {adding || zillow.length === 0 ? (
        <div className="rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
          <ZillowLinkStep busy={busy} error={error} onSubmit={(url) => void importLink(url)} />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="h-10 rounded-xl border border-dashed border-app-line text-[13px] font-medium text-app-muted transition-colors duration-200 hover:text-app-ink">
          + Paste another Zillow link
        </button>
      )}
      {error && !adding && <p className="text-[13px] text-app-danger" role="alert">{error}</p>}
    </div>
  );
};
