'use client';

import { Film } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ListingPackDto } from '../../../types/business/shop';
import { AppButton } from '../../ui/AppButton';

type PackCoverProps = {
  pack: ListingPackDto;
  busy: boolean;
  onPick: (itemId: string) => void;
  /** Reloads the pack (while a cover is being created). */
  onReload: () => Promise<void>;
  onError: (message: string) => void;
};

const POLL_MS = 8_000;

/** Pick the 9:16 video cover, or create one from this page. Creating a cover never changes the other photos. */
export const PackCover = ({ pack, busy, onPick, onReload, onError }: PackCoverProps) => {
  const [starting, setStarting] = useState(false);
  const creating = pack.coversInProgress > 0;

  useEffect(() => {
    if (!creating) return;
    const id = window.setInterval(() => void onReload(), POLL_MS);
    return () => window.clearInterval(id);
  }, [creating, onReload]);

  const create = async () => {
    setStarting(true);
    try {
      await apiFetch(`/api/app/shop/library/${pack.productId}/cover`, { method: 'POST' });
      await onReload();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not start the cover. Try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-medium text-app-muted">Video cover · 9:16</p>
      {pack.covers.length > 0 && (
        <div role="radiogroup" aria-label="Video cover" className="grid grid-cols-3 gap-2">
          {pack.covers.map((c) => (
            <button key={c.itemId} type="button" role="radio" aria-checked={pack.coverItemId === c.itemId} disabled={busy} onClick={() => onPick(c.itemId)} className={`relative aspect-[9/16] overflow-hidden rounded-lg ring-2 transition-colors duration-200 ${pack.coverItemId === c.itemId ? 'ring-app-accent' : 'ring-transparent'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
              {c.url && <img src={c.url} alt="Cover option" className="h-full w-full object-cover" />}
            </button>
          ))}
        </div>
      )}
      {creating ? (
        <p className="flex items-center gap-2 rounded-lg bg-app-sunken px-3 py-2 text-[13px] text-app-ink" aria-live="polite">
          <Film aria-hidden className="h-4 w-4 animate-pulse text-app-accent" />Creating your cover… about 90 seconds.
        </p>
      ) : (
        <>
          {pack.covers.length === 0 && <p className="text-[13px] text-app-muted">TikTok shows this on your listing video. Your other photos stay the same.</p>}
          <AppButton size="sm" variant={pack.covers.length ? 'secondary' : 'primary'} iconLeft={<Film className="h-3.5 w-3.5" />} loading={starting} onClick={() => void create()}>
            {pack.covers.length ? 'Create another cover' : 'Create 9:16 cover'}
          </AppButton>
          <span className="text-[12px] text-app-muted">Uses 1 photo from your balance (2 for 2K).</span>
        </>
      )}
    </div>
  );
};
