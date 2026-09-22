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

export const maxDuration = 60;

/** GET /api/app/influencers?product= — active influencers with their portrait and ready variations. */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  await advanceInfluencerBatches(ws);
  return NextResponse.json({ influencers: await listInfluencers(ws) });
});

/**
 * POST /api/app/influencers — create influencer, auto-create sets, fire batches.
 * Body: {
 *   product, name, gender?, age?, ethnicity?, source,
 *   baseImageKey, galleryItemId?,
 *   templateIds[], photosPerStyle (1–6), themeId
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

  const templateIds = Array.isArray(body.templateIds) ? body.templateIds.map(String) : [];
  if (templateIds.length === 0) throw new HttpError(400, 'templates_required', 'Choose at least one style.');
  const photosPerStyle = Math.min(6, Math.max(1, Number(body.photosPerStyle ?? 6)));
  const themeId = typeof body.themeId === 'string' ? body.themeId : '';
  if (!themeId) throw new HttpError(400, 'theme_required', 'Choose a theme.');

  // Validate theme exists.
  const theme = await prisma.theme.findFirst({ where: { id: themeId, isActive: true } });
  if (!theme) throw new HttpError(404, 'theme_not_found', 'Theme not found.');

  // Pick the first `photosPerStyle` scene IDs from the theme.
  type ThemeScene = { id: string; label: string; direction: string };
  const allScenes = (theme.scenes as unknown as ThemeScene[]) ?? [];
  const sceneIds = allScenes.slice(0, photosPerStyle).map((s) => s.id);

  // Validate templates.
  const templates = await prisma.setTemplate.findMany({
    where: { id: { in: templateIds }, isActive: true, product: ws.product },
  });
  if (templates.length === 0) throw new HttpError(400, 'invalid_templates', 'No valid templates found.');
  const perStyle = sceneIds.length > 0 ? sceneIds.length : photosPerStyle;
  await assertCanAfford(ws, templates.length * perStyle);

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
    },
  });

  // For each template: create a StudioSet linked to the influencer, then create a batch.
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
    // Link set to the influencer.
    await prisma.studioSet.update({ where: { id: set.id }, data: { influencerId: influencer.id } });

    const batch = await createBatch(ws, {
      kind: 'brand_theme',
      setId: set.id,
      themeId: theme.id,
      count: perStyle,
      formats: ['portrait_4_5'],
      highRes: false,
      sceneIds: sceneIds.length > 0 ? sceneIds : undefined,
      // Use the influencer's own portrait as the generation reference — no selfies needed.
      influencerKey: baseImageKey,
      variation: true,
    });
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
