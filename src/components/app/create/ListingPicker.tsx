'use client';

import { Home, Info, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch, getStoredToken } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';

export type RoomDto = { id: string; label: string | null; url: string | null; used: boolean };
export type ListingDto = { id: string; label: string; visibleAiTag: boolean; createdAt: string; rooms: RoomDto[] };

type Props = {
  listings: ListingDto[];
  value: string | null;
  onChange: (listingId: string | null) => void;
  onRefresh: () => void;
  /** Opened from "Add property" elsewhere: go straight to the form. */
  startAdding?: boolean;
};

/**
 * Pick a property, or add one. Photos are only ever made from the rooms she uploads —
 * we never invent a room of a real property (docs/business-studios/12-listing-mode-plan.md).
 */
export const ListingPicker = ({ listings, value, onChange, onRefresh, startAdding = false }: Props) => {
  const [adding, setAdding] = useState(startAdding);
  const [label, setLabel] = useState('');
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The label ticks the moment she taps it; the server catches up behind.
  const [labelOverride, setLabelOverride] = useState<Record<string, boolean>>({});
  const selected = listings.find((l) => l.id === value) ?? null;
  const labelOn = selected ? (labelOverride[selected.id] ?? selected.visibleAiTag) : false;

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

  const addRooms = async (files: File[]) => {
    if (!selected || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      for (const file of files.slice(0, 20)) {
        form.append('files', file);
        form.append('labels', file.name.replace(/\.[^.]+$/, '').slice(0, 120));
      }
      const token = getStoredToken();
      const res = await fetch(`/api/app/listings/${selected.id}/rooms`, { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new ApiError(res.status, 'upload_failed', 'Could not add those photos.');
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add those photos.');
    } finally {
      setBusy(false);
    }
  };

  const removeRoom = async (roomId: string) => {
    if (!selected) return;
    await apiFetch(`/api/app/listings/${selected.id}/rooms/${roomId}`, { method: 'DELETE' }).catch(() => undefined);
    onRefresh();
  };

  const toggleLabel = async (on: boolean) => {
    if (!selected) return;
    const id = selected.id;
    setLabelOverride((prev) => ({ ...prev, [id]: on }));
    try {
      await apiFetch(`/api/app/listings/${id}`, { method: 'PATCH', json: { visibleAiTag: on } });
      onRefresh();
    } catch {
      setLabelOverride((prev) => ({ ...prev, [id]: !on }));
      setError('Could not change the label. Try again.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={`h-10 rounded-xl px-3 text-[13px] font-medium transition-colors duration-200 ${value === null ? 'bg-app-accent text-app-accent-ink' : 'border border-app-line text-app-muted hover:bg-app-sunken'}`}
        >
          Just me
        </button>
        {listings.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(l.id)}
            aria-pressed={value === l.id}
            className={`h-10 rounded-xl px-3 text-[13px] font-medium transition-colors duration-200 ${value === l.id ? 'bg-app-accent text-app-accent-ink' : 'border border-app-line text-app-muted hover:bg-app-sunken'}`}
          >
            {l.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex h-10 items-center gap-1 rounded-xl border border-dashed border-app-line px-3 text-[13px] text-app-muted transition-colors duration-200 hover:bg-app-sunken"
        >
          <Plus aria-hidden className="h-4 w-4" /> Property
        </button>
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
        <div className="flex flex-col gap-3 rounded-2xl border border-app-line p-4">
          <div className="flex items-start gap-2 rounded-xl bg-app-sunken px-3 py-2">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-muted" />
            <p className="text-[13px] text-app-muted">
              We put you in the photos you add here. We never redecorate a room or invent one, so add a photo for every room you want to be in.
            </p>
          </div>

          <ul className="flex gap-2 overflow-x-auto pb-1">
            <li className="shrink-0">
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-app-line text-app-muted transition-colors duration-200 hover:bg-app-sunken">
                <Plus aria-hidden className="h-5 w-5" />
                <span className="text-[11px]">{busy ? 'Adding…' : 'Room'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={busy}
                  className="sr-only"
                  onChange={(e) => {
                    void addRooms([...(e.target.files ?? [])]);
                    e.target.value = '';
                  }}
                />
              </label>
            </li>
            {selected.rooms.map((room) => (
              <li key={room.id} className="relative shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-xl bg-app-sunken">
                  {room.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={room.url} alt={room.label ?? 'Room'} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-app-muted"><Home aria-hidden className="h-5 w-5" /></span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void removeRoom(room.id)}
                  aria-label={`Remove ${room.label ?? 'room'}`}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-app-ink text-app-bg"
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <label className="flex items-start gap-2">
            <input id={`listing-ai-label-${selected.id}`} type="checkbox" checked={labelOn} onChange={(e) => void toggleLabel(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--app-accent)]" />
            <span>
              <span className="block text-[13px] text-app-ink">Put a visible “AI” label on these photos</span>
              <span className="block text-[12px] text-app-muted">
                Some states and MLSs ask for a label you can see on listing photos. Every file already carries a hidden one.
              </span>
            </span>
          </label>
        </div>
      )}

      {error && <p className="text-[13px] text-app-danger">{error}</p>}
    </div>
  );
};
