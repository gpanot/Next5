'use client';

import { useCallback, useState } from 'react';
import { numberCards, stripNumber } from '../../../../types/admin/campaignNumbering';
import { autoSlideCount, CTA_PREFILL, isCtaPrefill, type AutoContentDto, type AutoContentRequest, type AutoPhotoRequest, type AutoPhotoSource, type CampaignCard, type CampaignCtaText, type CampaignPhotoJobRequest, type CampaignPhotoJobSource, type CampaignPhotoRef } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';
import type { CampaignState } from './useCampaign';

export type AutoSettings = AutoContentRequest;

/** "Generate the entire slideshows": hooks just written (not in the draft yet), the photo source it uses, and the CTA
 *  text for an empty CTA card (which also gets the cover photo when it has none). */
export type AutoRunOptions = { hooks?: string[]; photoSource?: AutoPhotoSource; cta?: CampaignCtaText };

/** The CTA card with `cta` written on it when it is empty (or still the prefill). */
const withCtaText = (card: CampaignCard, cta: CampaignCtaText): CampaignCard =>
  !stripNumber(card.title).trim() || isCtaPrefill(card.title) ? { ...card, title: cta.title, body: cta.body } : card;

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

/** The photo request of content slide `i` (or the shared photo when `i` is null). AI photos take the tone of campaign
 *  photo `tonePhoto` (the first hook photo) when there is one. */
const photoRequest = (written: AutoContentDto, source: AutoPhotoSource, i: number | null, tonePhoto: number | undefined): AutoPhotoRequest =>
  source === 'stock'
    ? { source: 'stock', query: i === null ? written.coverQuery : written.queries[i]!, nth: i ?? 0 }
    : { source: 'ai', scene: i === null ? written.coverScene : written.scenes[i]!, ...(tonePhoto === undefined ? {} : { tonePhoto }) };

/**
 * The Content tab's "Auto": writes the content slides from the prompt (in the hook lines' context), replaces the
 * content cards with them (the CTA stays), then adds their photos one by one, each shown on its slide as it lands.
 */
export const useAutoContent = (token: string, campaignId: string, state: CampaignState) => {
  const draft = state.campaign?.draft;
  const [picked, setPicked] = useState<AutoSettings>(START_SETTINGS);
  /** Until the person picks a format, a hook with a number ("6 ways…") makes the slides Numbered. */
  const [formatPicked, setFormatPicked] = useState(false);
  const settingsFor = useCallback((hooks: string[]): AutoSettings => (formatPicked || autoSlideCount(hooks) === null ? picked : { ...picked, format: 'numbered' }), [formatPicked, picked]);
  const settings: AutoSettings = draft ? settingsFor(draft.hooks) : picked;
  const tonePhoto = draft?.hookPhotos[0];
  const [writing, setWriting] = useState(false);
  const base = `/api/slideshow/campaigns/${campaignId}`;

  const update = useCallback((patch: Partial<AutoSettings>) => {
    if (patch.format) setFormatPicked(true);
    setPicked((s) => ({ ...s, ...patch }));
  }, []);

  /** The photos to make on the server (they keep coming when the editor is closed). */
  const photoJobs = useCallback((written: AutoContentDto, s: AutoSettings, ctaPhoto: boolean): CampaignPhotoJobRequest[] => {
    // A matched brand or shared photo is copied in like a pick; otherwise the photo is made (AI) or found on Unsplash.
    const source = (i: number | null): CampaignPhotoJobSource => {
      const ref = s.photoSource === 'stock' ? libraryRef(written, i) : null;
      return ref ? { ref } : { auto: photoRequest(written, s.photoSource, i, tonePhoto) };
    };
    const stamp = Date.now().toString(36);
    // The CTA card sits right after the content slides; it takes the cover photo.
    const cta = written.titles.length;
    if (s.samePhoto) return [{ key: `auto-${stamp}-all`, cards: [...written.titles.map((_, i) => i), ...(ctaPhoto ? [cta] : [])], ...source(null) }];
    const items = written.titles.map((_, i) => ({ key: `auto-${stamp}-${i}`, cards: [i], ...source(i) }));
    // The CTA's own scene (the product in use) when the server wrote one; else the cover photo.
    const ctaSource: CampaignPhotoJobSource = written.ctaScene && s.photoSource === 'ai' ? { auto: { source: 'ai', scene: written.ctaScene, cta: true, ...(tonePhoto === undefined ? {} : { tonePhoto }) } } : source(null);
    return ctaPhoto ? [...items, { key: `auto-${stamp}-cta`, cards: [cta], ...ctaSource }] : items;
  }, [tonePhoto]);

  /** Writes and places the slides; resolves true once the text is on the cards (photos keep coming in). */
  const run = useCallback(async (options: AutoRunOptions = {}): Promise<boolean> => {
    if (!draft) return false;
    const hooks = options.hooks ?? draft.hooks;
    const settings = { ...settingsFor(hooks), ...(options.photoSource ? { photoSource: options.photoSource } : {}) };
    const lastCard = draft.cards[draft.cards.length - 1];
    const ctaPhoto = options.cta !== undefined && lastCard?.photo === null;
    // The CTA text its photo is written from: the card's own text, or the one about to be put on it.
    const ctaText = ctaPhoto && lastCard && options.cta ? withCtaText(lastCard, options.cta) : null;
    const cta = ctaText ? { title: stripNumber(ctaText.title).trim(), body: ctaText.body } : undefined;
    setWriting(true);
    state.setError(null);
    try {
      const written = await adminFetch<AutoContentDto>(token, `${base}/auto`, { method: 'POST', body: JSON.stringify({ ...settings, hooks, ...(cta ? { cta } : {}) }) });
      state.setDraft((d) => {
        const last = d.cards[d.cards.length - 1]!;
        const cta = options.cta ? withCtaText(last, options.cta) : last;
        // "6 ways…": an empty CTA is the 6th slide, so it gets text to edit (numbered "6. " below when Numbered).
        const prefill = autoSlideCount(d.hooks) !== null && !stripNumber(cta.title).trim();
        const cards = [...written.titles.map((title): CampaignCard => ({ role: 'item', title, body: '', photo: null })), prefill ? { ...cta, title: CTA_PREFILL } : cta];
        // Numbered: the CTA takes the hook's last number too ("6 ways…": slides 1-5, then the CTA as 6).
        return { ...d, cards: settings.format === 'numbered' ? numberCards({ hooks: d.hooks, cards }, true) : cards };
      });
      void state.startPhotoJobs(photoJobs(written, settings, ctaPhoto));
      return true;
    } catch (err) {
      state.setError(err instanceof Error ? err.message : 'Could not write the slides');
      return false;
    } finally {
      setWriting(false);
    }
  }, [draft, settingsFor, token, base, state, photoJobs]);

  return { settings, update, writing, run };
};
