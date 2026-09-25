'use client';

import type { LabClient } from '../labClient';
import type { ListingFacts } from '../../../server/labs/slideshowCopy';

export type DeckAction = 'keep' | 'discard' | 'undo' | 'open' | 'edit' | 'render';

export type DeckActionExtra = {
  reason?: string;
  editedShots?: string[];
  shotTexts?: string[];
  blitzProjectId?: string;
};

/**
 * Logs one deck action against its saved card. Fire-and-forget: a logging failure must never
 * block a swipe, so errors only reach the console. Cards without a variantId (deck not saved) are skipped.
 */
export function logDeckAction(client: LabClient, variantId: string | undefined, action: DeckAction, extra: DeckActionExtra = {}): void {
  if (!variantId) return;
  fetch(client.url('/blitz/slideshow-swipes'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
    body: JSON.stringify({ variantId, action, ...extra }),
  })
    .then((res) => { if (!res.ok) console.error(`[deck] swipe log failed: ${res.status}`); })
    .catch((err) => console.error('[deck] swipe log failed:', err));
}

/** What the server checks an edited card against: the listing (Zillow) or the run's profile (website). */
export type CopyCheckContext =
  | { engine: 'zillow'; facts: ListingFacts }
  | { engine: 'website'; runId: string };

/**
 * Server re-check of an edited card (format + the engine's guardrails).
 * Returns the problems; a network failure returns a single problem so the render waits.
 */
export async function checkDeckCopy(client: LabClient, context: CopyCheckContext, texts: string[]): Promise<string[]> {
  try {
    const res = await fetch(client.url('/blitz/slideshow-deck/check'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
      body: JSON.stringify({ ...context, texts }),
    });
    if (!res.ok) return [`Could not check the copy (error ${res.status}). Try again.`];
    const data = (await res.json()) as { problems?: string[] };
    return data.problems ?? [];
  } catch {
    return ['Could not check the copy. Check your connection and try again.'];
  }
}
