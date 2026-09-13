/**
 * WaveSpeed webhook receiver.
 *
 * WaveSpeed POSTs here when each generation task completes or fails.
 * We finalize (or fail) the batch item, then pump the next queued items.
 * This replaces the need for a cron or for the batch page to be open.
 *
 * Opt-in: set WAVESPEED_WEBHOOK_SECRET (from `GET /api/v3/webhook/secret`).
 * If the secret is absent, the endpoint still processes callbacks but skips
 * signature verification (safe for local dev, not recommended in production).
 *
 * Docs: https://wavespeed.ai/docs/how-to-use-webhooks
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { failItem, finalizeItem } from '../../../../src/server/generation/finalize';
import { pump } from '../../../../src/server/generation/pump';

// ── Signature verification ─────────────────────────────────────────────────

const WEBHOOK_SECRET = process.env.WAVESPEED_WEBHOOK_SECRET;
const MAX_AGE_SECONDS = 300; // 5 minutes

/**
 * Verifies the HMAC-SHA256 signature sent by WaveSpeed.
 * Key = whsec_-prefixed secret with prefix stripped (no base64 decode).
 * Message = "{webhook-id}.{webhook-timestamp}.{raw_body}"
 * Signature header format: "v3,<64-hex-chars>"
 */
function verifySignature(rawBody: string, webhookId: string, webhookTimestamp: string, webhookSignature: string): boolean {
  if (!WEBHOOK_SECRET) return true; // no secret configured — skip verification

  const key = WEBHOOK_SECRET.startsWith('whsec_') ? WEBHOOK_SECRET.slice(6) : WEBHOOK_SECRET;
  const message = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expected = createHmac('sha256', key).update(message).digest('hex');

  // Extract the hex part after "v3,"
  const parts = webhookSignature.split(',');
  if (parts.length !== 2 || parts[0] !== 'v3') return false;
  const received = parts[1];

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false; // different lengths
  }
}

// ── Payload type ──────────────────────────────────────────────────────────

type WaveSpeedPayload = {
  id: string;           // WaveSpeed task ID
  status: 'completed' | 'failed';
  outputs?: string[];   // output image URLs (present on completed)
  error?: string;       // error message (present on failed)
};

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body (must read before parsing — needed for signature)
  const rawBody = await req.text();

  const webhookId        = req.headers.get('webhook-id') ?? '';
  const webhookTimestamp = req.headers.get('webhook-timestamp') ?? '';
  const webhookSignature = req.headers.get('webhook-signature') ?? '';

  // 2. Reject stale webhooks
  if (webhookTimestamp) {
    const ageSeconds = Math.abs(Date.now() / 1000 - parseInt(webhookTimestamp, 10));
    if (ageSeconds > MAX_AGE_SECONDS) {
      return NextResponse.json({ error: 'stale_webhook' }, { status: 401 });
    }
  }

  // 3. Verify signature (skipped if no secret is configured)
  if (WEBHOOK_SECRET && !verifySignature(rawBody, webhookId, webhookTimestamp, webhookSignature)) {
    console.warn('[wavespeed-webhook] signature mismatch — rejecting');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  // 4. Parse
  let payload: WaveSpeedPayload;
  try {
    payload = JSON.parse(rawBody) as WaveSpeedPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { id: taskId, status, outputs, error } = payload;

  // 5. Find the batch item (only pick up items still in flight)
  const item = await prisma.batchItem.findFirst({
    where: { wavespeedTaskId: taskId, status: 'generating' },
  });

  if (!item) {
    // Already handled (page-polling may have finished it first) — ACK to stop retries
    return NextResponse.json({ ok: true, note: 'already_handled' });
  }

  // 6. Finalize or fail
  if (status === 'completed' && outputs?.[0]) {
    try {
      const res = await fetch(outputs[0]);
      if (!res.ok) {
        await failItem(item, `Webhook image download failed (${res.status})`);
      } else {
        const buffer = Buffer.from(await res.arrayBuffer());
        await finalizeItem(item, buffer);
      }
    } catch (err) {
      await failItem(item, err instanceof Error ? err.message : 'Webhook download error');
    }
  } else {
    await failItem(item, error ?? `WaveSpeed status: ${status}`);
  }

  // 7. Pump next items in this batch so the queue keeps moving without polling
  await pump({ batchId: item.batchId });

  return NextResponse.json({ ok: true });
}
