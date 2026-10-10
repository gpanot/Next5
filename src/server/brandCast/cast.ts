// server-only — never import from a 'use client' file.
// The workspace's Brand Cast (types/admin/brandCast.ts): people written from the brand's audience and Visual Bible
// (personas.ts), each with an anchor photo on Nano Banana 2.1. Made on the brand's first slideshow photo plan, or from
// the Brand page; a face can be swapped there. Slideshows take the least used member (photoPlan.ts).

import type { BrandCastMember } from '@prisma/client';
import { prisma } from '../../lib/db';
import { CAST_SIZE, type BrandCastDto, type BrandCastMemberDto, type IntroStatus } from '../../types/admin/brandCast';
import type { BrandProfile } from '../../types/admin/companyIntel';
import type { VisualBible } from '../../types/admin/visualBible';
import { compressJpeg } from '../autoSlideshow/jpeg';
import { generatePhoto, PHOTO_GEN } from '../autoSlideshow/photos';
import { HttpError } from '../http';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { ensureVisualBible } from '../shorts/visualBible';
import { deleteObject, presignObject, putObject } from '../storage/objectStore';
import { INTRO_STALE_MS } from './intro';
import { anchorPrompt, writePersonas, type Persona } from './personas';
import { brandPhotoFacts, productLooks, type BrandPhotoFacts } from '../brandContent/productPhotos';
import { compressBrandPhoto } from '../brandContent/compressPhoto';

/** A member still "pending" after this was cut off (a killed function): shown as failed, and can be made again. */
const STALE_MS = 5 * 60_000;

const isStale = (m: BrandCastMember) => m.status === 'pending' && Date.now() - m.updatedAt.getTime() > STALE_MS;

const toDto = async (m: BrandCastMember): Promise<BrandCastMemberDto> => ({
  id: m.id,
  slot: m.slot,
  name: m.name,
  look: m.look,
  imageUrl: m.imageKey && m.status === 'ready' ? await presignObject(m.imageKey) : null,
  status: isStale(m) ? 'failed' : (m.status as BrandCastMemberDto['status']),
  error: isStale(m) ? 'Making the photo took too long. Try a new face.' : m.error,
  uses: m.uses,
  updatedAt: m.updatedAt.toISOString(),
  ...(await introOf(m)),
});

/** The intro video's fields; a "pending" intro past its time shows as failed. */
const introOf = async (m: BrandCastMember): Promise<Pick<BrandCastMemberDto, 'introStatus' | 'introUrl' | 'introScript' | 'introError'>> => {
  const stale = m.introStatus === 'pending' && Date.now() - (m.introAt?.getTime() ?? 0) > INTRO_STALE_MS;
  return {
    introStatus: stale ? 'failed' : (m.introStatus as IntroStatus),
    introUrl: m.introStatus === 'ready' && m.introVideoKey ? await presignObject(m.introVideoKey) : null,
    introScript: m.introScript,
    introError: stale ? 'Making the video took too long. Try again.' : m.introError,
  };
};

const members = (workspaceId: string) => prisma.brandCastMember.findMany({ where: { workspaceId }, orderBy: { slot: 'asc' } });

export const listCast = async (workspaceId: string): Promise<BrandCastDto> => ({ members: await Promise.all((await members(workspaceId)).map(toDto)) });

/** The brand as its latest Auto Slideshow run read it, with its Visual Bible (built now when missing) and the product
 *  photos the cast may wear (clothing brands only). */
type BrandContext = { profile: BrandProfile; bible: VisualBible | null; products: string[]; outfits: BrandPhotoFacts[] };

/** Brands whose people wear the product. A car or an app is never an outfit. */
const WEARABLE = /\b(apparel|cloth|fashion|wear|athleisure|activewear|shoe|sneaker|boot|jewel|accessor|swim|lingerie|dress|denim|hat|bag)/i;

const brandContext = async (workspaceId: string, meter: CostMeter): Promise<BrandContext> => {
  const run = await prisma.autoSlideshowRun.findFirst({
    where: { workspaceId, profile: { not: { equals: null } } },
    orderBy: { createdAt: 'desc' },
    select: { profile: true },
  });
  if (!run) throw new HttpError(409, 'no_brand', 'Add your website first. We read your brand from it.');
  const profile = run.profile as unknown as BrandProfile;
  const [bible, photos] = await Promise.all([profile.visualBible ?? ensureVisualBible(workspaceId, meter).catch(() => null), brandPhotoFacts(workspaceId)]);
  const wearable = WEARABLE.test(`${bible?.business_category ?? ''} ${profile.productCategories.join(' ')}`);
  const outfits = wearable ? photos.filter((p) => p.usableAsReference && (p.photoType === 'product_on_person' || p.photoType === 'product_only')) : [];
  return { profile, bible, products: productLooks(photos), outfits };
};

/** The product photo the person wears: the one the writer picked, none when it said none fits them, else one per slot. */
const outfitFor = (ctx: BrandContext, persona: Persona, slot: number): BrandPhotoFacts | null => {
  if (persona.outfitPhoto === null) return null;
  return ctx.outfits[persona.outfitPhoto ?? (slot - 1) % Math.max(1, ctx.outfits.length)] ?? null;
};

/** The writer's view of the brand. */
const briefOf = (ctx: BrandContext) => ({ ...ctx, outfits: ctx.outfits.map((o) => o.productName || o.description) });

/** The anchor's prompt and reference images: the owner's photo of the person first, then the outfit. */
const anchorFor = (persona: Persona, outfit: BrandPhotoFacts | null, personKey?: string): { prompt: string; refs: string[] } => ({
  prompt: anchorPrompt(persona, { person: Boolean(personKey), outfit: outfit ? outfit.productName || 'outfit' : null }),
  refs: [...(personKey ? [personKey] : []), ...(outfit ? [outfit.r2Key] : [])],
});

const castKey = (workspaceId: string, memberId: string) => `brand-cast/${workspaceId}/${memberId}-${Date.now()}.jpg`;

const refLinks = async (keys: string[]): Promise<string[]> =>
  (await Promise.all(keys.map((k) => presignObject(k, 60 * 60).catch(() => null)))).filter((u): u is string => Boolean(u?.startsWith('https://')));

/** Makes one member's anchor photo and marks it ready (or failed). Never throws. Replaces the old photo when there was one. */
const makeAnchor = async (member: BrandCastMember, refs: string[], meter: CostMeter): Promise<void> => {
  try {
    const { buffer } = await generatePhoto(member.prompt, await refLinks(refs), meter, { ...PHOTO_GEN, ratio: '3:4' });
    const key = castKey(member.workspaceId, member.id);
    await putObject(key, await compressJpeg(buffer), 'image/jpeg');
    await prisma.brandCastMember.update({ where: { id: member.id }, data: { imageKey: key, status: 'ready', error: null } });
    if (member.imageKey) await deleteObject(member.imageKey).catch(() => undefined);
  } catch (err) {
    const message = clip(err instanceof Error ? err.message : String(err), 300);
    console.warn(`[brand-cast] anchor for ${member.id} failed:`, message);
    await prisma.brandCastMember.update({ where: { id: member.id }, data: { status: 'failed', error: message } }).catch(() => undefined);
  }
};

const asPersona = (m: BrandCastMember): Persona => ({ name: m.name, look: m.look });

/**
 * Writes the people for the empty slots and creates them as "pending", so the caller can answer at once. The returned
 * job makes their photos (about 30-60 s). Null when the cast is already full.
 */
export const startCast = async (workspaceId: string, meter: CostMeter = createMeter()): Promise<(() => Promise<void>) | null> => {
  const current = await members(workspaceId);
  const free = Array.from({ length: CAST_SIZE }, (_, i) => i + 1).filter((slot) => !current.some((m) => m.slot === slot));
  if (free.length === 0) return null;
  const ctx = await brandContext(workspaceId, meter);
  const personas = await writePersonas(briefOf(ctx), free.length, current.map(asPersona), meter);
  const anchors = personas.map((p, i) => anchorFor(p, outfitFor(ctx, p, free[i]!)));
  await prisma.brandCastMember.createMany({
    data: personas.map((p, i) => ({ workspaceId, slot: free[i]!, name: p.name, look: p.look, prompt: anchors[i]!.prompt })),
    skipDuplicates: true,
  });
  const created = (await members(workspaceId)).filter((m) => free.includes(m.slot) && m.status === 'pending' && !m.imageKey);
  return async () => {
    await Promise.all(created.map((m) => makeAnchor(m, anchors[free.indexOf(m.slot)]?.refs ?? [], meter)));
    console.log(`[brand-cast] ${workspaceId}: ${created.length} people made, $${meter.summary().usdMicros / 1e6}`);
  };
};

/** What the owner asked for in the "New face" dialog: what to change, and/or a stored photo of the person to use. */
export type SwapRequest = { note?: string; photoKey?: string };

/**
 * Swaps one member for a new person, kept in the same slot. With a note or a photo, the new person follows them (and may
 * keep the face when only the outfit should change); without, it is a different person. The job makes the new photo
 * and then deletes the owner's uploaded photo.
 */
export const startSwap = async (workspaceId: string, memberId: string, request: SwapRequest = {}, meter: CostMeter = createMeter()): Promise<() => Promise<void>> => {
  const all = await members(workspaceId);
  const member = all.find((m) => m.id === memberId);
  if (!member) throw new HttpError(404, 'not_found', 'This person is not in your cast.');
  if (member.status === 'pending' && !isStale(member)) throw new HttpError(409, 'busy', 'This face is still being made.');
  const ctx = await brandContext(workspaceId, meter);
  const guided = Boolean(request.note || request.photoKey);
  const photoUrl = request.photoKey ? ((await presignObject(request.photoKey, 60 * 60)) ?? undefined) : undefined;
  const guide = guided ? { note: request.note, photoUrl, current: asPersona(member) } : undefined;
  const avoid = (guided ? all.filter((m) => m.id !== member.id) : all).map(asPersona);
  const [persona] = await writePersonas(briefOf(ctx), 1, avoid, meter, guide);
  const anchor = anchorFor(persona!, outfitFor(ctx, persona!, member.slot), request.photoKey);
  const updated = await prisma.brandCastMember.update({
    where: { id: member.id },
    // A new look: the old intro video (another face or outfit) goes too.
    data: { name: persona!.name, look: persona!.look, prompt: anchor.prompt, status: 'pending', error: null, uses: 0, voice: null, introScript: null, introVideoKey: null, introStatus: 'none', introError: null },
  });
  if (member.introVideoKey) await deleteObject(member.introVideoKey).catch(() => undefined);
  return async () => {
    await makeAnchor(updated, anchor.refs, meter);
    if (request.photoKey) await deleteObject(request.photoKey).catch(() => undefined);
  };
};

/** Makes one failed member's photo again, same person and same prompt: the outfit photo is the one its prompt names
 *  (an uploaded photo of the person was already deleted). */
export const startRetry = async (workspaceId: string, memberId: string, meter: CostMeter = createMeter()): Promise<() => Promise<void>> => {
  const member = await prisma.brandCastMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) throw new HttpError(404, 'not_found', 'This person is not in your cast.');
  const ctx = await brandContext(workspaceId, meter);
  const outfit = ctx.outfits.find((o) => o.productName && member.prompt.includes(o.productName)) ?? null;
  const anchor = anchorFor(asPersona(member), outfit);
  const updated = await prisma.brandCastMember.update({ where: { id: member.id }, data: { status: 'pending', error: null, prompt: anchor.prompt } });
  return () => makeAnchor(updated, anchor.refs, meter);
};

/** Stores a reference photo from the "New face" dialog (checked, made small, metadata stripped) and returns its key. */
export const storeSwapPhoto = async (workspaceId: string, memberId: string, file: File): Promise<string> => {
  const key = `brand-cast/${workspaceId}/${memberId}-ref-${Date.now()}.jpg`;
  await putObject(key, await compressBrandPhoto(file), 'image/jpeg');
  return key;
};

export type CastPick = { id: string; name: string; look: string; imageKey: string };

type PickedRow = { id: string; name: string; look: string; image_key: string };

/** Takes the least used ready member and counts the use in one statement; SKIP LOCKED sends a slideshow made at the
 *  same moment (calendar ideas run in parallel) to the next face instead of the same one. */
const takeLeastUsed = async (workspaceId: string): Promise<CastPick | null> => {
  const rows = await prisma.$queryRaw<PickedRow[]>`
    UPDATE brand_cast_members SET uses = uses + 1
    WHERE id = (
      SELECT id FROM brand_cast_members
      WHERE workspace_id = ${workspaceId} AND status = 'ready' AND image_key IS NOT NULL
      ORDER BY uses ASC, slot ASC LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING id, name, look, image_key`;
  const row = rows[0];
  return row ? { id: row.id, name: row.name, look: row.look, imageKey: row.image_key } : null;
};

/**
 * One cast member per slideshow of a batch, least used first, each counted at once so the faces take turns. On the
 * brand's first slideshows the cast is made here and waited for. Empty when there is none (the photos then go
 * without a reference).
 */
export const castForShows = async (workspaceId: string, count: number, meter: CostMeter): Promise<CastPick[]> => {
  if (count === 0) return [];
  if ((await prisma.brandCastMember.count({ where: { workspaceId } })) === 0) {
    const job = await startCast(workspaceId, meter).catch((err: unknown) => {
      console.warn(`[brand-cast] ${workspaceId}: cast not made:`, err instanceof Error ? err.message : err);
      return null;
    });
    await job?.();
  }
  const picks: CastPick[] = [];
  for (let i = 0; i < count; i += 1) {
    const pick = await takeLeastUsed(workspaceId);
    if (!pick) break;
    picks.push(pick);
  }
  return picks;
};
