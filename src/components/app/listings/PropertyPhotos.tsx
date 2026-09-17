'use client';

import { Home, Plus, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ListingDto, RoomDto } from '../../../types/business/listings';

type Props = { listing: ListingDto; onRefresh: () => void };

const PhotoTile = ({ room, busy, onRemove, onReplace }: { room: RoomDto; busy: boolean; onRemove: () => void; onReplace: (file: File) => void }) => (
  <li className="relative">
    <div className={`relative aspect-square overflow-hidden rounded-xl bg-app-sunken transition-opacity duration-200 ${busy ? 'opacity-50' : ''}`}>
      {room.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={room.url} alt={room.label ?? 'Photo'} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-app-muted"><Home aria-hidden className="h-5 w-5" /></span>
      )}
      {room.weak && room.label && (
        <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-black/60 px-1 py-0.5 text-center text-[10px] font-medium text-white">{room.label}</span>
      )}
      {room.fromZillow && room.lowRes && (
        <label className="absolute bottom-1 left-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors duration-200 hover:bg-black/80" title="Zillow only has a small copy. Replace it with your original.">
          <RefreshCw aria-hidden className="h-3 w-3" />
          <span className="sr-only">Replace with your original</span>
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
    <button
      type="button"
      onClick={onRemove}
      disabled={busy}
      aria-label={`Remove ${room.label ?? 'photo'}`}
      className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-app-ink text-app-bg shadow-sm transition-transform duration-200 hover:scale-105"
    >
      <X aria-hidden className="h-4 w-4" />
    </button>
  </li>
);

/** Her photos of the property as a grid, so cleaning up an imported gallery is quick: remove, replace, add. */
export const PropertyPhotos = ({ listing, onRefresh }: Props) => {
  const [busy, setBusy] = useState<string | null>(null);
  // Removed photos disappear at once; the server catches up behind.
  const [removed, setRemoved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const rooms = listing.rooms.filter((r) => !removed.includes(r.id));
  const anyLowRes = rooms.some((r) => r.fromZillow && r.lowRes);

  const run = async (key: string, action: () => Promise<unknown>, failure: string) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (roomId: string) => {
    setRemoved((prev) => [...prev, roomId]);
    try {
      await apiFetch(`/api/app/listings/${listing.id}/rooms/${roomId}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      setRemoved((prev) => prev.filter((id) => id !== roomId));
      setError(err instanceof ApiError ? err.message : 'Could not remove that photo.');
    }
  };

  const addPhotos = (files: File[]) => {
    const form = new FormData();
    for (const file of files.slice(0, 20)) {
      form.append('files', file);
      form.append('labels', file.name.replace(/\.[^.]+$/, '').slice(0, 120));
    }
    return run('add', () => apiFetch(`/api/app/listings/${listing.id}/rooms`, { method: 'POST', body: form }), 'Could not add those photos.');
  };

  const replace = (roomId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return run(roomId, () => apiFetch(`/api/app/listings/${listing.id}/rooms/${roomId}`, { method: 'PUT', body: form }), 'Could not replace that photo.');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] font-medium text-app-ink">{rooms.length} photo{rooms.length === 1 ? '' : 's'}</p>
        {listing.source === 'zillow' && rooms.length > 0 && <p className="text-[12px] text-app-muted">Tap × on the photos you don’t want to be in.</p>}
      </div>
      <ul className="grid grid-cols-3 gap-3 pr-1.5 pt-1.5 sm:grid-cols-5">
        <li>
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-app-line text-app-muted transition-colors duration-200 hover:bg-app-sunken">
            <Plus aria-hidden className="h-5 w-5" />
            <span className="text-[11px]">{busy === 'add' ? 'Adding…' : 'Photo'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy !== null}
              className="sr-only"
              onChange={(e) => {
                void addPhotos([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </label>
        </li>
        {rooms.map((room) => (
          <PhotoTile key={room.id} room={room} busy={busy === room.id} onRemove={() => void remove(room.id)} onReplace={(file) => void replace(room.id, file)} />
        ))}
      </ul>
      {anyLowRes && (
        <p className="text-[12px] text-app-muted">
          <RefreshCw aria-hidden className="mr-1 inline h-3 w-3" />
          Zillow only has small copies of these photos. They work, but your photographer’s originals look sharper. Tap the arrows to replace one.
        </p>
      )}
      {error && <p className="text-[13px] text-app-danger">{error}</p>}
    </div>
  );
};
