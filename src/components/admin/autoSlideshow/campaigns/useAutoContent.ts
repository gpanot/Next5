'use client';

import { useCallback, useState } from 'react';
import { type AutoContentDto, type AutoContentRequest, type AutoPhotoRequest, type AutoPhotoSource, type CampaignCard, type CampaignPhotoRef, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';
import type { CampaignState, PhotoJob } from './useCampaign';

export type AutoSettings = AutoContentRequest;

/** The slide count is not a setting: the server takes the hook's number, or the writer picks 3-15. */
const START_SETTINGS: AutoSettings = {
  prompt: '',
  format: 'plain',
  length: 'medium',
  tone: 'plain',
  research: false,
  samePhoto: false,
  photoSource: 'ai',
};

/** The library photo matched to slide `i` (or to the shared photo), when stock photos found one. */
const libraryRef = (written: AutoContentDto, i: number | null): CampaignPhotoRef | null => (i === null ? written.coverRef : written.libraryRefs[i] ?? null);

/** The photo request of content slide `i` (or the shared photo when `i` is null). */
const photoRequest = (written: AutoContentDto, source: AutoPhotoSource, i: number | null): AutoPhotoRequest =>
  source === 'stock'
    ? { source: 'stock', query: i === null ? written.coverQuery : written.queries[i]!, nth: i ?? 0 }
    : { source: 'ai', scene: i === null ? written.coverScene : written.scenes[i]! };

/**
 * The Content tab's "Auto": writes the content slides from the prompt (in the hook lines' context), replaces the
 * content cards with them (the CTA stays), then adds their photos one by one, each shown on its slide as it lands.
 */
export const useAutoContent = (token: string, campaignId: string, state: CampaignState) => {
  const draft = state.campaign?.draft;
  const [settings, setSettings] = useState<AutoSettings>(START_SETTINGS);
  const [writing, setWriting] = useState(false);
  const base = `/api/slideshow/campaigns/${campaignId}`;

  const update = useCallback((patch: Partial<AutoSettings>) => setSettings((s) => ({ ...s, ...patch })), []);

  const photoJobs = useCallback((written: AutoContentDto, s: AutoSettings): PhotoJob[] => {
    const post = async (path: string, body: unknown) => (await adminFetch<{ photo: CampaignPhotoDto }>(token, `${base}/${path}`, { method: 'POST', body: JSON.stringify(body) })).photo;
    // A matched brand or shared photo is imported like a pick; otherwise the photo is made (AI) or found on Unsplash.
    const load = (i: number | null) => {
      const ref = s.photoSource === 'stock' ? libraryRef(written, i) : null;
      return ref ? () => post('photos', { ref }) : () => post('auto-photo', photoRequest(written, s.photoSource, i));
    };
    const stamp = Date.now().toString(36);
    if (s.samePhoto) {
      const cards = written.titles.map((_, i) => i);
      return [{ key: `auto-${stamp}-all`, thumbUrl: null, target: { slot: 'cards', cards }, load: load(null) }];
    }
    return written.titles.map((_, i) => ({ key: `auto-${stamp}-${i}`, thumbUrl: null, target: { slot: 'card', card: i }, load: load(i) }));
  }, [token, base]);

  /** Writes and places the slides; resolves true once the text is on the cards (photos keep coming in). */
  const run = useCallback(async (): Promise<boolean> => {
    if (!draft) return false;
    setWriting(true);
    state.setError(null);
    try {
      const written = await adminFetch<AutoContentDto>(token, `${base}/auto`, { method: 'POST', body: JSON.stringify({ ...settings, hooks: draft.hooks }) });
      state.setDraft((d) => ({
        ...d,
        cards: [...written.titles.map((title): CampaignCard => ({ role: 'item', title, body: '', photo: null })), d.cards[d.cards.length - 1]!],
      }));
      void state.addPhotos(photoJobs(written, settings));
      return true;
    } catch (err) {
      state.setError(err instanceof Error ? err.message : 'Could not write the slides');
      return false;
    } finally {
      setWriting(false);
    }
  }, [draft, settings, token, base, state, photoJobs]);

  return { settings, update, writing, run };
};
