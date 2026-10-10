'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CampaignDraft, CampaignDto, CampaignPhotoDto, CampaignPhotoTarget, PhotoOptionDto } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';

/** Typing settles this long before the draft is saved. */
const SAVE_DELAY_MS = 700;
/** Photos copied into the campaign at once. */
const IMPORT_PARALLEL = 4;

/** A pick being copied in: shown at once from the picker's thumb, on the slide it is for. */
export type PendingPhoto = { key: string; thumbUrl: string; target: CampaignPhotoTarget };

/** The campaign's photos with new ones set at their index (imports can land in any order). */
const withPhotos = (photos: CampaignPhotoDto[], added: CampaignPhotoDto[]): CampaignPhotoDto[] => {
  const next = [...photos];
  for (const p of added) next[p.index] = p;
  return Array.from({ length: next.length }, (_, i) => next[i] ?? { index: i, url: null, fullUrl: null, source: 'generated', credit: null });
};

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
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsaved = useRef<CampaignDraft | null>(null);

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
    const draft = unsaved.current;
    if (!draft) return;
    unsaved.current = null;
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
      unsaved.current = draft;
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

  /**
   * Copies the picks in, a few at a time, showing each at once from its picker thumb. They are put on the slide in
   * pick order once all are in (that order is the hook rotation); a failed pick is left out and its error shown.
   */
  const importPhotos = useCallback(async (picks: PhotoOptionDto[], target: CampaignPhotoTarget) => {
    setBusy('import');
    setError(null);
    setPending((p) => [...p, ...picks.map((o) => ({ key: o.key, thumbUrl: o.thumbUrl, target }))]);
    const results: Array<CampaignPhotoDto | null> = new Array(picks.length).fill(null);
    let failure: string | null = null;
    let next = 0;
    const worker = async () => {
      while (next < picks.length) {
        const i = next++;
        try {
          results[i] = (await adminFetch<{ photo: CampaignPhotoDto }>(token, `${base}/photos`, { method: 'POST', body: JSON.stringify({ ref: picks[i]!.ref }) })).photo;
        } catch (err) {
          failure ??= err instanceof Error ? err.message : 'Could not add that photo';
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(IMPORT_PARALLEL, picks.length) }, worker));
    const added = results.filter((r): r is CampaignPhotoDto => r !== null);
    setCampaign((c) => (c ? { ...c, photos: withPhotos(c.photos, added) } : c));
    setDraft((d) => placePhotos(d, target, added.map((p) => p.index)));
    setPending((p) => p.filter((x) => !picks.some((o) => o.key === x.key)));
    if (failure) setError(failure);
    setBusy(null);
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

  return { campaign, error, busy, saving, stale, pending, setDraft, rename, importPhotos, generate, clearError: () => setError(null) };
};

export type CampaignState = ReturnType<typeof useCampaign>;
