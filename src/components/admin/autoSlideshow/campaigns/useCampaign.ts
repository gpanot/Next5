'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CampaignDraft, CampaignDto, CampaignPhotoRef, CampaignPhotoTarget } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';

/** Typing settles this long before the draft is saved. */
const SAVE_DELAY_MS = 700;

/** Puts imported photos on their slide: hook photos join the rotation, a card's photo is replaced by the last one. */
const placePhotos = (draft: CampaignDraft, target: CampaignPhotoTarget, indexes: number[]): CampaignDraft => {
  if (indexes.length === 0) return draft;
  if (target.slot === 'hook') return { ...draft, hookPhotos: [...draft.hookPhotos, ...indexes] };
  return { ...draft, cards: draft.cards.map((c, i) => (i === target.card ? { ...c, photo: indexes[indexes.length - 1]! } : c)) };
};

/**
 * One campaign in the editor: loaded once, then the draft lives here and is saved (debounced) as it changes. Photo
 * imports run one at a time; each lands on its slide as soon as it is in. `stale`: the draft changed after the
 * slideshows were generated.
 */
export const useCampaign = (token: string, id: string) => {
  const base = `/api/slideshow/campaigns/${id}`;
  const [campaign, setCampaign] = useState<CampaignDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'import' | 'generate' | null>(null);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<CampaignDraft | null>(null);

  useEffect(() => {
    let live = true;
    adminFetch<{ campaign: CampaignDto }>(token, base)
      .then((res) => live && setCampaign(res.campaign))
      .catch((err: Error) => live && setError(err.message || 'Could not open this campaign'));
    return () => {
      live = false;
    };
  }, [token, base]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const draft = pending.current;
    if (!draft) return;
    pending.current = null;
    setSaving(true);
    try {
      await adminFetch(token, base, { method: 'PATCH', body: JSON.stringify({ draft }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }, [token, base]);

  // Saves what is left when the editor closes.
  useEffect(() => () => void flush(), [flush]);

  const setDraft = useCallback((update: (d: CampaignDraft) => CampaignDraft) => {
    setCampaign((c) => {
      if (!c) return c;
      const draft = update(c.draft);
      pending.current = draft;
      return { ...c, draft };
    });
    setStale(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush]);

  const rename = useCallback(async (name: string) => {
    setCampaign((c) => (c ? { ...c, name } : c));
    await adminFetch(token, base, { method: 'PATCH', body: JSON.stringify({ name }) }).catch((err: Error) => setError(err.message));
  }, [token, base]);

  /** Imports the picks in order; stops at the first failure and keeps the ones already in. */
  const importPhotos = useCallback(async (refs: CampaignPhotoRef[], target: CampaignPhotoTarget) => {
    setBusy('import');
    setError(null);
    try {
      for (const ref of refs) {
        const res = await adminFetch<{ index: number; campaign: CampaignDto }>(token, `${base}/photos`, { method: 'POST', body: JSON.stringify({ ref }) });
        setCampaign((c) => (c ? { ...c, photos: res.campaign.photos } : c));
        setDraft((d) => placePhotos(d, target, [res.index]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that photo');
    } finally {
      setBusy(null);
    }
  }, [token, base, setDraft]);

  const generate = useCallback(async (): Promise<boolean> => {
    await flush();
    setBusy('generate');
    setError(null);
    try {
      const res = await adminFetch<{ campaign: CampaignDto }>(token, `${base}/generate`, { method: 'POST', body: '{}' });
      setCampaign(res.campaign);
      setStale(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make the slideshows');
      return false;
    } finally {
      setBusy(null);
    }
  }, [token, base, flush]);

  return { campaign, error, busy, saving, stale, setDraft, rename, importPhotos, generate, clearError: () => setError(null) };
};

export type CampaignState = ReturnType<typeof useCampaign>;
