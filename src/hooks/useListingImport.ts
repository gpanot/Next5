'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../lib/apiClient';
import type { ListingDto } from '../types/business/listings';

const EVERY_MS = 2000;
const GIVE_UP_MS = 3 * 60_000;

export const isImportBusy = (listing: ListingDto): boolean => listing.importStatus === 'fetching' || listing.syncing;

export type ImportResult = { listing: ListingDto; error: null } | { listing: null; error: string };

/**
 * Polls a Zillow import (or a "Refresh from Zillow") until it settles, then calls `onSettled`.
 * Pass the listing the POST returned, or null. A new object polls again, even for the same property.
 * The GET also finishes the run on our side when the Apify webhook can't reach us.
 */
export const useListingImport = (started: ListingDto | null, onSettled: (result: ImportResult) => void) => {
  const [settledFor, setSettledFor] = useState<ListingDto | null>(null);
  const callback = useRef(onSettled);
  useEffect(() => {
    callback.current = onSettled;
  });
  const polling = started && isImportBusy(started) ? started : null;

  useEffect(() => {
    if (!polling) return;
    let cancelled = false;
    let timer = 0;
    const deadline = Date.now() + GIVE_UP_MS;
    const settle = (result: ImportResult) => {
      setSettledFor(polling);
      callback.current(result);
    };
    const tick = async () => {
      try {
        const { listing } = await apiFetch<{ listing: ListingDto }>(`/api/app/listings/${polling.id}/import`);
        if (cancelled) return;
        if (!isImportBusy(listing)) return settle({ listing, error: null });
        if (Date.now() > deadline) return settle({ listing: null, error: 'Zillow is taking too long. Try again, or upload your photos.' });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status !== 0) return settle({ listing: null, error: err.message });
      }
      timer = window.setTimeout(() => void tick(), EVERY_MS);
    };
    timer = window.setTimeout(() => void tick(), EVERY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [polling]);

  return { loading: polling !== null && settledFor !== polling };
};
