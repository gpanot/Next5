// server-only — never import from a 'use client' file.
// API cost ledger: every paid provider call writes one api_cost_events row, tagged with the user whose request started
// the work. The tag travels with the async context (AsyncLocalStorage), so provider clients do not need a user id:
// requireSession sets it once per request and background work started from that request (after(), promises) keeps it.

import { AsyncLocalStorage } from 'node:async_hooks';
import { isDbConfigured, prisma } from '../../lib/db';

export type CostContext = { userId: string | null; feature: string | null };

const store = new AsyncLocalStorage<CostContext>();

/** Path segments that are ids (cuid, uuid, numbers, long tokens) become ":id" so one feature groups as one line. */
const isIdSegment = (segment: string): boolean =>
  /^\d+$/.test(segment) || /^c[a-z0-9]{20,}$/.test(segment) || /^[0-9a-f-]{32,36}$/i.test(segment) || (segment.length >= 16 && /\d/.test(segment));

/** "POST /api/app/campaigns/:id/generate" for a request. */
export const featureOf = (req: Request): string => {
  const path = new URL(req.url).pathname.split('/').map((s) => (isIdSegment(s) ? ':id' : s)).join('/');
  return `${req.method} ${path}`;
};

/** Tags the rest of this request (and the work it starts) with a user and feature. */
export const enterCostContext = (ctx: CostContext): void => store.enterWith(ctx);

/** Runs `fn` billed to a workspace's owner: for queues where one request may process other users' jobs. */
export const withWorkspaceCostContext = async <T>(workspaceId: string, fn: () => Promise<T>): Promise<T> => {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } });
  return store.run({ userId: workspace?.ownerUserId ?? null, feature: store.getStore()?.feature ?? null }, fn);
};

export type CostEvent = { provider: string; model: string; usdMicros: number };

/** Records one paid call. Never throws and never waits: a lost row must not break the call that cost money. */
export const recordCost = ({ provider, model, usdMicros }: CostEvent): void => {
  const micros = Math.round(usdMicros);
  if (!(micros > 0) || !isDbConfigured()) return;
  const ctx = store.getStore();
  prisma.apiCostEvent
    .create({ data: { userId: ctx?.userId ?? null, feature: ctx?.feature ?? null, provider, model, costUsdMicros: micros } })
    .catch((err: unknown) => console.error('[costs] could not record', provider, model, err instanceof Error ? err.message : err));
};
