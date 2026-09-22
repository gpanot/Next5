import type { Prisma } from '@prisma/client';
import { after, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { readJsonObject } from '../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';
import { presignObject } from '../../../../src/server/storage/objectStore';
import { advanceInfluencerBatches, listInfluencers, resolveBaseImageKey } from '../../../../src/server/influencers/influencers';
import { HttpError } from '../../../../src/server/http';
import { extractIdentityLock } from '../../../../src/server/influencers/identityLock';
import { addInfluencerStyles, loadStyles, parseTemplateIds, pumpBatches } from '../../../../src/server/influencers/styles';

export const maxDuration = 60;

/** GET /api/app/influencers?product=&status= — active (default) or archived influencers. */
export const GET = authedRoute(async (req, session) => {
  const url = new URL(req.url);
  const product = url.searchParams.get('product');
  const status = url.searchParams.get('status') === 'archived' ? 'archived' : 'active';
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  if (status === 'active') await advanceInfluencerBatches(ws);
  return NextResponse.json({ influencers: await listInfluencers(ws, status) });
});

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
  const templates = await loadStyles(ws, parseTemplateIds(body.templateIds));

  // Lock the face once (portrait-clone), so every style describes the same person.
  const identity = await extractIdentityLock(baseImageKey);

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

  const batchIds = await addInfluencerStyles(ws, influencer, templates, identity);
  after(() => pumpBatches(batchIds));

  const portraitUrl = await presignObject(baseImageKey);

  return NextResponse.json(
    { influencer: { id: influencer.id, name: influencer.name, portraitUrl, batchIds } },
    { status: 201 },
  );
});
