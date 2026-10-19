'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cardPhotos, renderKeyOf, targetsCard, withCardPhotos, type CampaignDraft, type CampaignDto, type CampaignPhotoDto, type CampaignPhotoJobDto, type CampaignPhotoJobRequest, type CampaignPhotoTarget, type PhotoOptionDto } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';

/** Typing settles this long before the draft is saved. */
const SAVE_DELAY_MS = 700;
/** Photos copied into the campaign at once. */
const IMPORT_PARALLEL = 4;
/** How often the editor reads the campaign while the server makes Auto photos. */
const JOB_POLL_MS = 3000;

/** A background Auto photo still being made, shown on its slides like an import. */
const jobPending = (job: CampaignPhotoJobDto): PendingPhoto => ({ key: job.key, thumbUrl: null, target: { slot: 'cards', cards: job.cards } });

/** A pick being copied in: shown at once from the picker's thumb (none for a photo still being made), on its slide. */
export type PendingPhoto = { key: string; thumbUrl: string | null; target: CampaignPhotoTarget };

/** One photo to add: how to get it into the campaign, and the slide(s) it goes on. */
export type PhotoJob = PendingPhoto & { load: () => Promise<CampaignPhotoDto> };

/** The campaign's photos with new ones set at their index (imports can land in any order). */
const withPhotos = (photos: CampaignPhotoDto[], added: CampaignPhotoDto[]): CampaignPhotoDto[] => {
  const next = [...photos];
  for (const p of added) next[p.index] = p;
  return Array.from({ length: next.length }, (_, i) => next[i] ?? { index: i, url: null, fullUrl: null, source: 'generated', credit: null });
};

/** Imports that join a rotation: they land together, in pick order, once all are in. */
const isRotation = (target: CampaignPhotoTarget) => target.slot === 'hook' || target.slot === 'cardRotation';

/** Puts imported photos on their slide: hook photos and a card's rotation photos join the rotation (or a picked hook
 *  photo is replaced), a card's photo is replaced by the last one. */
const placePhotos = (draft: CampaignDraft, target: CampaignPhotoTarget, indexes: number[]): CampaignDraft => {
  if (indexes.length === 0) return draft;
  if (target.slot === 'hook' && target.replace !== undefined && target.replace < draft.hookPhotos.length) {
    return { ...draft, hookPhotos: draft.hookPhotos.map((p, i) => (i === target.replace ? indexes[indexes.length - 1]! : p)) };
  }
  if (target.slot === 'hook') return { ...draft, hookPhotos: [...draft.hookPhotos, ...indexes] };
  if (target.slot === 'cardRotation') return { ...draft, cards: draft.cards.map((c, i) => (i === target.card ? withCardPhotos(c, [...cardPhotos(c), ...indexes]) : c)) };
  return { ...draft, cards: draft.cards.map((c, i) => (targetsCard(target, i) ? { ...c, photo: indexes[indexes.length - 1]! } : c)) };
};

/**
 * One campaign in the editor: loaded once, then the draft lives here and is saved (debounced) as it changes. Photo
 * imports show at once and land on their slide when copied in. `stale`: the slides changed since the slideshows were
 * made (or none were made), so Schedule renders them first.
 */
export const useCampaign = (token: string, id: string) => {
  const base = `/api/slideshow/campaigns/${id}`;
  const [campaign, setCampaign] = useState<CampaignDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'import' | 'generate' | null>(null);
  const [saving, setSaving] = useState(false);
  /** Render key of the draft the slideshows were made from; null when none are current. */
  const [madeKey, setMadeKey] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsaved = useRef<CampaignDraft | null>(null);
  /** Background jobs already put on their cards (or shown as failed), so each lands once. */
  const appliedJobs = useRef(new Set<string>());

  useEffect(() => {
    let live = true;
    adminFetch<{ campaign: CampaignDto }>(token, base)
      .then((res) => {
        if (!live) return;
        setCampaign(res.campaign);
        setMadeKey(res.campaign.rendered ? renderKeyOf(res.campaign.draft) : null);
      })
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
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush]);

  const rename = useCallback(async (name: string) => {
    setCampaign((c) => (c ? { ...c, name } : c));
    await adminFetch(token, base, { method: 'PATCH', body: JSON.stringify({ name }) }).catch((err: Error) => setError(err.message));
  }, [token, base]);

  /**
   * Adds the photos, a few at a time, each shown at once (from its picker thumb, or as a spinner while made). A picked
   * set lands on its slide in pick order once all are in (that order is the hook rotation); a job for its own slide
   * lands as soon as it is in. A failed job is left out and its error shown.
   */
  const addPhotos = useCallback(async (jobs: PhotoJob[]) => {
    setBusy('import');
    setError(null);
    setPending((p) => [...p, ...jobs.map(({ key, thumbUrl, target }) => ({ key, thumbUrl, target }))]);
    const results: Array<CampaignPhotoDto | null> = new Array(jobs.length).fill(null);
    let failure: string | null = null;
    let next = 0;
    const land = (job: PhotoJob, photo: CampaignPhotoDto) => {
      setCampaign((c) => (c ? { ...c, photos: withPhotos(c.photos, [photo]) } : c));
      setDraft((d) => placePhotos(d, job.target, [photo.index]));
      setPending((p) => p.filter((x) => x.key !== job.key));
    };
    const worker = async () => {
      while (next < jobs.length) {
        const i = next++;
        const job = jobs[i]!;
        try {
          results[i] = await job.load();
          if (!isRotation(job.target)) land(job, results[i]!);
        } catch (err) {
          failure ??= err instanceof Error ? err.message : 'Could not add that photo';
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(IMPORT_PARALLEL, jobs.length) }, worker));
    // One picker set shares one target: its rotation photos land together, in pick order.
    const rotationJobs = jobs.map((job, i) => ({ job, photo: results[i] })).filter((x) => isRotation(x.job.target));
    const added = rotationJobs.flatMap((x) => (x.photo ? [x.photo] : []));
    if (rotationJobs.length > 0) {
      const target = rotationJobs[0]!.job.target;
      setCampaign((c) => (c ? { ...c, photos: withPhotos(c.photos, added) } : c));
      setDraft((d) => placePhotos(d, target, added.map((p) => p.index)));
    }
    setPending((p) => p.filter((x) => !jobs.some((j) => j.key === x.key)));
    if (failure) setError(failure);
    setBusy(null);
  }, [setDraft]);

  /** Asks the server to make Auto photos in the background: they keep coming when the editor is closed. */
  const startPhotoJobs = useCallback(async (jobs: CampaignPhotoJobRequest[]) => {
    try {
      await adminFetch(token, `${base}/auto-photos`, { method: 'POST', body: JSON.stringify({ jobs }) });
      const running = jobs.map(({ key, cards }): CampaignPhotoJobDto => ({ key, cards, status: 'running', photo: null, error: null }));
      setCampaign((c) => (c ? { ...c, photoJobs: [...c.photoJobs, ...running] } : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the photos');
    }
  }, [token, base]);

  const jobs = campaign?.photoJobs;
  // Finished jobs (now, or while the editor was closed) land on their cards once, then are cleared on the server.
  useEffect(() => {
    const finished = (jobs ?? []).filter((j) => j.status !== 'running' && !appliedJobs.current.has(j.key));
    if (finished.length === 0) return;
    for (const job of finished) {
      appliedJobs.current.add(job.key);
      if (job.status === 'done' && job.photo !== null) setDraft((d) => placePhotos(d, { slot: 'cards', cards: job.cards.filter((i) => i < d.cards.length) }, [job.photo!]));
      else setError(job.error ?? 'Could not add that photo');
    }
    const keys = new Set(finished.map((j) => j.key));
    setCampaign((c) => (c ? { ...c, photoJobs: c.photoJobs.filter((j) => !keys.has(j.key)) } : c));
    void adminFetch(token, `${base}/auto-photos?keys=${encodeURIComponent([...keys].join(','))}`, { method: 'DELETE' }).catch(() => undefined);
  }, [jobs, setDraft, token, base]);

  const running = (jobs ?? []).some((j) => j.status === 'running');
  // While photos are made, read the campaign now and then: its photos and jobs, keeping the draft being edited.
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      void adminFetch<{ campaign: CampaignDto }>(token, base)
        .then((res) => setCampaign((c) => (c ? { ...res.campaign, draft: c.draft } : res.campaign)))
        .catch(() => undefined);
    }, JOB_POLL_MS);
    return () => clearInterval(tick);
  }, [running, token, base]);

  /** Copies picker picks in (see addPhotos). */
  const importPhotos = useCallback((picks: PhotoOptionDto[], target: CampaignPhotoTarget) =>
    addPhotos(picks.map((o) => ({
      key: o.key,
      thumbUrl: o.thumbUrl,
      target,
      load: async () => (await adminFetch<{ photo: CampaignPhotoDto }>(token, `${base}/photos`, { method: 'POST', body: JSON.stringify({ ref: o.ref }) })).photo,
    }))), [token, base, addPhotos]);

  /** Schedule's first step: the slideshows made from the draft as it is (rendered only when it changed). */
  const prepare = useCallback(async (): Promise<CampaignDto | null> => {
    await flush();
    setBusy('generate');
    setError(null);
    try {
      const res = await adminFetch<{ campaign: CampaignDto }>(token, `${base}/generate`, { method: 'POST', body: '{}' });
      setCampaign((c) => (c ? { ...res.campaign, draft: c.draft } : res.campaign));
      setMadeKey(renderKeyOf(res.campaign.draft));
      return res.campaign;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make the slideshows');
      return null;
    } finally {
      setBusy(null);
    }
  }, [token, base, flush]);

  /** Reads the campaign again (its slideshows' posts), keeping the draft being edited. */
  const reload = useCallback(async () => {
    const res = await adminFetch<{ campaign: CampaignDto }>(token, base).catch(() => null);
    if (res) setCampaign((c) => (c ? { ...res.campaign, draft: c.draft } : res.campaign));
  }, [token, base]);

  const stale = !campaign || madeKey === null || renderKeyOf(campaign.draft) !== madeKey;

  const shown = [...pending, ...(jobs ?? []).filter((j) => j.status === 'running').map(jobPending)];

  return { campaign, error, busy, saving, stale, pending: shown, setDraft, startPhotoJobs, setError, rename, addPhotos, importPhotos, prepare, reload, clearError: () => setError(null) };
};

export type CampaignState = ReturnType<typeof useCampaign>;
