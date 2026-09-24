// server-only — never import from a 'use client' file.

import type { BatchItem } from '@prisma/client';
import { generationMaxConcurrent } from '../../config/business';
import { FORMATS, isFormatId } from '../../config/formats';
import { prisma } from '../../lib/db';
import { isMockGeneration } from '../../lib/mock';
import { GEMINI_PRO_IMAGE, GEMINI_PRO_IMAGE_USD_MICROS, isReapiRatio, submitGeminiImage } from '../../lib/reapiImage';
import { costUsdMicros, isImageModel, submitEdit, uploadPhotoToWaveSpeed } from '../../lib/wavespeed';
import { getObject, presignObject } from '../storage/objectStore';
import { failItem } from './finalize';
import { generationWebhookUrl } from './webhookUrl';

const URL_CACHE_MS = 24 * 60 * 60 * 1000;

/** reAPI allows 10 tasks in flight per key; keep headroom for the wizard portrait and scripts. */
const REAPI_MAX_IN_FLIGHT = 8;

/** Atomically claims queued items (highest batch priority first). Safe under concurrent pumps. */
const claimQueued = async (limit: number, batchId: string | undefined, allowReapi: boolean): Promise<string[]> => {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE batch_items SET status = 'submitting', submitted_at = (now() AT TIME ZONE 'UTC'), attempts = attempts + 1
    WHERE id IN (
      SELECT bi.id FROM batch_items bi JOIN batches b ON b.id = bi.batch_id
      WHERE bi.status = 'queued' AND (${batchId ?? null}::text IS NULL OR bi.batch_id = ${batchId ?? null})
        AND (${allowReapi} OR bi.model IS DISTINCT FROM ${GEMINI_PRO_IMAGE})
      ORDER BY b.priority, bi.created_at
      LIMIT ${limit}
      FOR UPDATE OF bi SKIP LOCKED
    )
    RETURNING id`;
  return rows.map((row) => row.id);
};

/** WaveSpeed URL for a stored input, reusing cached identity uploads for 24 h. */
const waveSpeedUrlFor = async (key: string): Promise<string> => {
  const ref = await prisma.identityReference.findFirst({ where: { r2Key: key }, select: { id: true, wavespeedUrl: true, wavespeedUrlAt: true } });
  if (ref?.wavespeedUrl && ref.wavespeedUrlAt && Date.now() - ref.wavespeedUrlAt.getTime() < URL_CACHE_MS) return ref.wavespeedUrl;

  const buffer = await getObject(key);
  if (!buffer) throw new Error(`Input image missing: ${key}`);
  const url = await uploadPhotoToWaveSpeed(buffer);
  if (ref) await prisma.identityReference.update({ where: { id: ref.id }, data: { wavespeedUrl: url, wavespeedUrlAt: new Date() } });
  return url;
};

/** reAPI needs public HTTPS inputs: a presigned R2 URL, or (local storage) a WaveSpeed upload. */
const publicUrlFor = async (key: string): Promise<string> => {
  const signed = await presignObject(key);
  return signed?.startsWith('https://') ? signed : waveSpeedUrlFor(key);
};

/** Gemini 3 Pro Image on reAPI (influencer photos). Returns the prefixed task id and its estimated cost. */
const submitGemini = async (item: BatchItem, highRes: boolean): Promise<{ taskId: string; cost: number }> => {
  const imageUrls = await Promise.all(item.inputR2Keys.map(publicUrlFor));
  const ratio = isFormatId(item.format) ? FORMATS[item.format].ratio : '9:16';
  const taskId = await submitGeminiImage({ prompt: item.prompt, imageUrls, ratio: isReapiRatio(ratio) ? ratio : '9:16', resolution: highRes ? '2K' : '1K' });
  return { taskId, cost: GEMINI_PRO_IMAGE_USD_MICROS };
};

/** Nano Banana 2 (or the fallback model) on WaveSpeed; the result comes back by webhook. */
const submitWaveSpeed = async (item: BatchItem, highRes: boolean): Promise<{ taskId: string; cost: number }> => {
  const resolution = highRes ? '2k' : '1k';
  const model = isImageModel(item.model) ? item.model : 'nano-banana-2';
  const imageUrls = await Promise.all(item.inputR2Keys.map(waveSpeedUrlFor));
  const aspectRatio = isFormatId(item.format) ? FORMATS[item.format].ratio : '3:4';
  const taskId = await submitEdit({ model, imageUrls, prompt: item.prompt, aspectRatio, resolution, webhookUrl: generationWebhookUrl() });
  return { taskId, cost: costUsdMicros(model, resolution, item.inputR2Keys.length) };
};

const submitItem = async (item: BatchItem): Promise<void> => {
  const batch = await prisma.batch.findUniqueOrThrow({ where: { id: item.batchId }, select: { highRes: true } });
  const isMock = isMockGeneration();
  const provider = isMock ? 'mock' : item.model === GEMINI_PRO_IMAGE ? 'gemini-reapi' : 'wavespeed';
  console.log(`[pump] submitting item ${item.id} via ${provider} (model=${item.model ?? 'nano-banana-2'}, inputs=${item.inputR2Keys.length}, format=${item.format})`);
  try {
    const { taskId, cost } = isMock
      ? { taskId: `mock:${item.id}:${Date.now()}`, cost: 0 }
      : item.model === GEMINI_PRO_IMAGE ? await submitGemini(item, batch.highRes) : await submitWaveSpeed(item, batch.highRes);
    console.log(`[pump] item ${item.id} submitted → taskId=${taskId}`);
    await prisma.batchItem.update({ where: { id: item.id }, data: { status: 'generating', wavespeedTaskId: taskId } });
    await prisma.batch.update({
      where: { id: item.batchId },
      data: { costUsdMicros: { increment: cost }, status: 'generating' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submit failed';
    console.error(`[pump] item ${item.id} submit failed via ${provider}: ${message}`);
    // Provider busy (reAPI's in-flight cap): back in the queue without spending an attempt.
    if (message.includes('(429)')) return requeue(item.id);
    await failItem(item, message);
  }
};

const requeue = async (id: string): Promise<void> => {
  await prisma.batchItem.updateMany({ where: { id, status: 'submitting' }, data: { status: 'queued', attempts: { decrement: 1 } } });
};

/** Submits queued items up to the global concurrency limit. Returns how many were submitted. */
export const pump = async (options: { batchId?: string } = {}): Promise<number> => {
  const inFlight = await prisma.batchItem.count({ where: { status: { in: ['submitting', 'generating'] } } });
  const slots = generationMaxConcurrent() - inFlight;
  if (slots <= 0) return 0;

  const reapiSlots = REAPI_MAX_IN_FLIGHT - (await prisma.batchItem.count({ where: { status: { in: ['submitting', 'generating'] }, model: GEMINI_PRO_IMAGE } }));
  const ids = await claimQueued(slots, options.batchId, reapiSlots > 0);
  if (ids.length === 0) return 0;
  const claimed = await prisma.batchItem.findMany({ where: { id: { in: ids } } });
  // More Gemini items than reAPI has room for: hand the extra back to the queue.
  const gemini = claimed.filter((i) => i.model === GEMINI_PRO_IMAGE);
  const overflow = new Set(gemini.slice(Math.max(0, reapiSlots)).map((i) => i.id));
  await Promise.all([...overflow].map(requeue));
  const items = claimed.filter((i) => !overflow.has(i.id));
  await Promise.all(items.map(submitItem));
  return items.length;
};
