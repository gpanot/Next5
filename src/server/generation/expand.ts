// server-only — never import from a 'use client' file.

import type { SetTemplate, StudioSet, Workspace } from '@prisma/client';
import type { FormatId } from '../../config/formats';
import { coverShotFor, nextShotsForProduct, shotsForProduct, type ShotId } from '../../config/shots';
import type { SetTemplateConfig, ThemeScene } from '../../content/business/catalog/types';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { madeShotsByProduct } from '../shop/morePhotos';
import { composeBrandPrompt } from './composer/brand';
import { composeShopPrompt } from './composer/shop';
import type { AnyDraft, InternalBrandDraft, InternalShopDraft } from './draft';
import { productInputKeys, resolveIdentity } from './inputs';

export type ItemSpec = {
  sceneId: string | null;
  shot: ShotId | null;
  productId: string | null;
  format: FormatId;
  prompt: string;
  inputR2Keys: string[];
};

export type ExpandedBatch = {
  kind: 'trial' | 'brand_theme' | 'shop_products';
  name: string;
  setId: string;
  themeId: string | null;
  packId: string | null;
  formats: FormatId[];
  highRes: boolean;
  items: ItemSpec[];
};

const shortDate = (now: Date, withYear: boolean): string =>
  now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'Asia/Ho_Chi_Minh' });

const loadSet = async (workspaceId: string, setId: string): Promise<StudioSet & { template: SetTemplate }> => {
  const set = await prisma.studioSet.findFirst({ where: { id: setId, workspaceId, status: { not: 'archived' } }, include: { template: true } });
  if (!set) throw new HttpError(404, 'set_not_found', 'That set no longer exists.');
  return set;
};

const expandBrand = async (workspace: Workspace, draft: InternalBrandDraft, now: Date): Promise<ExpandedBatch> => {
  const set = await loadSet(workspace.id, draft.setId);
  const theme = await prisma.theme.findFirst({ where: { id: draft.themeId, isActive: true } });
  if (!theme) throw new HttpError(404, 'theme_not_found', 'That theme is not available.');
  const identity = await resolveIdentity(workspace, set);
  const allScenes = theme.scenes as unknown as ThemeScene[];
  const scenes = draft.sceneIds ? allScenes.filter((s) => draft.sceneIds?.includes(s.id)) : allScenes;
  const template = set.template.config as unknown as SetTemplateConfig;

  const items: ItemSpec[] = [];
  for (let index = 0; index < draft.count; index += 1) {
    const scene = scenes[index % scenes.length];
    for (const format of draft.formats) {
      const prompt = composeBrandPrompt({
        template, set, scene, index, sceneCount: scenes.length, format,
        industry: workspace.industry, identityImageCount: identity.keys.length,
      });
      items.push({ sceneId: scene.id, shot: null, productId: null, format, prompt, inputR2Keys: identity.keys });
    }
  }
  return {
    kind: draft.trial ? 'trial' : 'brand_theme',
    name: draft.trial ? 'Free trial' : `${theme.title} · ${shortDate(now, false)}`,
    setId: set.id, themeId: theme.id, packId: null, formats: draft.formats, highRes: draft.highRes, items,
  };
};

const expandShop = async (workspace: Workspace, draft: InternalShopDraft, now: Date): Promise<ExpandedBatch> => {
  const set = await loadSet(workspace.id, draft.setId);
  const products = await prisma.product.findMany({ where: { id: { in: draft.productIds }, workspaceId: workspace.id, archivedAt: null } });
  if (products.length !== draft.productIds.length) throw new HttpError(404, 'product_not_found', 'Some products no longer exist.');
  const preparing = products.filter((p) => !p.frontR2Key || p.frontR2Key === 'pending');
  if (preparing.length) throw new HttpError(409, 'product_photo_pending', `We are still getting the photo for ${preparing.length === 1 ? `“${preparing[0]!.name}”` : `${preparing.length} products`}. Try again in a minute.`);
  const identity = await resolveIdentity(workspace, set);
  const template = set.template.config as unknown as SetTemplateConfig;

  const made = draft.more ? await madeShotsByProduct(workspace.id, draft.productIds) : null;
  if (made && products.every((p) => nextShotsForProduct(p.category, Boolean(p.backR2Key), made.get(p.id) ?? []).length === 0)) {
    throw new HttpError(400, 'no_more_shots', 'These products already have every photo angle we make.');
  }

  const items: ItemSpec[] = [];
  const addItem = (product: (typeof products)[number], shot: ShotId, format: FormatId) => {
    const productKeys = productInputKeys(product, shot, identity.keys.length);
    const prompt = composeShopPrompt({
      template, shot, format, garment: product, isStudioModel: identity.isStudioModel,
      identityImageCount: identity.keys.length, productImageCount: productKeys.length,
    });
    items.push({ sceneId: null, shot, productId: product.id, format, prompt, inputR2Keys: [...identity.keys, ...productKeys] });
  };
  // A separate 9:16 cover is only needed when 9:16 isn't already one of the formats.
  const addCover = draft.coverOnly || (draft.withCover && !draft.formats.includes('story_9_16'));
  for (const product of products) {
    const hasBack = Boolean(product.backR2Key);
    const shots = draft.coverOnly ? [] : made ? nextShotsForProduct(product.category, hasBack, made.get(product.id) ?? []) : shotsForProduct(product.category, draft.packId, hasBack);
    for (const shot of shots) for (const format of draft.formats) addItem(product, shot, format);
    if (addCover) addItem(product, coverShotFor(product.category), 'story_9_16');
  }
  const label = draft.coverOnly ? 'Cover' : draft.more ? 'More photos' : 'Drop';
  return {
    kind: draft.trial ? 'trial' : 'shop_products',
    name: draft.trial ? 'Free trial' : `${label} · ${shortDate(now, true)}`,
    setId: set.id, themeId: null, packId: draft.packId, formats: draft.coverOnly ? ['story_9_16'] : draft.formats, highRes: draft.highRes, items,
  };
};

/** Resolves a draft against the database into concrete items with composed prompts and inputs. */
export const expandDraft = (workspace: Workspace, draft: AnyDraft, now = new Date()): Promise<ExpandedBatch> => {
  if (draft.kind === 'brand_theme' && workspace.product !== 'brand') throw new HttpError(400, 'wrong_product', 'Themes are for Brand Studio.');
  if (draft.kind === 'shop_products' && workspace.product !== 'shop') throw new HttpError(400, 'wrong_product', 'Products are for Shop Studio.');
  return draft.kind === 'brand_theme' ? expandBrand(workspace, draft, now) : expandShop(workspace, draft, now);
};
