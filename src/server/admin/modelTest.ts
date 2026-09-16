// server-only — never import from a 'use client' file.
// Admin model bench: one product photo prompt, run through several image models, to compare look, time and price.
// It uses the same prompt builder and reference images as a real drop, so results match what customers would get.

import type { ModelTestItem, ModelTestRun } from '@prisma/client';
import { IMAGE_MODELS, isImageModelId, modelCostUsdMicros, type ImageModelId, type ModelResolution } from '../../config/imageModels';
import { isFormatId, FORMATS, type FormatId } from '../../config/formats';
import { isShotId, type ShotId } from '../../config/shots';
import type { SetTemplateConfig } from '../../content/business/catalog/types';
import { prisma } from '../../lib/db';
import { submitEdit, pollTask, isTerminal, uploadPhotoToWaveSpeed } from '../../lib/wavespeed';
import { composeShopPrompt } from '../generation/composer/shop';
import { labelImage } from '../generation/labeling';
import { HttpError } from '../http';
import { modelTestKey } from '../storage/keys';
import { getObject, presignObject, putObject } from '../storage/objectStore';

export type ModelTestInput = {
  label?: string;
  /** Storage keys: the model's face/full-body photos first, then the garment photos. */
  identityKeys: readonly string[];
  productKeys: readonly string[];
  templateId: string;
  shot: ShotId;
  format: FormatId;
  resolution: ModelResolution;
  models: readonly ImageModelId[];
  product: { name: string; category: string; colorName: string | null; fit: string | null; notes: string | null };
};

/** A run times out after this; a model still working then counts as failed. */
const RUN_TIMEOUT_MS = 6 * 60 * 1000;

export const parseModels = (value: unknown): ImageModelId[] => {
  const ids = Array.isArray(value) ? [...new Set(value.map(String))] : [];
  const models = ids.filter(isImageModelId);
  if (models.length === 0) throw new HttpError(400, 'no_models', 'Choose at least one model.');
  return models;
};

export const parseShot = (value: unknown): ShotId => {
  if (!isShotId(String(value))) throw new HttpError(400, 'invalid_shot', 'Unknown shot.');
  return String(value) as ShotId;
};

export const parseFormat = (value: unknown): FormatId => {
  if (!isFormatId(String(value))) throw new HttpError(400, 'invalid_format', 'Unknown format.');
  return String(value) as FormatId;
};

/** Studio models the bench can use as the person wearing the product. */
export const benchIdentities = async () => {
  const refs = await prisma.identityReference.findMany({
    where: { isStudioModel: true, deletedAt: null },
    orderBy: [{ studioModelSlug: 'asc' }, { kind: 'asc' }],
    select: { studioModelSlug: true, kind: true, r2Key: true },
  });
  const bySlug = new Map<string, { slug: string; keys: string[] }>();
  for (const ref of refs) {
    if (!ref.studioModelSlug) continue;
    const entry = bySlug.get(ref.studioModelSlug) ?? { slug: ref.studioModelSlug, keys: [] };
    // Face first, then full body — the same order a real batch uses.
    if (ref.kind === 'face') entry.keys.unshift(ref.r2Key);
    else entry.keys.push(ref.r2Key);
    bySlug.set(ref.studioModelSlug, entry);
  }
  return [...bySlug.values()];
};

export const benchTemplates = () =>
  prisma.setTemplate.findMany({ where: { product: 'shop', isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, config: true } });

/** Uploads a stored photo to WaveSpeed and returns the URL its models can read. */
const wavespeedUrl = async (key: string): Promise<string> => {
  const buffer = await getObject(key);
  if (!buffer) throw new HttpError(404, 'photo_missing', `Photo missing: ${key}`);
  return uploadPhotoToWaveSpeed(buffer);
};

/** Builds the prompt exactly like a drop would, then submits it to every chosen model. */
export const startModelTest = async (input: ModelTestInput): Promise<ModelTestRun> => {
  const template = await prisma.setTemplate.findFirst({ where: { id: input.templateId, product: 'shop' } });
  if (!template) throw new HttpError(404, 'template_not_found', 'That shop look template is gone.');

  const prompt = composeShopPrompt({
    template: template.config as unknown as SetTemplateConfig,
    garment: input.product,
    shot: input.shot,
    format: input.format,
    identityImageCount: input.identityKeys.length,
    productImageCount: input.productKeys.length,
    isStudioModel: true,
  });

  const run = await prisma.modelTestRun.create({
    data: {
      label: input.label ?? null,
      prompt,
      shot: input.shot,
      format: input.format,
      resolution: input.resolution,
      templateId: template.id,
      productName: input.product.name,
      inputR2Keys: [...input.identityKeys, ...input.productKeys],
      items: { create: input.models.map((model) => ({ model })) },
    },
    include: { items: true },
  });

  let urls: string[];
  try {
    urls = await Promise.all(run.inputR2Keys.map(wavespeedUrl));
  } catch (err) {
    // The bench still shows the run, with the reason on every model, instead of failing the request.
    const message = err instanceof Error ? err.message : 'Could not send the photos to WaveSpeed';
    await prisma.modelTestItem.updateMany({ where: { runId: run.id }, data: { status: 'failed', error: message, completedAt: new Date() } });
    return run;
  }
  const aspectRatio = FORMATS[input.format].ratio;
  await Promise.all(
    run.items.map(async (item) => {
      try {
        const taskId = await submitEdit({
          model: item.model as ImageModelId,
          imageUrls: urls,
          prompt,
          aspectRatio,
          resolution: input.resolution,
        });
        await prisma.modelTestItem.update({ where: { id: item.id }, data: { wavespeedTaskId: taskId, submittedAt: new Date() } });
      } catch (err) {
        await prisma.modelTestItem.update({
          where: { id: item.id },
          data: { status: 'failed', error: err instanceof Error ? err.message : 'Submit failed', completedAt: new Date() },
        });
      }
    }),
  );
  return run;
};

const finishItem = async (item: ModelTestItem, run: ModelTestRun): Promise<void> => {
  if (!item.wavespeedTaskId) {
    // Submitting never got as far as a task id, so this model has nothing to wait for.
    await prisma.modelTestItem.update({ where: { id: item.id }, data: { status: 'failed', error: item.error ?? 'Never started', completedAt: new Date() } });
    return;
  }
  const result = await pollTask(item.wavespeedTaskId);
  if (result.status === 'completed' && result.url) {
    const res = await fetch(result.url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const image = await labelImage(Buffer.from(await res.arrayBuffer()), { visibleTag: false });
    const key = modelTestKey(run.id, item.id);
    await putObject(key, image);
    await prisma.modelTestItem.update({
      where: { id: item.id },
      data: {
        status: 'ready',
        r2Key: key,
        completedAt: new Date(),
        costUsdMicros: modelCostUsdMicros(item.model as ImageModelId, run.resolution === '2k' ? '2k' : '1k', run.inputR2Keys.length),
      },
    });
    return;
  }
  if (isTerminal(result.status)) {
    await prisma.modelTestItem.update({
      where: { id: item.id },
      data: { status: 'failed', error: result.error ?? `Generation ${result.status}`, completedAt: new Date() },
    });
    return;
  }
  if (Date.now() - (item.submittedAt?.getTime() ?? 0) > RUN_TIMEOUT_MS) {
    await prisma.modelTestItem.update({ where: { id: item.id }, data: { status: 'failed', error: 'Timed out', completedAt: new Date() } });
  }
};

/** Advances every model still working, then returns the run for the admin page. */
export const pollModelTest = async (runId: string) => {
  const run = await prisma.modelTestRun.findUnique({ where: { id: runId }, include: { items: { orderBy: { createdAt: 'asc' } } } });
  if (!run) throw new HttpError(404, 'run_not_found', 'That test run is gone.');
  await Promise.all(
    run.items
      .filter((item) => item.status === 'generating')
      .map((item) => finishItem(item, run).catch((err: unknown) => console.error(`[model-test] ${item.model}:`, err))),
  );
  return toRunDto(await prisma.modelTestRun.findUniqueOrThrow({ where: { id: runId }, include: { items: { orderBy: { createdAt: 'asc' } } } }));
};

export type ModelTestItemDto = {
  id: string;
  model: ImageModelId;
  label: string;
  status: string;
  url: string | null;
  error: string | null;
  seconds: number | null;
  costUsdMicros: number;
};

export const toRunDto = async (run: ModelTestRun & { items: ModelTestItem[] }) => ({
  id: run.id,
  label: run.label,
  prompt: run.prompt,
  shot: run.shot,
  format: run.format,
  resolution: run.resolution,
  productName: run.productName,
  createdAt: run.createdAt.toISOString(),
  inputUrls: (await Promise.all(run.inputR2Keys.map((key) => presignObject(key)))).filter((url): url is string => Boolean(url)),
  items: await Promise.all(
    run.items.map(async (item) => ({
      id: item.id,
      model: item.model as ImageModelId,
      label: isImageModelId(item.model) ? IMAGE_MODELS[item.model].label : item.model,
      status: item.status,
      url: item.r2Key ? await presignObject(item.r2Key) : null,
      error: item.error,
      seconds: item.submittedAt && item.completedAt ? Math.round((item.completedAt.getTime() - item.submittedAt.getTime()) / 100) / 10 : null,
      costUsdMicros: item.costUsdMicros,
    })),
  ),
});

export const listModelTests = async (limit = 20) => {
  const runs = await prisma.modelTestRun.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { items: { orderBy: { createdAt: 'asc' } } } });
  return Promise.all(runs.map(toRunDto));
};
