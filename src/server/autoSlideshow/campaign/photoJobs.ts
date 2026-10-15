// server-only — never import from a 'use client' file.
// The Content tab's "Auto" photos, made on the server in the background: the editor asks once, then may close. Each
// job's state lives in the run's `photo_jobs` column (never in the draft, so draft saves cannot overwrite it); the
// editor reads it, puts each finished photo on its cards and clears the job.

import { HttpError } from '../../http';
import { prisma } from '../../../lib/db';
import { MAX_CAMPAIGN_CONTENT, type CampaignPhotoJobDto, type CampaignPhotoJobRequest } from '../../../types/admin/slideshowCampaign';
import { autoPhoto, importPhoto, parseAutoPhoto, parsePhotoRef } from './photos';

/** Photos made at once per request. */
const PARALLEL = 4;
/** Most photos one request may ask for (one per content slide, at most). */
const MAX_JOBS = MAX_CAMPAIGN_CONTENT;

/** The jobs a client sent, cleaned; a bad one fails the request. */
export const parsePhotoJobs = (v: unknown): CampaignPhotoJobRequest[] => {
  const list = Array.isArray(v) ? v.slice(0, MAX_JOBS) : [];
  if (list.length === 0) throw new HttpError(400, 'bad_jobs', 'No photos to make.');
  return list.map((raw): CampaignPhotoJobRequest => {
    const j = (raw ?? {}) as Record<string, unknown>;
    const key = typeof j.key === 'string' ? j.key.slice(0, 64) : '';
    const cards = Array.isArray(j.cards) ? j.cards.filter((c): c is number => Number.isInteger(c) && c >= 0 && c < MAX_CAMPAIGN_CONTENT + 1) : [];
    if (!key || cards.length === 0) throw new HttpError(400, 'bad_jobs', 'A photo has no slide.');
    return j.ref !== undefined ? { key, cards, ref: parsePhotoRef(j.ref) } : { key, cards, auto: parseAutoPhoto(j.auto) };
  });
};

/** Merges `patch` into job `key`, in one statement (jobs land in parallel). */
const setJob = async (runId: string, key: string, patch: Partial<CampaignPhotoJobDto>) => {
  await prisma.$executeRaw`
    UPDATE public.auto_slideshow_runs
    SET photo_jobs = (SELECT COALESCE(jsonb_agg(CASE WHEN j->>'key' = ${key} THEN j || ${JSON.stringify(patch)}::jsonb ELSE j END), '[]'::jsonb) FROM jsonb_array_elements(COALESCE(photo_jobs, '[]'::jsonb)) j)
    WHERE id = ${runId}`;
};

/** Makes one job's photo and records how it went. */
const runJob = async (runId: string, workspaceId: string, job: CampaignPhotoJobRequest) => {
  try {
    const { photo, detect } = 'ref' in job ? await importPhoto(runId, workspaceId, job.ref) : await autoPhoto(runId, job.auto);
    await setJob(runId, job.key, { status: 'done', photo: photo.index });
    await detect().catch(() => undefined);
  } catch (err) {
    await setJob(runId, job.key, { status: 'failed', error: err instanceof Error ? err.message.slice(0, 200) : 'Could not add that photo' });
  }
};

/** Records the jobs as running, then returns the work that makes them (for waitUntil), a few at a time. */
export const startPhotoJobs = async (runId: string, workspaceId: string, jobs: CampaignPhotoJobRequest[]): Promise<() => Promise<void>> => {
  const now = new Date().toISOString();
  const rows: Array<CampaignPhotoJobDto & { startedAt: string }> = jobs.map((j) => ({ key: j.key, cards: j.cards, status: 'running', photo: null, error: null, startedAt: now }));
  await prisma.$executeRaw`
    UPDATE public.auto_slideshow_runs
    SET photo_jobs = COALESCE(photo_jobs, '[]'::jsonb) || ${JSON.stringify(rows)}::jsonb
    WHERE id = ${runId}`;
  return async () => {
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) await runJob(runId, workspaceId, jobs[next++]!);
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, jobs.length) }, worker));
  };
};

/** Drops jobs the editor has put on their cards (or shown as failed). */
export const clearPhotoJobs = async (runId: string, keys: string[]) => {
  if (keys.length === 0) return;
  await prisma.$executeRaw`
    UPDATE public.auto_slideshow_runs
    SET photo_jobs = (SELECT COALESCE(jsonb_agg(j), '[]'::jsonb) FROM jsonb_array_elements(COALESCE(photo_jobs, '[]'::jsonb)) j WHERE NOT (j->>'key' = ANY(${keys}::text[])))
    WHERE id = ${runId}`;
};
