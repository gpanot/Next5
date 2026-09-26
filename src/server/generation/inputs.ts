// server-only — never import from a 'use client' file.

import type { Product, StudioSet, Workspace } from '@prisma/client';
import { MAX_REFERENCE_IMAGES } from '../../config/business';
import type { ShotId } from '../../config/shots';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';

export type IdentityInputs = { keys: string[]; isStudioModel: boolean };

const missing = (message: string): HttpError => new HttpError(409, 'identity_missing', message);

const liveRefs = (where: { workspaceId?: string | null; studioModelSlug?: string; isStudioModel?: boolean }) =>
  prisma.identityReference.findMany({
    where: { ...where, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { kind: true, r2Key: true },
  });

/** Brand: her own faces, up to 2. Needs no set, so property batches can use it.
 *  When `influencerKey` is provided the selfie table is skipped and the influencer portrait is used instead.
 */
export const resolveBrandIdentity = async (workspace: Workspace, influencerKey?: string | null): Promise<IdentityInputs> => {
  if (influencerKey) return { keys: [influencerKey], isStudioModel: false };
  const faces = (await liveRefs({ workspaceId: workspace.id })).filter((r) => r.kind === 'face').slice(0, 2);
  if (faces.length === 0) throw missing('Add your selfies before creating photos.');
  return { keys: faces.map((r) => r.r2Key), isStudioModel: false };
};

/** Ordered identity reference keys for a batch. Brand: up to 2 faces. Shop: face + full body of "me" or a Studio model. */
export const resolveIdentity = async (workspace: Workspace, set: StudioSet): Promise<IdentityInputs> =>
  workspace.product === 'brand' ? resolveBrandIdentity(workspace) : resolveShopIdentity(workspace, set.modelRef ?? 'me');

/** Shop: face + full body of "me" (her own photos) or of a Studio model. */
export const resolveShopIdentity = async (workspace: Workspace, modelRef: string): Promise<IdentityInputs> => {
  const refs = modelRef === 'me'
    ? await liveRefs({ workspaceId: workspace.id })
    : await liveRefs({ isStudioModel: true, studioModelSlug: modelRef });
  const face = refs.find((r) => r.kind === 'face');
  const full = refs.find((r) => r.kind === 'full_body');
  if (!face) throw missing(modelRef === 'me' ? 'Add your selfies before creating photos.' : 'This Studio model is not available.');
  return { keys: [face.r2Key, ...(full ? [full.r2Key] : [])], isStudioModel: modelRef !== 'me' };
};

/** Product reference keys for one shot: front, then detail, then back (back only for the back shot). */
export const productInputKeys = (product: Product, shot: ShotId, identityCount: number): string[] => {
  const keys = [product.frontR2Key];
  if (product.detailR2Key) keys.push(product.detailR2Key);
  if (shot === 'back_or_side' && product.backR2Key) keys.push(product.backR2Key);
  return keys.slice(0, Math.max(1, MAX_REFERENCE_IMAGES - identityCount));
};
