'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/apiClient';
import type { ListingDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';
import { Field } from '../../ui/Field';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { TextInput } from '../../ui/TextInput';

type Props = { listing: ListingDto; onSaved: () => void };

const STATUS_OPTIONS = [
  { value: 'just_listed', label: 'Just listed' },
  { value: 'for_sale', label: 'For sale' },
  { value: 'price_drop', label: 'Price drop' },
  { value: 'sold', label: 'Just sold' },
] as const;

const toNum = (v: string): number | null => {
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return v.trim() && Number.isFinite(n) ? n : null;
};

/** Uploaded homes: the facts the videos say out loud (price, city, state), plus optional beds, baths, sqft. */
export const HomeDetailsForm = ({ listing, onSaved }: Props) => {
  const [status, setStatus] = useState<string>(listing.status ?? 'for_sale');
  const [city, setCity] = useState(listing.city ?? '');
  const [state, setState] = useState(listing.state ?? '');
  const [price, setPrice] = useState(listing.priceUsd ? String(listing.priceUsd) : '');
  const [beds, setBeds] = useState(listing.beds?.toString() ?? '');
  const [baths, setBaths] = useState(listing.baths?.toString() ?? '');
  const [sqft, setSqft] = useState(listing.sqft?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/app/listings/${listing.id}`, {
        method: 'PATCH',
        json: { details: { status, city, state, priceUsd: toNum(price), beds: toNum(beds), baths: toNum(baths), sqft: toNum(sqft) } },
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const change = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    setSaved(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-app-line p-3">
      <div>
        <p className="text-[14px] font-semibold text-app-ink">About this home</p>
        <p className="text-[13px] text-app-muted">The videos say these out loud. Price, city and state are needed. The rest is optional.</p>
      </div>
      <Field label="What's happening?">
        <SegmentedControl options={STATUS_OPTIONS} value={(STATUS_OPTIONS.find((o) => o.value === status)?.value ?? 'for_sale')} onChange={(v) => { setStatus(v); setSaved(false); }} className="flex w-full flex-wrap" />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Price" htmlFor="home-price" required><TextInput id="home-price" inputMode="numeric" placeholder="399000" value={price} onChange={change(setPrice)} /></Field>
        <Field label="City" htmlFor="home-city" required><TextInput id="home-city" value={city} onChange={change(setCity)} /></Field>
        <Field label="State" htmlFor="home-state" required><TextInput id="home-state" maxLength={2} placeholder="GA" value={state} onChange={change(setState)} /></Field>
        <Field label="Beds" htmlFor="home-beds"><TextInput id="home-beds" inputMode="numeric" value={beds} onChange={change(setBeds)} /></Field>
        <Field label="Baths" htmlFor="home-baths"><TextInput id="home-baths" inputMode="decimal" value={baths} onChange={change(setBaths)} /></Field>
        <Field label="Sqft" htmlFor="home-sqft"><TextInput id="home-sqft" inputMode="numeric" value={sqft} onChange={change(setSqft)} /></Field>
      </div>
      {error && <p className="text-[13px] text-app-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <AppButton loading={busy} disabled={!price.trim() || !city.trim() || state.trim().length !== 2} onClick={() => void save()}>Save details</AppButton>
        {saved && <span className="text-[13px] text-app-muted">Saved</span>}
      </div>
    </div>
  );
};
