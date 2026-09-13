// server-only — never import from a 'use client' file.

import type { BatchItem } from '@prisma/client';
import { GENERATION_MAX_CONCURRENT } from '../../config/business';
import { FORMATS, isFormatId } from '../../config/formats';
import { prisma } from '../../lib/db';
import { isMockGeneration } from '../../lib/mock';
import { COST_USD_MICROS, submitEdit, uploadPhotoToWaveSpeed } from '../../lib/wavespeed';
import { getObject } from '../storage/objectStore';
import { failItem } from './finalize';

const URL_CACHE_MS = 24 * 60 * 60 * 1000;

/** Atomically claims queued items (highest batch priority first). Safe under concurrent pumps. */
const claimQueued = async (limit: number, batchId?: string): Promise<string[]> => {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE batch_items SET status = 'submitting', submitted_at = (now() AT TIME ZONE 'UTC'), attempts = attempts + 1
    WHERE id IN (
      SELECT bi.id FROM batch_items bi JOIN batches b ON b.id = bi.batch_id
      WHERE bi.status = 'queued' AND (${batchId ?? null}::text IS NULL OR bi.batch_id = ${batchId ?? null})
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

const submitItem = async (item: BatchItem): Promise<void> => {
  const batch = await prisma.batch.findUniqueOrThrow({ where: { id: item.batchId }, select: { highRes: true } });
  const resolution = batch.highRes ? '2k' : '1k';
  try {
    let taskId: string;
    if (isMockGeneration()) {
      taskId = `mock:${item.id}:${Date.now()}`;
    } else {
      const imageUrls = await Promise.all(item.inputR2Keys.map(waveSpeedUrlFor));
      const aspectRatio = isFormatId(item.format) ? FORMATS[item.format].ratio : '3:4';
      taskId = await submitEdit({ imageUrls, prompt: item.prompt, aspectRatio, resolution });
    }
    await prisma.batchItem.update({ where: { id: item.id }, data: { status: 'generating', wavespeedTaskId: taskId } });
    await prisma.batch.update({
      where: { id: item.batchId },
      data: { costUsdMicros: { increment: isMockGeneration() ? 0 : COST_USD_MICROS[resolution] }, status: 'generating' },
    });
  } catch (err) {
    await failItem(item, err instanceof Error ? err.message : 'Submit failed');
  }
};

/** Submits queued items up to the global concurrency limit. Returns how many were submitted. */
export const pump = async (options: { batchId?: string } = {}): Promise<number> => {
  const inFlight = await prisma.batchItem.count({ where: { status: { in: ['submitting', 'generating'] } } });
  const slots = GENERATION_MAX_CONCURRENT - inFlight;
  if (slots <= 0) return 0;

  const ids = await claimQueued(slots, options.batchId);
  if (ids.length === 0) return 0;
  const items = await prisma.batchItem.findMany({ where: { id: { in: ids } } });
  await Promise.all(items.map(submitItem));
  return items.length;
};
