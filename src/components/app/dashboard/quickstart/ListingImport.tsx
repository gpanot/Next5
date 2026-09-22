'use client';

import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { isImportBusy, useListingImport } from '../../../../hooks/useListingImport';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import { parseZillowUrl } from '../../../../lib/listingPhotos';
import type { ListingDto } from '../../../../types/business/listings';
import { AppButton } from '../../../ui/AppButton';
import { useAppRouter } from '../../shell/AppLink';
import { ImportStatusDialog } from './ImportStatusDialog';

/** Step 2: paste a Zillow link; when the photos are in, open Create with that listing. */
export const ListingImport = ({ onDone }: { onDone: () => void }) => {
  const router = useAppRouter();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<ListingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);

  const finish = (id: string | null) => {
    onDone();
    setReady(true);
    setBusy(false);
    if (id) router.push(`/app/create?listing=${id}`);
  };

  useListingImport(active, (result) => {
    setActive(null);
    if (result.error) {
      setError(result.error);
      setBusy(false);
    } else {
      finish(listingId ?? result.listing?.id ?? null);
    }
  });

  const submit = async () => {
    const link = url.trim();
    if (!link) return;
    if (!parseZillowUrl(link)) {
      setError('Paste a Zillow home link. It looks like zillow.com/homedetails/…');
      return;
    }
    setBusy(true);
    setError(null);
    setReady(false);
    setDialogOpen(true);
    try {
      const res = await apiFetch<{ listing: ListingDto }>('/api/app/listings/import', { method: 'POST', json: { url: link, attest: true } });
      setListingId(res.listing.id);
      if (isImportBusy(res.listing)) setActive(res.listing);
      else finish(res.listing.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not import. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Link2 aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            aria-label="Zillow listing link"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            placeholder="zillow.com/homedetails/…"
            className="h-10 w-full rounded-xl border border-app-line bg-app-panel pl-9 pr-3 text-[14px] text-app-ink outline-none transition-colors duration-200 placeholder:text-app-muted hover:border-app-muted focus-visible:ring-2 focus-visible:ring-app-accent"
          />
        </div>
        <AppButton loading={busy && !dialogOpen} disabled={!url.trim() || busy} onClick={() => void submit()}>Import listing</AppButton>
      </div>
      {error && !dialogOpen && <p role="alert" className="text-[12px] text-app-danger">{error}</p>}
      <ImportStatusDialog
        open={dialogOpen}
        ready={ready}
        error={error}
        onClose={() => setDialogOpen(false)}
        onGoToCreate={() => { setDialogOpen(false); if (listingId) router.push(`/app/create?listing=${listingId}`); }}
      />
    </div>
  );
};
