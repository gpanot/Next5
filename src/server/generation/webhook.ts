// server-only — never import from a 'use client' file.
// WaveSpeed webhooks drive business generation (no cron): https://wavespeed.ai/docs/how-to-use-webhooks

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BatchItem } from '@prisma/client';
import { prisma } from '../../lib/db';
import { failItem, finalizeItem } from './finalize';
import { sweepStale } from './poll';
import { pump } from './pump';

export const WEBHOOK_MAX_AGE_S = 300;

export type WaveSpeedWebhookPayload = {
  id: string;
  status: 'completed' | 'failed' | 'cancelled' | 'timeout' | 'deleted' | string;
  outputs?: string[];
  error?: string;
};

export type SignatureHeaders = { id: string; timestamp: string; signature: string };

/**
 * HMAC-SHA256 over "{webhook-id}.{webhook-timestamp}.{raw body}", key = secret without the `whsec_` prefix
 * (not base64-decoded), header "v3,<hex>". Rejects timestamps older than 5 minutes.
 */
export const verifyWaveSpeedSignature = (rawBody: string, headers: SignatureHeaders, secret: string, nowS = Date.now() / 1000): boolean => {
  const ts = Number.parseInt(headers.timestamp, 10);
  if (!headers.id || !Number.isFinite(ts) || Math.abs(nowS - ts) > WEBHOOK_MAX_AGE_S) return false;
  const [version, received] = headers.signature.split(',');
  if (version !== 'v3' || !received || !/^[0-9a-f]{64}$/i.test(received)) return false;
  const key = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const expected = createHmac('sha256', key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest('hex');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The task id is saved right after submit returns; a very fast callback can beat it, so look a few times. */
const findInFlightItem = async (taskId: string, retryDelaysMs: readonly number[]): Promise<BatchItem | null> => {
  for (const delay of [0, ...retryDelaysMs]) {
    if (delay) await sleep(delay);
    const item = await prisma.batchItem.findFirst({ where: { wavespeedTaskId: taskId } });
    if (item) return item.status === 'generating' ? item : null; // already finished, retried or cancelled
  }
  return null; // not ours (consumer task) or never saved — the stale sweep recovers the latter
};

const download = async (url: string): Promise<Buffer> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
};

/**
 * Finalizes or fails the item for a WaveSpeed callback, then keeps every queue moving:
 * frees slots go to the highest-priority queued items (any batch) and long-silent tasks are re-polled.
 * Idempotent — duplicate deliveries find the item no longer generating.
 */
export const handleWaveSpeedWebhook = async (payload: WaveSpeedWebhookPayload, options: { retryDelaysMs?: readonly number[] } = {}): Promise<'handled' | 'ignored'> => {
  const item = await findInFlightItem(payload.id, options.retryDelaysMs ?? [1_500, 3_000, 5_000]);
  if (item) {
    const output = payload.outputs?.[0];
    try {
      if (payload.status === 'completed' && output) await finalizeItem(item, await download(output));
      else await failItem(item, payload.error || `Generation ${payload.status}`);
    } catch (err) {
      await failItem(item, err instanceof Error ? err.message : 'Webhook processing failed');
    }
  }
  await pump();
  await sweepStale();
  return item ? 'handled' : 'ignored';
};
