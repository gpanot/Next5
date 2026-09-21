// server-only — never import from a 'use client' file.

import { HttpError } from '../http';

type Json = Record<string, unknown>;

/** Calls a provider API and returns its JSON; a provider error becomes a 502 with the provider's own words. */
export const providerFetch = async (provider: string, url: string, init: RequestInit = {}): Promise<Json> => {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  const text = await res.text();
  let body: Json = {};
  try {
    body = text ? (JSON.parse(text) as Json) : {};
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  const nested = body.error as { message?: string; error_msg?: string; code?: string } | string | undefined;
  const tiktokOk = typeof nested === 'object' && nested?.code === 'ok';
  if (!res.ok || (nested && !tiktokOk)) {
    const message = typeof nested === 'string'
      ? String(body.error_description ?? nested)
      : nested?.message ?? nested?.error_msg ?? String(body.error_message ?? body.raw ?? `HTTP ${res.status}`);
    console.error(`[social:${provider}]`, res.status, message);
    throw new HttpError(502, 'provider_error', `${provider === 'tiktok' ? 'TikTok' : 'Instagram'} said: ${message}`);
  }
  return body;
};

export const form = (values: Record<string, string>): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(values).toString(),
});

export const secondsFromNow = (seconds: unknown): Date | null =>
  typeof seconds === 'number' && seconds > 0 ? new Date(Date.now() + seconds * 1000) : null;
