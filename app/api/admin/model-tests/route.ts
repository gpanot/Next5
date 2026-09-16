import { FORMAT_IDS } from '../../../../src/config/formats';
import { PRODUCT_CATEGORIES, SHOTS } from '../../../../src/config/shots';
import { adminRoute, json } from '../../../../src/server/admin/route';
import {
  benchIdentities, benchTemplates, listModelTests, parseFormat, parseModels, parseShot, startModelTest, toRunDto,
} from '../../../../src/server/admin/modelTest';
import { listBenchModels } from '../../../../src/server/admin/wavespeedCatalog';
import { HttpError } from '../../../../src/server/http';
import { normalizeUpload, readForm } from '../../../../src/server/storage/images';
import { modelTestKey } from '../../../../src/server/storage/keys';
import { putObject } from '../../../../src/server/storage/objectStore';
import { prisma } from '../../../../src/lib/db';

export const maxDuration = 120;

/** GET — what the bench can run (models, looks, studio models, shots) plus the latest runs. */
export const GET = adminRoute(async () => {
  const [identities, templates, runs, models] = await Promise.all([benchIdentities(), benchTemplates(), listModelTests(), listBenchModels()]);
  return json({
    models: models.map((m) => ({ id: m.id, label: m.label, family: m.family, note: m.note, price: m.priceUsdMicros, maxImages: m.maxImages, keepsInputShape: m.keepsInputShape })),
    studioModels: identities.map((i) => ({ slug: i.slug, photos: i.keys.length })),
    templates: templates.map((t) => ({ id: t.id, name: t.name })),
    shots: Object.values(SHOTS).map((s) => ({ id: s.id, label: s.label })),
    formats: FORMAT_IDS,
    categories: PRODUCT_CATEGORIES,
    runs,
  });
});

/**
 * POST — multipart: front (file), back?/detail? (files), studioModel, templateId, shot, format, resolution,
 * models (JSON array), name, category, colorName?, fit?, notes?, label?.
 * Runs the same prompt through every chosen model and records time and price.
 */
export const POST = adminRoute(async (req) => {
  const form = await readForm(req);
  const text = (key: string) => String(form.get(key) ?? '').trim();
  const front = form.get('front');
  if (!(front instanceof File)) throw new HttpError(400, 'front_required', 'Upload the product photo.');

  const identity = (await benchIdentities()).find((i) => i.slug === text('studioModel'));
  if (!identity) throw new HttpError(400, 'invalid_model', 'Pick a Studio model.');
  const models = await parseModels(JSON.parse(text('models') || '[]'));
  const shot = parseShot(text('shot'));
  const format = parseFormat(text('format') || 'square_1_1');
  const resolution = text('resolution') === '2k' ? '2k' : '1k';
  const name = text('name') || front.name.replace(/\.[^.]+$/, '');
  const category = text('category') || 'dress';

  // The photos live under a run id, so a failed run leaves nothing behind that we can't find.
  const runId = `mt_${Date.now().toString(36)}`;
  const productKeys: string[] = [];
  for (const side of ['front', 'detail', 'back'] as const) {
    const file = form.get(side);
    if (!(file instanceof File)) continue;
    const key = modelTestKey(runId, `input-${side}`);
    await putObject(key, await normalizeUpload(file, `${side} photo`));
    productKeys.push(key);
  }

  const run = await startModelTest({
    label: text('label') || undefined,
    identityKeys: identity.keys,
    productKeys,
    templateId: text('templateId'),
    shot,
    format,
    resolution,
    models,
    product: { name, category, colorName: text('colorName') || null, fit: text('fit') || null, notes: text('notes') || null },
  });
  const saved = await prisma.modelTestRun.findUniqueOrThrow({ where: { id: run.id }, include: { items: true } });
  return json({ run: await toRunDto(saved) }, { status: 201 });
});
