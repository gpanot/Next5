import type { Prisma } from '@prisma/client';
import { after, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { readJsonObject } from '../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';
import { createSet } from '../../../../src/server/sets/sets';
import { createBatch } from '../../../../src/server/generation/createBatch';
import { pump } from '../../../../src/server/generation/pump';
import { presignObject } from '../../../../src/server/storage/objectStore';
import { advanceInfluencerBatches, assertCanAfford, listInfluencers, resolveBaseImageKey } from '../../../../src/server/influencers/influencers';
import { HttpError } from '../../../../src/server/http';
import { extractIdentityLock } from '../../../../src/server/influencers/identityLock';

export const maxDuration = 60;

/** GET /api/app/influencers?product= — active influencers with their portrait and ready variations. */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  await advanceInfluencerBatches(ws);
  return NextResponse.json({ influencers: await listInfluencers(ws) });
});

/** One photo per style; the wizard offers every active Brand style. */
const MAX_STYLES = 30;

/**
 * POST /api/app/influencers — create influencer, one set per style, one Gemini photo per style.
 * Body: {
 *   product, name, gender?, age?, ethnicity?, source,
 *   baseImageKey, galleryItemId?,
 *   templateIds[]
 * }
 */
export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(
    session.userId,
    isProductLine(body.product) ? body.product : undefined,
  );

  // Validate required fields.
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  if (!name) throw new HttpError(400, 'name_required', 'Give your influencer a name.');
  const source = typeof body.source === 'string' ? body.source : '';
  if (!['generated', 'uploaded', 'gallery'].includes(source))
    throw new HttpError(400, 'invalid_source', 'Source must be generated, uploaded, or gallery.');
  const galleryItemId = source === 'gallery' && typeof body.galleryItemId === 'string' ? body.galleryItemId : null;
  const baseImageKey = await resolveBaseImageKey(source, body.baseImageKey, galleryItemId);

  const templateIds = Array.isArray(body.templateIds) ? [...new Set(body.templateIds.map(String))].slice(0, MAX_STYLES) : [];
  if (templateIds.length === 0) throw new HttpError(400, 'templates_required', 'Choose at least one style.');

  // Validate templates.
  const templates = await prisma.setTemplate.findMany({
    where: { id: { in: templateIds }, isActive: true, product: ws.product },
    orderBy: { sortOrder: 'asc' },
  });
  if (templates.length === 0) throw new HttpError(400, 'invalid_templates', 'No valid templates found.');
  await assertCanAfford(ws, templates.length);

  // Lock the face once (portrait-clone), so every style describes the same person.
  const identity = await extractIdentityLock(baseImageKey);

  // Create the Influencer record.
  const influencer = await prisma.influencer.create({
    data: {
      workspaceId: ws.id,
      name,
      gender: typeof body.gender === 'string' ? body.gender : null,
      age: typeof body.age === 'number' ? body.age : null,
      ethnicity: typeof body.ethnicity === 'string' ? body.ethnicity.trim() : null,
      source,
      baseImageKey,
      galleryItemId,
      status: 'active',
      ...(identity ? { identityLock: identity as unknown as Prisma.InputJsonValue } : {}),
    },
  });

  // For each style: a StudioSet linked to the influencer, then a one-photo batch.
  const batchIds: string[] = [];
  for (const template of templates) {
    const set = await createSet(ws, {
      templateId: template.id,
      name: `${name} · ${template.name}`,
      locations: [],
      wardrobe: null,
      poseEnergy: null,
      brandColors: [],
      modelRef: null,
    });
    await prisma.studioSet.update({ where: { id: set.id }, data: { influencerId: influencer.id } });

    const batch = await createBatch(ws, { kind: 'influencer_variation', setId: set.id, influencerKey: baseImageKey, identity });
    batchIds.push(batch.id);
  }

  // Fire generation asynchronously for all batches.
  after(async () => {
    await Promise.allSettled(
      batchIds.map((id) =>
        pump({ batchId: id }).catch((err: unknown) =>
          console.error('[influencers] pump failed for batch', id, err),
        ),
      ),
    );
  });

  const portraitUrl = baseImageKey ? await presignObject(baseImageKey) : null;

  return NextResponse.json(
    { influencer: { id: influencer.id, name: influencer.name, portraitUrl, batchIds } },
    { status: 201 },
  );
});
