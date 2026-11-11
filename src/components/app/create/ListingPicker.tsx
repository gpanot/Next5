'use client';

import { History, Home, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ListingDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';
import { Checkbox } from '../../ui/Checkbox';
import { PropertyPanel } from '../listings/PropertyPanel';
import { RecentPropertiesSheet } from '../listings/RecentPropertiesSheet';
import { ZillowImportSheet } from '../listings/ZillowImportSheet';
import { ZillowLinkStep } from '../listings/ZillowLinkStep';

type Props = {
  listings: ListingDto[];
  value: string | null;
  onChange: (listingId: string | null) => void;
  onRefresh: () => void;
  /** A property was added from Zillow (its photos may still be loading). */
  onAdded: (listing: ListingDto) => void;
};

/** No Zillow link: name the home, confirm she represents it, then add its photos in the panel. */
const UploadForm = ({ onCreated, onBack }: { onCreated: (label: string) => Promise<void>; onBack: () => void }) => {
  const [label, setLabel] = useState('');
  const [attest, setAttest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await onCreated(label.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add that property.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-app-ink">Address or name</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="2720 Ashford Dr"
          className="h-11 rounded-xl border border-app-line bg-app-panel px-3 text-[14px] text-app-ink placeholder:text-app-muted focus:border-app-accent focus:outline-none"
        />
      </label>
      <Checkbox checked={attest} onChange={setAttest} label={<span className="text-[13px] text-app-ink">I represent this property.</span>} />
      {error && <p className="text-[13px] text-app-danger" role="alert">{error}</p>}
      <AppButton fullWidth onClick={() => void create()} loading={busy} disabled={!label || !attest}>Add property</AppButton>
      <AppButton variant="ghost" fullWidth onClick={onBack}>Use a Zillow link instead</AppButton>
    </div>
  );
};

/**
 * Realtors only: the Zillow link form shows right here, no modal. Everything is made from the listing
 * (docs/business-studios/12-listing-mode-plan.md).
 */
export const ListingPicker = ({ listings, value, onChange, onRefresh, onAdded }: Props) => {
  const [resume, setResume] = useState<ListingDto | null>(null);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = listings.find((l) => l.id === value) ?? null;

  const importLink = async (url: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ listing: ListingDto }>('/api/app/listings/import', { method: 'POST', json: { url, attest: true } });
      onAdded(res.listing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not reach Zillow. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const createByName = async (label: string) => {
    const res = await apiFetch<{ listings: ListingDto[] }>('/api/app/listings', { method: 'POST', json: { label, attest: true, visibleAiTag: false } });
    onRefresh();
    const created = res.listings.find((l) => l.label === label);
    if (created) onChange(created.id);
    setUploading(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {listings.length > 0 && !selected && (
        <button type="button" onClick={() => setRecentsOpen(true)} className="flex h-10 w-fit items-center gap-1.5 rounded-full border border-app-line px-4 text-[13px] text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink">
          <History aria-hidden className="h-4 w-4" /> Your listings ({listings.length})
        </button>
      )}

      {selected && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-[14px] font-semibold text-app-ink">
              {selected.importStatus === 'fetching' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin text-app-muted" /> : <Home aria-hidden className="h-4 w-4 text-app-accent" />}
              <span className="truncate">{selected.label}</span>
            </span>
            <button type="button" onClick={() => onChange(null)} className="text-[13px] font-medium text-app-muted transition-colors duration-200 hover:text-app-ink">
              Add another property
            </button>
          </div>
          <PropertyPanel key={selected.id} listing={selected} onRefresh={onRefresh} onAddFromZillow={() => setResume(selected)} onRemoved={() => onChange(null)} />
        </>
      )}

      {!selected && (
        <div className="rounded-2xl border border-app-line bg-app-panel p-4 sm:p-5">
          {uploading
            ? <UploadForm onCreated={createByName} onBack={() => setUploading(false)} />
            : <ZillowLinkStep busy={busy} error={error} onSubmit={(url) => void importLink(url)} onUploadInstead={() => setUploading(true)} />}
        </div>
      )}

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

      {resume && (
        <ZillowImportSheet
          resume={resume}
          onClose={() => setResume(null)}
          onDone={(listing) => {
            setResume(null);
            onAdded(listing);
          }}
        />
      )}
    </div>
  );
};
