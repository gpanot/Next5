// server-only — never import from a 'use client' file.
// Style photos of an influencer: one Gemini photo per style, on the influencer's set for that style.

import type { Influencer, Prisma, Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { createBatch } from '../generation/createBatch';
import { pump } from '../generation/pump';
import { HttpError } from '../http';
import { createSet } from '../sets/sets';
import type { IdentityLock } from '../generation/composer/portraitClone';
import { extractIdentityLock, parseIdentityLock } from './identityLock';
import { assertCanAfford } from './influencers';

/** Most styles one request can ask for (the catalog has 18 today). */
export const MAX_STYLES = 30;

/** Unique template ids from a request body, capped. Throws when there are none. */
export const parseTemplateIds = (value: unknown): string[] => {
  const ids = Array.isArray(value) ? [...new Set(value.map(String))].slice(0, MAX_STYLES) : [];
  if (ids.length === 0) throw new HttpError(400, 'templates_required', 'Choose at least one style.');
  return ids;
};

/** Active styles for the workspace's product, in catalog order. Refuses up front when the balance is short. */
export const loadStyles = async (ws: Workspace, templateIds: string[]) => {
  const templates = await prisma.setTemplate.findMany({
    where: { id: { in: templateIds }, isActive: true, product: ws.product },
    orderBy: { sortOrder: 'asc' },
  });
  if (templates.length === 0) throw new HttpError(400, 'invalid_templates', 'No valid templates found.');
  await assertCanAfford(ws, templates.length);
  return templates;
};

/** The saved identity lock, or a fresh one read from the base portrait (saved for next time). */
export const identityOf = async (influencer: Influencer): Promise<IdentityLock | null> => {
  const saved = parseIdentityLock(influencer.identityLock);
  if (saved || !influencer.baseImageKey) return saved;
  const lock = await extractIdentityLock(influencer.baseImageKey);
  if (lock) await prisma.influencer.update({ where: { id: influencer.id }, data: { identityLock: lock as unknown as Prisma.InputJsonValue } });
  return lock;
};

/** The influencer's active set for a style, created on first use, so a retry adds to the same set. */
const setFor = async (ws: Workspace, influencer: Influencer, template: { id: string; name: string }): Promise<string> => {
  const existing = await prisma.studioSet.findFirst({
    where: { workspaceId: ws.id, influencerId: influencer.id, templateId: template.id, status: 'active' },
    select: { id: true },
  });
  if (existing) return existing.id;
  const set = await createSet(ws, {
    templateId: template.id, name: `${influencer.name} · ${template.name}`,
    locations: [], wardrobe: null, poseEnergy: null, brandColors: [], modelRef: null,
  });
  await prisma.studioSet.update({ where: { id: set.id }, data: { influencerId: influencer.id } });
  return set.id;
};

/** One one-photo batch per style. Returns the batch ids; call `pumpBatches` afterwards. */
export const addInfluencerStyles = async (
  ws: Workspace,
  influencer: Influencer,
  templates: readonly { id: string; name: string }[],
  identity: IdentityLock | null,
): Promise<string[]> => {
  if (!influencer.baseImageKey) throw new HttpError(409, 'portrait_missing', 'This influencer has no face photo yet.');
  const batchIds: string[] = [];
  for (const template of templates) {
    const setId = await setFor(ws, influencer, template);
    const batch = await createBatch(ws, { kind: 'influencer_variation', setId, influencerKey: influencer.baseImageKey, identity });
    batchIds.push(batch.id);
  }
  return batchIds;
};

/** Starts generation for new batches (run inside `after()`). */
export const pumpBatches = async (batchIds: readonly string[]): Promise<void> => {
  await Promise.allSettled(
    batchIds.map((id) => pump({ batchId: id }).catch((err: unknown) => console.error('[influencers] pump failed for batch', id, err))),
  );
};
