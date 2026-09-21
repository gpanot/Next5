'use client';

import { History, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ListingDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';
import { PropertyPanel } from '../listings/PropertyPanel';
import { RecentPropertiesSheet } from '../listings/RecentPropertiesSheet';
import { ZillowImportSheet } from '../listings/ZillowImportSheet';

type Props = {
  listings: ListingDto[];
  value: string | null;
  onChange: (listingId: string | null) => void;
  onRefresh: () => void;
  /** A property was added from Zillow (its photos may still be loading). */
  onAdded: (listing: ListingDto) => void;
  /** Opened from "Add property" elsewhere: go straight to adding one. */
  startAdding?: boolean;
};

/**
 * Pick a property, or add one from a Zillow link or her own photos. Photos are only ever made from
 * photos of the property she gives us — we never invent a room (docs/business-studios/12-listing-mode-plan.md).
 */
export const ListingPicker = ({ listings, value, onChange, onRefresh, onAdded, startAdding = false }: Props) => {
  const [importing, setImporting] = useState(startAdding);
  const [resume, setResume] = useState<ListingDto | null>(null);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = listings.find((l) => l.id === value) ?? null;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ listings: ListingDto[] }>('/api/app/listings', { method: 'POST', json: { label, attest, visibleAiTag: false } });
      const created = res.listings.find((l) => l.label === label.trim());
      onRefresh();
      if (created) onChange(created.id);
      setAdding(false);
      setLabel('');
      setAttest(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add that property.');
    } finally {
      setBusy(false);
    }
  };

  const closeSheet = () => {
    setImporting(false);
    setResume(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={`h-10 rounded-xl px-3 text-[13px] font-medium transition-colors duration-200 ${value === null ? 'bg-app-cta text-app-cta-ink' : 'border border-app-line text-app-muted hover:bg-app-sunken'}`}
        >
          Just me
        </button>
        {selected && (
          <span className="flex h-10 max-w-full items-center truncate rounded-xl bg-app-cta px-3 text-[13px] font-medium text-app-cta-ink">
            {selected.importStatus === 'fetching' && <Loader2 aria-hidden className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />}
            {selected.label}
          </span>
        )}
        <button
          type="button"
          onClick={() => setImporting(true)}
          className="flex h-10 items-center gap-1 rounded-xl border border-dashed border-app-line px-3 text-[13px] text-app-muted transition-colors duration-200 hover:bg-app-sunken"
        >
          <Plus aria-hidden className="h-4 w-4" /> Property
        </button>
        {listings.some((l) => l.id !== value) && (
          <button
            type="button"
            onClick={() => setRecentsOpen(true)}
            className="flex h-10 items-center gap-1 rounded-xl px-3 text-[13px] text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink"
          >
            <History aria-hidden className="h-4 w-4" /> Recents…
          </button>
        )}
      </div>

      {adding && (
        <div className="flex flex-col gap-3 rounded-2xl border border-app-line p-4">
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-app-ink">Address or name</span>
            <input
              id="listing-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="2720 Ashford Dr"
              className="h-10 rounded-xl border border-app-line bg-app-panel px-3 text-[14px] text-app-ink placeholder:text-app-muted"
            />
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--app-accent)]" />
            <span className="text-[13px] text-app-muted">I represent this property.</span>
          </label>
          <div className="flex gap-2">
            <AppButton size="sm" onClick={() => void create()} loading={busy} disabled={!label.trim() || !attest}>Add property</AppButton>
            <AppButton size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</AppButton>
          </div>
        </div>
      )}

      {selected && (
        <PropertyPanel
          key={selected.id}
          listing={selected}
          onRefresh={onRefresh}
          onAddFromZillow={() => {
            setResume(selected);
            setImporting(true);
          }}
          onRemoved={() => onChange(null)}
        />
      )}

      {error && <p className="text-[13px] text-app-danger">{error}</p>}

      {recentsOpen && (
        <RecentPropertiesSheet
          listings={listings}
          value={value}
          onClose={() => setRecentsOpen(false)}
          onPick={(id) => {
            setRecentsOpen(false);
            onChange(id);
          }}
        />
      )}

      {importing && (
        <ZillowImportSheet
          resume={resume}
          onClose={closeSheet}
          onUploadInstead={() => {
            closeSheet();
            setAdding(true);
          }}
          onDone={(listing) => {
            closeSheet();
            onAdded(listing);
          }}
        />
      )}
    </div>
  );
};
