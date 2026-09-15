// server-only — never import from a 'use client' file.

import { INDUSTRIES } from '../../content/business/catalog/types';
import { prisma } from '../../lib/db';
import type { PostKitDto } from '../../types/business/batches';
import { chatJson, isOpenAiEnabled } from '../ai/openai';
import { imageDataUrl } from '../ai/imageInput';
import { getActivePlan } from '../generation/createBatch';
import { HttpError } from '../http';

type RawKit = { hook?: string; caption?: string; hashtags?: unknown; description?: string };

const clean = (s: unknown, max: number): string => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const normalizeKit = (raw: RawKit | null, shop: boolean): PostKitDto | null => {
  if (!raw?.hook || !raw.caption) return null;
  const tags = (Array.isArray(raw.hashtags) ? raw.hashtags : [])
    .map((t) => `#${String(t).replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')}`)
    .filter((t) => t.length > 2);
  return {
    hook: clean(raw.hook, 90),
    caption: clean(raw.caption, 320),
    hashtags: [...new Set(tags)].slice(0, 10),
    description: shop ? clean(raw.description, 500) || null : null,
  };
};

type KitContext = { shop: boolean; business: string; handle: string | null; industry: string; look: string; product: string | null; listing?: string | null; photoCount?: number };

const SYSTEM = `You write social media posts for small businesses, most of them run by women: service pros (realtors, coaches, beauty pros) and online shops on TikTok Shop, Instagram and Shopee.
Write in simple, warm, confident English a 10-year-old can read. Short sentences.
Rules: never mention AI or that the photo was generated. Never invent facts: no prices, discounts, awards, sales numbers, materials, sizes or addresses. No emoji in the hook.
Return JSON:
{"hook": "first line that stops the scroll, max 70 characters",
 "caption": "1-3 short sentences, max 300 characters, ending with a soft call to action",
 "hashtags": ["6 to 10 hashtags without spaces: a mix of broad, niche and local tags"],
 "description": "SHOP ONLY: a product listing description, max 400 characters, one short opening line then 3 short benefit lines. Empty string for service pros."}`;

const userText = (c: KitContext): string =>
  c.shop && c.photoCount
    ? `Shop: ${c.business}${c.handle ? ` (${c.handle})` : ''}. Product: ${c.product ?? 'a clothing item'}. Photo look: ${c.look}.${c.listing ? ` Seller's listing text (use only these facts): ${c.listing}` : ''} The ${c.photoCount} photos show the same product from different angles. Write one post and one listing description for this product's photo series.`
    : c.shop
    ? `Shop: ${c.business}${c.handle ? ` (${c.handle})` : ''}. Product: ${c.product ?? 'a clothing item'}. Photo look: ${c.look}. Write the post and the listing description for this photo.`
    : `Business: ${c.business}${c.handle ? ` (${c.handle})` : ''}, ${c.industry}. Post theme: ${c.look}. Write the post for this photo.`;

const mockKit = (c: KitContext): PostKitDto => ({
  hook: c.shop ? `New in: ${c.product ?? 'this piece'} you will wear all week` : `${c.look}: here is what you need to know`,
  caption: c.shop ? `Soft, easy and ready for your week. Tap the link to shop before it sells out.` : `Thinking about your next step? I can help. Send me a message and let’s talk.`,
  hashtags: c.shop ? ['#newarrivals', '#ootd', '#tiktokshop', '#womensfashion', '#shopsmall', '#saigonstyle'] : ['#realtor', '#newlisting', '#homeforsale', '#realestatetips', '#dreamhome', '#saigonhomes'],
  description: c.shop ? `${c.product ?? 'This piece'} made for everyday wear.\n• Easy to style\n• Looks great from day to night\n• Pairs with what you already own` : null,
});

const writeKit = async (context: KitContext, imageKeys: readonly string[]): Promise<PostKitDto> => {
  let kit: PostKitDto | null;
  if (!isOpenAiEnabled()) {
    kit = mockKit(context);
  } else {
    const images = (await Promise.all(imageKeys.map((key) => imageDataUrl(key)))).filter((url): url is string => Boolean(url));
    kit = normalizeKit(await chatJson<RawKit>([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: [{ type: 'text', text: userText(context) }, ...images.map((url) => ({ type: 'image_url' as const, image_url: { url, detail: 'low' as const } }))] },
    ], { maxTokens: 450, temperature: 0.8 }), context.shop);
  }
  if (!kit) throw new HttpError(502, 'post_kit_failed', 'We could not write this Post Kit. Try again.');
  return kit;
};

/** Up to this many photos of the series go to the writer (different angles first). */
const LISTING_KIT_PHOTOS = 3;

/**
 * Shop Post Kit for a whole listing: one hook, caption, hashtags and description for all photos of a product
 * (cached on the product; `rewrite` writes a new one). Growth plans, or products from the free trial.
 */
export const getProductPostKit = async (userId: string, productId: string, options: { rewrite?: boolean } = {}): Promise<PostKitDto> => {
  const product = await prisma.product.findFirst({
    where: { id: productId, workspace: { ownerUserId: userId, product: 'shop' } },
    include: { workspace: true },
  });
  if (!product) throw new HttpError(404, 'product_not_found', 'Product not found.');
  const cached = product.postKit as PostKitDto | null;
  if (cached?.hook && !options.rewrite) return cached;

  const items = await prisma.batchItem.findMany({
    where: { productId, status: 'ready', r2Key: { not: null } },
    orderBy: { completedAt: 'desc' },
    take: 20,
    select: { r2Key: true, shot: true, batch: { select: { kind: true, set: { select: { name: true } } } } },
  });
  if (items.length === 0) throw new HttpError(409, 'no_photos', 'Create photos of this product first.');
  const trial = items.some((i) => i.batch.kind === 'trial');
  const plan = await getActivePlan(product.workspaceId);
  if (!trial && !plan?.postKit) throw new HttpError(403, 'plan_required', 'Post Kits are included in Growth.');

  const seen = new Set<string | null>();
  const series = items.filter((i) => (seen.has(i.shot) ? false : (seen.add(i.shot), true))).slice(0, LISTING_KIT_PHOTOS);
  const ws = product.workspace;
  const kit = await writeKit({
    shop: true,
    business: ws.name,
    handle: ws.handle,
    industry: 'online shop',
    look: items[0]?.batch.set?.name ?? 'new photos',
    product: [product.colorName, product.name].filter(Boolean).join(' '),
    listing: product.description ? product.description.replace(/\s+/g, ' ').slice(0, 400) : null,
    photoCount: series.length,
  }, series.map((i) => i.r2Key as string));
  await prisma.product.update({ where: { id: product.id }, data: { postKit: kit } });
  return kit;
};

/** Post Kit for one photo (cached on the item). Growth/Agency plans, and free-trial photos as a taste. */
export const getPostKit = async (userId: string, itemId: string): Promise<PostKitDto> => {
  const item = await prisma.batchItem.findFirst({
    where: { id: itemId, status: 'ready', batch: { workspace: { ownerUserId: userId } } },
    include: { product: true, batch: { include: { workspace: true, theme: true, set: true } } },
  });
  if (!item?.r2Key) throw new HttpError(404, 'item_not_found', 'Photo not found.');
  const cached = item.postKit as PostKitDto | null;
  if (cached?.hook) return cached;

  const isTrial = item.batch.kind === 'trial';
  const plan = await getActivePlan(item.batch.workspaceId);
  if (!isTrial && !plan?.postKit) throw new HttpError(403, 'plan_required', 'Post Kits are included in Growth.');

  const ws = item.batch.workspace;
  const context: KitContext = {
    shop: ws.product === 'shop',
    business: ws.name,
    handle: ws.handle,
    industry: INDUSTRIES.find((i) => i.id === ws.industry)?.label ?? 'small business',
    look: item.batch.theme?.title ?? item.batch.set?.name ?? 'new photos',
    product: item.product ? [item.product.colorName, item.product.name].filter(Boolean).join(' ') : null,
  };

  const kit = await writeKit(context, [item.r2Key]);
  await prisma.batchItem.update({ where: { id: item.id }, data: { postKit: kit, caption: kit.caption } });
  return kit;
};
