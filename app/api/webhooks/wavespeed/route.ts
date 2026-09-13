/**
 * WaveSpeed webhook receiver — replaces the generations cron.
 * WaveSpeed needs a 2xx within 10 s, so we verify, acknowledge, and do the work in `after()`.
 * Secret: WAVESPEED_WEBHOOK_SECRET (from GET https://api.wavespeed.ai/api/v3/webhook/secret). Required in production.
 */

import { after, NextResponse } from 'next/server';
import {
  handleWaveSpeedWebhook,
  verifyWaveSpeedSignature,
  type WaveSpeedWebhookPayload,
} from '../../../../src/server/generation/webhook';

export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const secret = process.env.WAVESPEED_WEBHOOK_SECRET;

  if (secret) {
    const headers = {
      id: req.headers.get('webhook-id') ?? '',
      timestamp: req.headers.get('webhook-timestamp') ?? '',
      signature: req.headers.get('webhook-signature') ?? '',
    };
    if (!verifyWaveSpeedSignature(rawBody, headers, secret)) {
      console.warn('[wavespeed-webhook] invalid or stale signature');
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error('[wavespeed-webhook] WAVESPEED_WEBHOOK_SECRET is not set — refusing unsigned callbacks');
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let payload: WaveSpeedWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WaveSpeedWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (typeof payload?.id !== 'string' || typeof payload.status !== 'string') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  after(() => handleWaveSpeedWebhook(payload).catch((err: unknown) => console.error('[wavespeed-webhook] handling failed', payload.id, err)));
  return NextResponse.json({ ok: true });
}
