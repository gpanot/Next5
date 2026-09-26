// server-only — never import from a 'use client' file.

import type { BatchItem } from '@prisma/client';
import { prisma } from '../../lib/db';
import { isReapiTaskId, pollGeminiImage, REAPI_TASK_PREFIX } from '../../lib/reapiImage';
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

/** Mock mode: after a short delay, "generates" by reusing the product input (shop) or a placeholder (brand/property). */
const pollMock = async (item: BatchItem): Promise<void> => {
  const elapsed = Date.now() - (item.submittedAt?.getTime() ?? 0);
  const delay = mockDelayMs();
  if (elapsed < delay) {
    console.log(`[mock] item ${item.id} not ready yet (${elapsed}ms / ${delay}ms delay)`);
    return;
  }
  const ratio = item.format === 'story_9_16' ? '9:16' : item.format === 'square_1_1' ? '1:1' : '4:5';
  // Shop: reuse the last input key (the product photo) so compare-grid is meaningful.
  // Brand/property: never use inputR2Keys[0] — that's the influencer portrait and would look
  // like no generation happened. Always render a labelled mock placeholder instead.
  if (item.productId) {
    const productKey = item.inputR2Keys[item.inputR2Keys.length - 1];
    const source = productKey ? await getObject(productKey) : null;
    console.log(`[mock] item ${item.id} (shop) → product input as placeholder`);
    await finalizeItem(item, source ?? (await mockSampleImage('Sample photo', ratio)));
  } else {
    // Brand / property: generate a visually distinct mock image so it is clear the generation ran.
    const label = item.model ? 'Gemini · mock' : 'AI · mock';
    console.log(`[mock] item ${item.id} (brand/property, model=${item.model ?? 'nano-banana-2'}) → mock placeholder "${label}"`);
    await finalizeItem(item, await mockSampleImage(label, ratio));
  }
};

const pollOne = async (item: BatchItem): Promise<void> => {
  if (!item.wavespeedTaskId) return failItem(item, 'Missing task id');
  if (item.wavespeedTaskId.startsWith('mock:')) return pollMock(item);

  const result = isReapiTaskId(item.wavespeedTaskId) ? await pollGeminiImage(item.wavespeedTaskId) : await pollTask(item.wavespeedTaskId);
  if (result.status === 'completed' && result.url) return finalizeItem(item, await download(result.url));
  if (isTerminal(result.status)) return failItem(item, result.error ?? `Generation ${result.status}`);
  if (Date.now() - (item.submittedAt?.getTime() ?? 0) > RUN_TIMEOUT_MS) return failItem(item, 'Generation timed out');
};

/** Polls in-flight items and finalizes or fails them. Returns how many items were checked. */
export const poll = async (options: { batchId?: string; limit?: number; submittedBefore?: Date; reapiOnly?: boolean } = {}): Promise<number> => {
  const where = options.batchId ? { batchId: options.batchId } : {};
  // Recover items stuck in 'submitting' (e.g. the function was killed mid-submit).
  await prisma.batchItem.updateMany({
    where: { ...where, status: 'submitting', submittedAt: { lt: new Date(Date.now() - SUBMITTING_STALE_MS) } },
    data: { status: 'queued' },
  });

  const items = await prisma.batchItem.findMany({
    where: {
      ...where,
      status: 'generating',
      ...(options.submittedBefore ? { submittedAt: { lt: options.submittedBefore } } : {}),
      ...(options.reapiOnly ? { wavespeedTaskId: { startsWith: REAPI_TASK_PREFIX } } : {}),
    },
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
/** reAPI (Gemini) sends no webhook; a 1K image takes 30–60 s, so its tasks are polled once past this. */
export const REAPI_FIRST_POLL_MS = 30 * 1000;

/** Safety net for lost webhooks: polls long-silent tasks (any batch), plus reAPI tasks, which never call back. */
export const sweepStale = async (now = Date.now()): Promise<number> => {
  const [stale, reapi] = await Promise.all([
    poll({ submittedBefore: new Date(now - WEBHOOK_SILENCE_MS), limit: 10 }),
    poll({ submittedBefore: new Date(now - REAPI_FIRST_POLL_MS), limit: 10, reapiOnly: true }),
  ]);
  return stale + reapi;
};

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

/**
 * Free previews and pose sheets live on pages that never open a batch page, so nothing else would poll them
 * (and locally, provider webhooks can't reach us). Moves this workspace's in-flight previews forward:
 * finalizes finished photos, times out silent ones (then one automatic retry), and submits queued ones.
 */
export const tickWorkspacePreviews = async (workspaceId: string, budgetMs = 4_000): Promise<void> => {
  const batches = await prisma.batch.findMany({ where: { workspaceId, preview: true, status: { in: ['queued', 'generating'] } }, select: { id: true } });
  if (batches.length === 0) return;
  await Promise.all(batches.map((b) => runGenerationTick({ batchId: b.id, budgetMs }).catch((err: unknown) => console.error(`[poll] preview tick ${b.id}:`, err))));
};
