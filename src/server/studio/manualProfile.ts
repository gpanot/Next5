// server-only — never import from a 'use client' file.
//
// "B2B No Website": turns a hand-typed profile + uploaded product photos into a Campaign Studio
// run the website slideshow engine reads unchanged. Every field is `manual`, confidence 1, locked.

import { prisma } from '../../lib/db';
import {
  MANUAL_SOURCE_PREFIX,
  MAX_PRODUCT_PHOTOS,
  missingManualFields,
  normalizeManualInput,
  productPhotosFromProfile,
  type ManualProfileInput,
  type ProductPhoto,
} from '../../lib/manualProfile';
import { HttpError } from '../http';
import { describeProductPhotos } from './productPhotos';
import type { FieldEnvelope, StudioProfileData } from './types';

const manual = <T>(value: T): FieldEnvelope<T> => ({ value, source: 'manual', confidence: 1, locked: true });

/** Form input → profile data, in the shape the crawler writes. */
export function buildManualProfileData(input: ManualProfileInput, products: ProductPhoto[]): StudioProfileData {
  return {
    classification: {
      vertical: manual(''),
      subVertical: manual(''),
      businessModel: manual('smb'),
    },
    identity: {
      businessName: manual(input.businessName),
      tagline: manual(input.tagline),
      description: manual(input.description),
      logoUrl: manual<string | null>(null),
      primaryColor: manual<string | null>(null),
    },
    positioning: {
      promoting: manual(input.promoting),
      offer: manual(input.offer),
      positioning: manual(input.positioning),
      geography: manual(input.geography),
      howToBuy: manual(input.howToBuy),
    },
    market: {
      audienceDescription: manual(input.audienceDescription),
      targetCustomerIndustries: manual(input.customerGroups),
      competitors: manual(input.competitors),
      keywords: manual<string[]>([]),
      // Typed by the admin: the claim is its own evidence (the guard allows its numbers).
      proofPoints: manual(input.proofPoints.map((p) => ({ claim: p, evidence: p }))),
    },
    tone: {
      tone: manual(input.tone),
      hooks: manual(input.hookIdeas),
    },
    products: manual(products),
  };
}

/** Body → clean input. 400 with the missing field labels when a required field is empty. */
export function parseManualInput(raw: unknown): ManualProfileInput {
  const input = normalizeManualInput(raw);
  const missing = missingManualFields(input);
  if (missing.length > 0) {
    throw new HttpError(400, 'missing_fields', `Fill in: ${missing.join(', ')}.`, { missing });
  }
  return input;
}

/**
 * Photo asset ids → described product photos. Photos already described on the previous profile
 * version keep their description; only new ones go to the vision model.
 */
export async function resolveProductPhotos(
  rawIds: unknown,
  input: ManualProfileInput,
  previous: ProductPhoto[] = [],
): Promise<ProductPhoto[]> {
  const ids = [...new Set((Array.isArray(rawIds) ? rawIds : []).filter((v): v is string => typeof v === 'string'))]
    .slice(0, MAX_PRODUCT_PHOTOS);
  if (ids.length === 0) return [];
  const assets = await prisma.blitzAsset.findMany({ where: { id: { in: ids } } });
  const byId = new Map(assets.map((a) => [a.id, a]));
  const known = new Map(previous.map((p) => [p.assetId, p]));
  const fresh = ids.flatMap((id) => {
    const a = byId.get(id);
    return a && !known.has(id) ? [{ assetId: a.id, r2Key: a.r2Key, name: a.name }] : [];
  });
  const described = await describeProductPhotos(fresh, { name: input.businessName, promoting: input.promoting });
  const all = new Map([...known, ...described.map((p) => [p.assetId, p] as const)]);
  return ids.flatMap((id) => (all.get(id) && byId.has(id) ? [all.get(id)!] : []));
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'business';

/** Creates the run with its profile already done: no crawl, the deck can be built right away. */
export async function createManualRun(input: ManualProfileInput, photoIds: unknown, workspaceId: string | null) {
  const products = await resolveProductPhotos(photoIds, input);
  const profile = await prisma.studioBrandProfile.create({
    data: {
      sourceUrl: `${MANUAL_SOURCE_PREFIX}${slug(input.businessName)}`,
      workspaceId,
      data: buildManualProfileData(input, products) as object,
      crawl: {},
    },
  });
  const run = await prisma.studioRun.create({
    data: { brandProfileId: profile.id, workspaceId, extractStatus: 'done' },
  });
  return { runId: run.id, products };
}

/** Saves an edit as a new profile version, like the Profile step's PATCH. */
export async function updateManualRun(runId: string, input: ManualProfileInput, photoIds: unknown) {
  const run = await prisma.studioRun.findUnique({ where: { id: runId }, include: { brandProfile: true } });
  if (!run) throw new HttpError(404, 'run_not_found', 'Run not found.');
  if (!run.brandProfile.sourceUrl.startsWith(MANUAL_SOURCE_PREFIX)) {
    throw new HttpError(409, 'not_manual', 'This run was built from a website. Edit it in the Profile step.');
  }
  const products = await resolveProductPhotos(photoIds, input, productPhotosFromProfile(run.brandProfile.data));
  const profile = await prisma.studioBrandProfile.create({
    data: {
      sourceUrl: run.brandProfile.sourceUrl,
      workspaceId: run.workspaceId,
      version: run.brandProfile.version + 1,
      data: buildManualProfileData(input, products) as object,
      crawl: {},
    },
  });
  await prisma.studioRun.update({ where: { id: runId }, data: { brandProfileId: profile.id, extractStatus: 'done' } });
  return { runId, products };
}
