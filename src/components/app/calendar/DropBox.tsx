'use client';

import { Home, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch, getStoredToken } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';

export type MaterialDto = { id: string; kind: 'listing' | 'room' | 'other'; label: string | null; url: string | null; used: boolean; createdAt: string };

const KINDS = [
  { id: 'listing' as const, label: 'A listing' },
  { id: 'room' as const, label: 'My place' },
];

/**
 * Her own photos — a listing, her salon — which we put her into.
 * One picker, no form: she adds photos and they become posts.
 */
export const DropBox = ({ onCreate }: { onCreate: () => void }) => {
  const { data, refresh } = useApi<{ materials: MaterialDto[] }>('/api/app/calendar/materials');
  const [kind, setKind] = useState<'listing' | 'room'>('listing');
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Removal shows instantly rather than waiting on a round trip — this is used on a phone.
  const materials = (data?.materials ?? []).filter((m) => !removed.has(m.id));
  const waiting = materials.filter((m) => !m.used);

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('kind', kind);
      for (const file of files.slice(0, 20)) {
        form.append('files', file);
        form.append('labels', file.name.replace(/\.[^.]+$/, '').slice(0, 120));
      }
      const token = getStoredToken();
      const res = await fetch('/api/app/calendar/materials', {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new ApiError(res.status, 'upload_failed', 'Could not add those photos.');
      setRemoved(new Set());
      refresh(); // she stays here and sees the thumbnails land
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add those photos.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setRemoved((prev) => new Set(prev).add(id));
    try {
      await apiFetch(`/api/app/calendar/materials/${id}`, { method: 'DELETE' });
    } catch {
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setError('Could not remove that photo.');
    }
  };

  return (
    <section className="rounded-2xl border border-app-line bg-app-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-app-ink">Your listings</h2>
        {waiting.length > 0 && <p className="text-[13px] text-app-muted tabular-nums">{waiting.length} waiting for photos</p>}
      </div>
      <p className="mt-1 text-[13px] text-app-muted">Add a photo of a place. Your next photos put you inside it.</p>

      <div className="mt-3 flex gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            aria-pressed={kind === k.id}
            className={`h-9 rounded-xl px-3 text-[13px] font-medium transition-colors duration-200 ${
              kind === k.id ? 'bg-app-accent text-app-accent-ink' : 'border border-app-line text-app-muted hover:bg-app-sunken'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <li className="shrink-0">
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-app-line text-app-muted transition-colors duration-200 hover:bg-app-sunken">
            <Plus aria-hidden className="h-5 w-5" />
            <span className="text-[11px]">{busy ? 'Adding…' : 'Add'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              className="sr-only"
              onChange={(e) => {
                void upload([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </label>
        </li>
        {materials.map((m) => (
          <li key={m.id} className="relative shrink-0">
            <div className={`h-20 w-20 overflow-hidden rounded-xl bg-app-sunken ${m.used ? 'opacity-40' : ''}`}>
              {m.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.label ?? 'Your photo'} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-app-muted"><Home aria-hidden className="h-5 w-5" /></span>
              )}
            </div>
            {!m.used && (
              <button
                type="button"
                onClick={() => void remove(m.id)}
                aria-label={`Remove ${m.label ?? 'photo'}`}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-app-ink text-app-bg"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-[13px] text-app-danger">{error}</p>}

      {waiting.length > 0 && (
        <AppButton className="mt-3" fullWidth onClick={onCreate} variant="secondary">
          Make photos of these {waiting.length > 1 ? `${waiting.length} places` : 'place'}
        </AppButton>
      )}
    </section>
  );
};
