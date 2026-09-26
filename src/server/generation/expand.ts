// server-only — never import from a 'use client' file.

import type { SetTemplate, StudioSet, Workspace } from '@prisma/client';
import type { FormatId } from '../../config/formats';
import { coverShotFor, nextShotsForProduct, SHOTS, shotsForProduct, type ShotId } from '../../config/shots';
import type { ScenePose, SetTemplateConfig, ThemeScene } from '../../content/business/catalog/types';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { madeShotsByProduct } from '../shop/morePhotos';
import { occasionLabel, type Occasion } from '../../lib/listingOccasions';
import { composeBrandPrompt } from './composer/brand';
import { composeListingPrompt } from './composer/listing';
import { roomSceneId } from './composer/listingScenes';
import { composeShopPrompt } from './composer/shop';
import type { AnyDraft, BrandPropertyDraft, InfluencerVariationDraft, InternalBrandDraft, InternalShopDraft } from './draft';
import { GEMINI_PRO_IMAGE } from '../../lib/reapiImage';
import { SHOP_IMAGE_MODEL } from '../../config/imageModels';
import { influencerShotFor } from '../../content/business/catalog/influencerShots';
import { composeLockedPrompt, DESLOP_NEGATIVES } from './composer/portraitClone';
import { clampVariations, getListing, roomsFor } from '../listings/listings';
import { productInputKeys, resolveBrandIdentity, resolveIdentity } from './inputs';

export type ItemSpec = {
  sceneId: string | null;
  shot: ShotId | null;
  productId: string | null;
  format: FormatId;
  prompt: string;
  inputR2Keys: string[];
  /** Drop-box photo this was built from, so the calendar can label the post "24 Oak St". */
  materialId?: string | null;
  /** Image model for the run; omitted means nano-banana-2 on WaveSpeed. Shop product photos use SHOP_IMAGE_MODEL. */
  model?: string | null;
  /** Shop: the set (model + scene) this photo is made with, when a batch rotates through several. */
  setId?: string | null;
};

export type ExpandedBatch = {
  kind: 'trial' | 'brand_theme' | 'shop_products';
  /** Free style / look preview: paid from free credits, kept out of the library and calendar. */
  preview?: boolean;
  /** Influencer variation: paid, but kept out of the library and calendar like a preview. */
  variation?: boolean;
  /** Set when the batch was built from one property's photos. */
  listingId?: string | null;
  occasion?: Occasion | null;
  name: string;
  /** Null for property batches, which have no set. */
  setId: string | null;
  themeId: string | null;
  packId: string | null;
  formats: FormatId[];
  highRes: boolean;
  items: ItemSpec[];
};

const shortDate = (now: Date, withYear: boolean): string =>
  now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'Asia/Ho_Chi_Minh' });

/** Photos of an AI influencer run on Gemini 3 Pro Image (reAPI); everything else stays on WaveSpeed. */
const influencerModel = (influencerKey?: string): string | null => (influencerKey ? GEMINI_PRO_IMAGE : null);

/** Gemini gets the portrait-clone de-slop list on top of the scene prompt, so the influencer reads as a real photo. */
const influencerPrompt = (prompt: string, influencerKey?: string): string =>
  influencerKey
    ? `${prompt}\n\nThe person is the exact same individual as in reference image 1: same face, skin, moles, hairline and hair color. Real unretouched full-frame camera photo, natural skin texture with visible pores, low contrast natural grade, faint sensor grain.\nAvoid: ${DESLOP_NEGATIVES.join('; ')}.`
    : prompt;

const loadSet = async (workspaceId: string, setId: string): Promise<StudioSet & { template: SetTemplate }> => {
  const set = await prisma.studioSet.findFirst({ where: { id: setId, workspaceId, status: { not: 'archived' } }, include: { template: true } });
  if (!set) throw new HttpError(404, 'set_not_found', 'That look was archived or no longer exists. Pick another one.');
  return set;
};

const expandBrand = async (workspace: Workspace, draft: InternalBrandDraft, now: Date): Promise<ExpandedBatch> => {
  const set = await loadSet(workspace.id, draft.setId);
  const theme = await prisma.theme.findFirst({ where: { id: draft.themeId, isActive: true } });
  if (!theme) throw new HttpError(404, 'theme_not_found', 'That theme is not available.');
  const identity = draft.influencerKey
    ? await resolveBrandIdentity(workspace, draft.influencerKey)
    : await resolveIdentity(workspace, set);
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
      items.push({ sceneId: scene.id, shot: null, productId: null, format, prompt: influencerPrompt(prompt, draft.influencerKey), inputR2Keys: identity.keys, materialId: null, model: influencerModel(draft.influencerKey) });
    }
  }
  return {
    kind: draft.trial ? 'trial' : 'brand_theme',
    name: draft.trial ? 'Free trial' : draft.preview ? `Preview · ${set.name}` : `${theme.title} · ${shortDate(now, false)}`,
    preview: Boolean(draft.preview),
    variation: 'variation' in draft && Boolean(draft.variation),
    setId: set.id, themeId: theme.id, packId: null, formats: draft.formats, highRes: draft.highRes, items,
  };
};

type ShopModel = { set: StudioSet & { template: SetTemplate }; template: SetTemplateConfig; identity: Awaited<ReturnType<typeof resolveIdentity>> };

/** The batch's set first, then the extra models it rotates through, each with the face refs it needs. */
const loadShopModels = async (workspace: Workspace, draft: InternalShopDraft): Promise<ShopModel[]> =>
  Promise.all([draft.setId, ...(draft.setIds ?? [])].map(async (id) => {
    const set = await loadSet(workspace.id, id);
    return { set, template: set.template.config as unknown as SetTemplateConfig, identity: await resolveIdentity(workspace, set) };
  }));

const loadShopProducts = async (workspace: Workspace, productIds: readonly string[]) => {
  const products = await prisma.product.findMany({ where: { id: { in: [...productIds] }, workspaceId: workspace.id, archivedAt: null } });
  if (products.length !== productIds.length) throw new HttpError(404, 'product_not_found', 'Some products no longer exist.');
  const preparing = products.filter((p) => !p.frontR2Key || p.frontR2Key === 'pending');
  if (preparing.length) throw new HttpError(409, 'product_photo_pending', `We are still getting the photo for ${preparing.length === 1 ? `“${preparing[0]!.name}”` : `${preparing.length} products`}. Try again in a minute.`);
  // Keep her order, so rotation is predictable: product 1 → model 1, product 2 → model 2…
  return productIds.map((id) => products.find((p) => p.id === id)!);
};

const shopBatchName = (draft: InternalShopDraft, set: StudioSet, models: number, now: Date): string => {
  if (draft.trial) return 'Free trial';
  if (draft.preview) return `Preview · ${set.name}`;
  const label = draft.coverOnly ? 'Cover' : draft.more ? 'More photos' : 'Drop';
  const scenes = draft.scenes?.length ?? 0;
  return `${label}${models > 1 ? ` · ${models} models` : ''}${scenes > 1 ? ` · ${scenes} scenes` : ''} · ${shortDate(now, true)}`;
};

type ShopScene = { id: string | null; config: SetTemplateConfig; poses: readonly ScenePose[] };

/** The scenes a drop was asked for, in her order, each with only the poses she picked. Null: the legacy pack path. */
const loadShopScenes = async (picks: InternalShopDraft['scenes']): Promise<ShopScene[] | null> => {
  if (!picks?.length) return null;
  const rows = await prisma.setTemplate.findMany({ where: { id: { in: picks.map((p) => p.id) }, product: 'shop', isActive: true } });
  return picks.map((pick) => {
    const row = rows.find((r) => r.id === pick.id);
    if (!row) throw new HttpError(400, 'invalid_scene', 'One of these scenes is not available. Pick another one.');
    const config = row.config as unknown as SetTemplateConfig;
    const poses = (config.poses ?? []).filter((p) => pick.poseIds.includes(p.id));
    if (poses.length !== pick.poseIds.length) throw new HttpError(400, 'invalid_pose', `One of the poses in ${row.name} is not available.`);
    return { id: row.id, config, poses };
  });
};

type ShopProduct = Awaited<ReturnType<typeof loadShopProducts>>[number];

/** Legacy shots for one product: the pack, or the next new angles ("Create more photos"). */
const legacyShots = (draft: InternalShopDraft, product: ShopProduct, made: Map<string, string[]> | null): readonly ShotId[] => {
  const hasBack = Boolean(product.backR2Key);
  if (draft.coverOnly) return [];
  return made ? nextShotsForProduct(product.category, hasBack, made.get(product.id) ?? []) : shotsForProduct(product.category, draft.packId, hasBack);
};

const expandShop = async (workspace: Workspace, draft: InternalShopDraft, now: Date): Promise<ExpandedBatch> => {
  const [models, products, scenes] = await Promise.all([loadShopModels(workspace, draft), loadShopProducts(workspace, draft.productIds), loadShopScenes(draft.scenes)]);
  const made = draft.more ? await madeShotsByProduct(workspace.id, draft.productIds) : null;
  if (made && products.every((p) => nextShotsForProduct(p.category, Boolean(p.backR2Key), made.get(p.id) ?? []).length === 0)) {
    throw new HttpError(400, 'no_more_shots', 'These products already have every photo angle we make.');
  }

  const items: ItemSpec[] = [];
  const addItem = ({ set, identity }: ShopModel, scene: ShopScene, product: ShopProduct, shot: ShotId, format: FormatId, pose?: ScenePose) => {
    const productKeys = productInputKeys(product, shot, identity.keys.length);
    const prompt = composeShopPrompt({
      template: scene.config, shot, poseDirection: pose?.direction, format, garment: product, isStudioModel: identity.isStudioModel,
      identityImageCount: identity.keys.length, productImageCount: productKeys.length,
    });
    items.push({ sceneId: scene.id, shot, productId: product.id, format, prompt, inputR2Keys: [...identity.keys, ...productKeys], setId: set.id, model: SHOP_IMAGE_MODEL });
  };
  // A separate 9:16 cover is only needed when 9:16 isn't already one of the formats.
  const addCover = draft.coverOnly || (draft.withCover && !draft.formats.includes('story_9_16'));
  const ownScene = (m: ShopModel): ShopScene => ({ id: null, config: m.template, poses: [] });
  products.forEach((product, index) => {
    if (scenes) {
      // Create a drop: every model, in every picked pose of every scene.
      for (const model of models) {
        for (const scene of scenes) {
          for (const pose of scene.poses) {
            if (SHOTS[pose.shot].requiresBackPhoto && !product.backR2Key) continue;
            for (const format of draft.formats) addItem(model, scene, product, pose.shot, format, pose);
          }
        }
      }
      if (addCover) addItem(models[0]!, scenes[0]!, product, coverShotFor(product.category), 'story_9_16');
      return;
    }
    // Legacy: products take turns across the models, each in her own set's scene.
    const model = models[index % models.length]!;
    for (const shot of legacyShots(draft, product, made)) for (const format of draft.formats) addItem(model, ownScene(model), product, shot, format);
    if (addCover) addItem(model, ownScene(model), product, coverShotFor(product.category), 'story_9_16');
  });
  const { set } = models[0]!;
  return {
    kind: draft.trial ? 'trial' : 'shop_products',
    name: shopBatchName(draft, set, models.length, now),
    preview: Boolean(draft.preview),
    variation: 'variation' in draft && Boolean(draft.variation),
    setId: set.id, themeId: null, packId: draft.packId, formats: draft.coverOnly ? ['story_9_16'] : draft.formats, highRes: draft.highRes, items,
  };
};

/** Resolves a draft against the database into concrete items with composed prompts and inputs. */
/** Her latest set's look, unless she changed it for this batch. Falls back to the template's defaults. */
const resolveStyle = async (workspace: Workspace, draft: BrandPropertyDraft) => {
  const set = await prisma.studioSet.findFirst({
    where: { workspaceId: workspace.id, status: 'active' },
    orderBy: { updatedAt: 'desc' },
    include: { template: true },
  });
  const defaults = (set?.template.config as unknown as SetTemplateConfig | undefined)?.defaults ?? {};
  return {
    wardrobe: draft.wardrobe ?? set?.wardrobe ?? defaults.wardrobe ?? 'smart_casual',
    poseEnergy: draft.poseEnergy ?? set?.poseEnergy ?? defaults.poseEnergy ?? 'warm_approachable',
    brandColors: set?.brandColors.length ? set.brandColors : workspace.brandColors,
  };
};

/**
 * Property batch: every photo comes from one she gave us, looks × photos × formats.
 * There is no stock location and no theme scene here by design — inventing a room, or asking
 * for a balcony her home does not have, misrepresents it (12-listing-mode-plan, 14-property-create-plan).
 */
const expandProperty = async (workspace: Workspace, draft: BrandPropertyDraft, now: Date): Promise<ExpandedBatch> => {
  const listing = await getListing(workspace.id, draft.listingId);
  const rooms = roomsFor(listing);
  if (rooms.length === 0) throw new HttpError(400, 'no_rooms', 'Add at least one photo of this property first.');
  const [identity, style] = await Promise.all([resolveBrandIdentity(workspace, draft.influencerKey), resolveStyle(workspace, draft)]);
  const looks = clampVariations(draft.variations);

  const items: ItemSpec[] = [];
  for (const room of rooms) {
    for (let look = 0; look < looks; look += 1) {
      for (const format of draft.formats) {
        const prompt = composeListingPrompt({
          identityImageCount: identity.keys.length,
          room: { kind: room.kind, label: room.label, tag: room.tag },
          look, occasion: draft.occasion,
          wardrobe: style.wardrobe, poseEnergy: style.poseEnergy, brandColors: style.brandColors,
          industry: workspace.industry, format,
        });
        items.push({
          sceneId: roomSceneId(room.tag, look), shot: null, productId: null, format,
          prompt: influencerPrompt(prompt, draft.influencerKey),
          inputR2Keys: [...identity.keys, room.r2Key],
          materialId: room.id,
          model: influencerModel(draft.influencerKey),
        });
      }
    }
  }
  return {
    kind: 'brand_theme',
    name: `${listing.label} · ${occasionLabel(draft.occasion)} · ${shortDate(now, false)}`,
    setId: null, themeId: null, packId: null, formats: draft.formats, highRes: draft.highRes,
    listingId: listing.id, occasion: draft.occasion, items,
  };
};

/** One Gemini photo of the influencer in the set's style, from the style's locked shot. */
const expandInfluencerVariation = async (workspace: Workspace, draft: InfluencerVariationDraft): Promise<ExpandedBatch> => {
  const set = await loadSet(workspace.id, draft.setId);
  const prompt = composeLockedPrompt({
    id: set.templateId.replace(/-/g, '_'),
    identity: draft.identity,
    shot: influencerShotFor(set.templateId),
    withReference: true,
  });
  return {
    kind: 'brand_theme',
    name: `Variation · ${set.name}`,
    variation: true,
    setId: set.id, themeId: null, packId: null, formats: ['story_9_16'], highRes: false,
    items: [{ sceneId: set.templateId, shot: null, productId: null, format: 'story_9_16', prompt, inputR2Keys: [draft.influencerKey], materialId: null, model: GEMINI_PRO_IMAGE }],
  };
};

const SHOP_KINDS: readonly AnyDraft['kind'][] = ['shop_products'];

export const expandDraft = (workspace: Workspace, draft: AnyDraft, now = new Date()): Promise<ExpandedBatch> => {
  const isShop = SHOP_KINDS.includes(draft.kind);
  if (isShop && workspace.product !== 'shop') throw new HttpError(400, 'wrong_product', 'Products are for Shop Studio.');
  if (!isShop && workspace.product !== 'brand') throw new HttpError(400, 'wrong_product', 'Themes and properties are for Brand Studio.');
  if (draft.kind === 'brand_property') return expandProperty(workspace, draft, now);
  if (draft.kind === 'influencer_variation') return expandInfluencerVariation(workspace, draft);
  return draft.kind === 'brand_theme' ? expandBrand(workspace, draft, now) : expandShop(workspace, draft, now);
};
