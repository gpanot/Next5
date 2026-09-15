// server-only — never import from a 'use client' file.

import type { BatchItem } from '@prisma/client';
import { prisma } from '../../lib/db';
import { isTerminal, pollTask } from '../../lib/wavespeed';
import { getObject } from '../storage/objectStore';
import { failItem, finalizeItem } from './finalize';
import { mockSampleImage } from './labeling';
import { pump } from './pump';

const RUN_TIMEOUT_MS = 5 * 60 * 1000;
const SUBMITTING_STALE_MS = 2 * 60 * 1000;
const mockDelayMs = (): number => Number(process.env.NEXT5_MOCK_GENERATION_DELAY_MS ?? 2_500);

const download = async (url: string): Promise<Buffer> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
};

/** Mock mode: after a short delay, "generates" by reusing the first product/identity input (or a sample). */
const pollMock = async (item: BatchItem): Promise<void> => {
  if (Date.now() - (item.submittedAt?.getTime() ?? 0) < mockDelayMs()) return;
  const productKey = item.productId ? item.inputR2Keys[item.inputR2Keys.length - 1] : item.inputR2Keys[0];
  const source = productKey ? await getObject(productKey) : null;
  const ratio = item.format === 'story_9_16' ? '9:16' : item.format === 'square_1_1' ? '1:1' : '4:5';
  await finalizeItem(item, source ?? (await mockSampleImage('Sample photo', ratio)));
};

const pollOne = async (item: BatchItem): Promise<void> => {
  if (!item.wavespeedTaskId) return failItem(item, 'Missing task id');
  if (item.wavespeedTaskId.startsWith('mock:')) return pollMock(item);

  const result = await pollTask(item.wavespeedTaskId);
  if (result.status === 'completed' && result.url) return finalizeItem(item, await download(result.url));
  if (isTerminal(result.status)) return failItem(item, result.error ?? `Generation ${result.status}`);
  if (Date.now() - (item.submittedAt?.getTime() ?? 0) > RUN_TIMEOUT_MS) return failItem(item, 'Generation timed out');
};

/** Polls in-flight items and finalizes or fails them. Returns how many items were checked. */
export const poll = async (options: { batchId?: string; limit?: number; submittedBefore?: Date } = {}): Promise<number> => {
  const where = options.batchId ? { batchId: options.batchId } : {};
  // Recover items stuck in 'submitting' (e.g. the function was killed mid-submit).
  await prisma.batchItem.updateMany({
    where: { ...where, status: 'submitting', submittedAt: { lt: new Date(Date.now() - SUBMITTING_STALE_MS) } },
    data: { status: 'queued' },
  });

  const items = await prisma.batchItem.findMany({
    where: { ...where, status: 'generating', ...(options.submittedBefore ? { submittedAt: { lt: options.submittedBefore } } : {}) },
    orderBy: { submittedAt: 'asc' },
    take: options.limit ?? 50,
  });
  await Promise.all(
    items.map((item) =>
      pollOne(item).catch((err: unknown) => console.error(`[poll] item ${item.id}:`, err)),
    ),
  );
  return items.length;
};

/** A webhook normally arrives in under a minute; tasks silent for longer are polled directly. */
export const WEBHOOK_SILENCE_MS = 3 * 60 * 1000;

/** Safety net for lost webhooks: polls long-silent tasks (any batch). Cheap when there are none. */
export const sweepStale = async (now = Date.now()): Promise<number> =>
  poll({ submittedBefore: new Date(now - WEBHOOK_SILENCE_MS), limit: 10 });

/** Pump + poll with a time budget — used by the batch GET route and the cron. */
export const runGenerationTick = async (options: { batchId?: string; budgetMs: number }): Promise<void> => {
  const work = (async () => {
    await poll({ batchId: options.batchId });
    // Long-silent tasks from any batch hold global slots; recover them so this batch isn't stuck behind them.
    if (options.batchId) await sweepStale();
    await pump({ batchId: options.batchId });
  })();
  await Promise.race([work, new Promise((resolve) => setTimeout(resolve, options.budgetMs))]);
};
