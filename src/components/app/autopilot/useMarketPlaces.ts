'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../lib/apiClient';
import type { MarketCity } from '../../../lib/marketPlaces';
import { findNearby } from './api';
import { draftFromBase, draftFromSaved, suggestMore, type PlacesDraft } from './placesDraft';
import type { MarketInfo } from './WhatStep';

type Args = { draft: PlacesDraft | null; market: MarketInfo | null; active: boolean; onChange: (d: PlacesDraft) => void };

const LOCATION_OFF = 'We could not get your location. Type your city instead.';

const devicePoint = () =>
  new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  });

/**
 * "Where do you sell?": starts from her saved places, else from a guessed city (her listings or IP, no prompt).
 * Sharing her location or typing a city starts over from that city.
 */
export const useMarketPlaces = ({ draft, market, active, onChange }: Args) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const fromBase = useCallback(
    async (from: Parameters<typeof findNearby>[0], failMessage?: string) => {
      setBusy(true);
      setError(null);
      try {
        const { base, nearby } = await findNearby(from);
        onChange(draftFromBase(base, nearby));
      } catch (err) {
        setError(failMessage ?? (err instanceof ApiError ? err.message : 'Something went wrong. Try again.'));
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  // First visit: saved places as they are, or 3 cities + a state around the guessed city.
  useEffect(() => {
    if (!active || draft || !market || started.current) return;
    started.current = true;
    const { places, suggestedBase } = market;
    // After this render: the parent owns the draft, and fromBase sets loading state.
    queueMicrotask(() => {
      if (places) onChange(draftFromSaved(places));
      else if (suggestedBase) void fromBase(suggestedBase);
    });
  }, [active, draft, market, onChange, fromBase]);

  const locate = async () => {
    setBusy(true);
    setError(null);
    try {
      const point = await devicePoint();
      await fromBase(point);
    } catch {
      setError(LOCATION_OFF);
      setBusy(false);
    }
  };

  const typeBase = (city: MarketCity) => fromBase(city);

  /** Loads the nearby list the first time (saved places have none yet), then rotates. */
  const more = async () => {
    if (!draft?.base) return;
    if (draft.nearby.length > 0) return onChange(suggestMore(draft));
    setBusy(true);
    setError(null);
    try {
      const { nearby } = await findNearby(draft.base);
      onChange(suggestMore({ ...draft, nearby }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, locate, typeBase, more };
};
