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

type BrandContext = { profile: BrandProfile; bible: VisualBible | null };

/** The brand as its latest Auto Slideshow run read it, with its Visual Bible (built now when missing). */
const brandContext = async (workspaceId: string, meter: CostMeter): Promise<BrandContext> => {
  const run = await prisma.autoSlideshowRun.findFirst({
    where: { workspaceId, profile: { not: { equals: null } } },
    orderBy: { createdAt: 'desc' },
    select: { profile: true },
  });
  if (!run) throw new HttpError(409, 'no_brand', 'Add your website first. We read your brand from it.');
  const profile = run.profile as unknown as BrandProfile;
  return { profile, bible: profile.visualBible ?? (await ensureVisualBible(workspaceId, meter).catch(() => null)) };
};

const castKey = (workspaceId: string, memberId: string) => `brand-cast/${workspaceId}/${memberId}-${Date.now()}.jpg`;

/** Makes one member's anchor photo and marks it ready (or failed). Never throws. Replaces the old photo when there was one. */
const makeAnchor = async (member: BrandCastMember, meter: CostMeter): Promise<void> => {
  try {
    const { buffer } = await generatePhoto(member.prompt, [], meter, { ...PHOTO_GEN, ratio: '3:4' });
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
  const { profile, bible } = await brandContext(workspaceId, meter);
  const personas = await writePersonas(profile, bible, free.length, current.map(asPersona), meter);
  await prisma.brandCastMember.createMany({
    data: personas.map((p, i) => ({ workspaceId, slot: free[i]!, name: p.name, look: p.look, prompt: anchorPrompt(p) })),
    skipDuplicates: true,
  });
  const created = (await members(workspaceId)).filter((m) => free.includes(m.slot) && m.status === 'pending' && !m.imageKey);
  return async () => {
    await Promise.all(created.map((m) => makeAnchor(m, meter)));
    console.log(`[brand-cast] ${workspaceId}: ${created.length} people made, $${meter.summary().usdMicros / 1e6}`);
  };
};

/** Swaps one member for a new person (another name and face), kept in the same slot. The job makes the new photo. */
export const startSwap = async (workspaceId: string, memberId: string, meter: CostMeter = createMeter()): Promise<() => Promise<void>> => {
  const all = await members(workspaceId);
  const member = all.find((m) => m.id === memberId);
  if (!member) throw new HttpError(404, 'not_found', 'This person is not in your cast.');
  if (member.status === 'pending' && !isStale(member)) throw new HttpError(409, 'busy', 'This face is still being made.');
  const { profile, bible } = await brandContext(workspaceId, meter);
  const [persona] = await writePersonas(profile, bible, 1, all.map(asPersona), meter);
  const updated = await prisma.brandCastMember.update({
    where: { id: member.id },
    // A new person: the old intro video (another face and name) goes too.
    data: { name: persona!.name, look: persona!.look, prompt: anchorPrompt(persona!), status: 'pending', error: null, uses: 0, voice: null, introScript: null, introVideoKey: null, introStatus: 'none', introError: null },
  });
  if (member.introVideoKey) await deleteObject(member.introVideoKey).catch(() => undefined);
  return () => makeAnchor(updated, meter);
};

/** Makes one failed member's photo again, same person. */
export const startRetry = async (workspaceId: string, memberId: string, meter: CostMeter = createMeter()): Promise<() => Promise<void>> => {
  const member = await prisma.brandCastMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) throw new HttpError(404, 'not_found', 'This person is not in your cast.');
  const updated = await prisma.brandCastMember.update({ where: { id: member.id }, data: { status: 'pending', error: null } });
  return () => makeAnchor(updated, meter);
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
