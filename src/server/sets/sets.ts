// server-only — never import from a 'use client' file.

import type { StudioSet, Workspace } from '@prisma/client';
import type { SetTemplateConfig } from '../../content/business/catalog/types';
import { STUDIO_MODELS } from '../../content/business/catalog/studioModels';
import { POSE_ENERGIES, WARDROBES } from '../../content/business/catalog/types';
import { prisma } from '../../lib/db';
import type { StudioSetDto } from '../../types/business/catalog';
import { getActivePlan } from '../generation/createBatch';
import { HttpError } from '../http';
import { previewFor } from './preview';

const HEX = /^#[0-9a-fA-F]{6}$/;

export type SetInput = {
  templateId: string;
  name: string;
  locations: string[];
  wardrobe: string | null;
  poseEnergy: string | null;
  brandColors: string[];
  modelRef: string | null;
};

export const parseSetInput = (body: Record<string, unknown>, partial = false): Partial<SetInput> => {
  const out: Partial<SetInput> = {};
  if (typeof body.templateId === 'string') out.templateId = body.templateId;
  else if (!partial) throw new HttpError(400, 'template_required', 'Choose a template.');
  if (typeof body.name === 'string') out.name = body.name.trim().slice(0, 60);
  if (Array.isArray(body.locations)) out.locations = body.locations.map(String).slice(0, 3);
  if (body.wardrobe !== undefined) out.wardrobe = WARDROBES.some((w) => w.id === body.wardrobe) ? String(body.wardrobe) : null;
  if (body.poseEnergy !== undefined) out.poseEnergy = POSE_ENERGIES.some((p) => p.id === body.poseEnergy) ? String(body.poseEnergy) : null;
  if (Array.isArray(body.brandColors)) out.brandColors = body.brandColors.map(String).filter((c) => HEX.test(c)).slice(0, 2);
  if (body.modelRef !== undefined) out.modelRef = typeof body.modelRef === 'string' ? body.modelRef.slice(0, 40) : null;
  return out;
};

/** Checks the template, location ids and model reference against the workspace's product and plan. */
const validateSet = async (workspace: Workspace, input: Partial<SetInput>): Promise<void> => {
  if (!input.templateId) return;
  const template = await prisma.setTemplate.findFirst({ where: { id: input.templateId, isActive: true } });
  if (!template || template.product !== workspace.product) throw new HttpError(400, 'invalid_template', 'That template is not available.');
  const config = template.config as unknown as SetTemplateConfig;
  if (input.locations?.some((id) => !config.locations.some((l) => l.id === id))) throw new HttpError(400, 'invalid_location', 'Unknown location.');
  if (workspace.product === 'shop' && input.modelRef && input.modelRef !== 'me') {
    const model = await prisma.identityReference.findFirst({ where: { isStudioModel: true, studioModelSlug: input.modelRef, deletedAt: null } });
    if (!model) throw new HttpError(400, 'invalid_model', 'That Studio model is not available.');
    const plan = await getActivePlan(workspace.id);
    if (!plan?.allStudioModels) {
      const other = await prisma.studioSet.findFirst({ where: { workspaceId: workspace.id, status: { not: 'archived' }, modelRef: { notIn: ['me', input.modelRef] } } });
      if (other) throw new HttpError(403, 'model_limit', 'Your plan includes one Studio model. Upgrade to Growth to use them all.');
    }
  }
};

/** Shop: a model has no scene of her own (scenes are picked per drop). The row still needs one, so it holds this. */
const SHOP_PLACEHOLDER_TEMPLATE = 'clean-white';

const shopModelName = (modelRef: string): string => (modelRef === 'me' ? 'You' : STUDIO_MODELS.find((m) => m.slug === modelRef)?.name ?? 'Studio model');

export const createSet = async (workspace: Workspace, input: Partial<SetInput>): Promise<StudioSet> => {
  if (workspace.product === 'shop') {
    // One row per model: adding a model she already has returns it.
    const modelRef = input.modelRef ?? 'me';
    const existing = await prisma.studioSet.findFirst({ where: { workspaceId: workspace.id, modelRef, status: { not: 'archived' } }, orderBy: { createdAt: 'asc' } });
    if (existing) return existing;
    input = { ...input, modelRef, templateId: input.templateId ?? SHOP_PLACEHOLDER_TEMPLATE };
  }
  await validateSet(workspace, input);
  const template = await prisma.setTemplate.findUniqueOrThrow({ where: { id: input.templateId ?? '' } });
  return prisma.studioSet.create({
    data: {
      workspaceId: workspace.id,
      templateId: template.id,
      name: input.name || (workspace.product === 'shop' ? shopModelName(input.modelRef ?? 'me') : template.name),
      locations: input.locations ?? [],
      wardrobe: input.wardrobe ?? null,
      poseEnergy: input.poseEnergy ?? null,
      brandColors: input.brandColors ?? workspace.brandColors,
      modelRef: workspace.product === 'shop' ? input.modelRef ?? 'me' : null,
    },
  });
};

export const updateSet = async (workspace: Workspace, setId: string, input: Partial<SetInput>): Promise<StudioSet> => {
  const set = await prisma.studioSet.findFirst({ where: { id: setId, workspaceId: workspace.id } });
  if (!set) throw new HttpError(404, 'set_not_found', workspace.product === 'shop' ? 'Scene not found.' : 'Style not found.');
  await validateSet(workspace, { ...input, templateId: input.templateId ?? set.templateId });
  return prisma.studioSet.update({ where: { id: set.id }, data: { ...input, templateId: undefined } });
};

/** The cover is always the template's own picture: a style must look the same every time she picks it. */
export const toSetDto = async (set: StudioSet & { template: { name: string; coverImage: string } }): Promise<StudioSetDto> => {
  const [batchCount, preview] = await Promise.all([prisma.batch.count({ where: { OR: [{ setId: set.id }, { items: { some: { setId: set.id } } }], kind: { not: 'trial' }, preview: false, variation: false } }), previewFor(set.id)]);
  return {
    id: set.id, name: set.name, templateId: set.templateId, templateName: set.template.name, coverImage: set.template.coverImage,
    locations: set.locations, wardrobe: set.wardrobe,
    poseEnergy: set.poseEnergy, brandColors: set.brandColors, modelRef: set.modelRef, status: set.status, batchCount, preview, createdAt: set.createdAt.toISOString(),
  };
};
