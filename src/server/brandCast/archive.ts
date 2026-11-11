// server-only — never import from a 'use client' file.
// The Brand Cast archive: "New face" parks the old person (cast.ts) instead of overwriting them. Parked people keep
// their photo and intro video for ARCHIVE_DAYS, ARCHIVE_MAX at most (older ones are deleted). The owner can bring one
// back, into a free slot or in place of an active person (who is parked in turn), or delete them. An active person can
// also be moved to the archive by hand. Also the owner's
// "Edit name and age".

import type { BrandCastMember, Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { ARCHIVE_DAYS, ARCHIVE_MAX, CAST_SIZE, MAX_AGE, MAX_NAME, MIN_AGE } from '../../types/admin/brandCast';
import { HttpError } from '../http';
import { deleteObject } from '../storage/objectStore';

const DAY_MS = 86_400_000;
/** A member still "pending" after this was cut off (a killed function): shown as failed, and can be made again. */
const STALE_MS = 5 * 60_000;

export const isStale = (m: BrandCastMember) => m.status === 'pending' && Date.now() - m.updatedAt.getTime() > STALE_MS;

const isBusy = (m: BrandCastMember) => m.status === 'pending' && !isStale(m);

/** When a parked member is deleted for good; null for the active cast. */
export const expiresAt = (m: BrandCastMember): Date | null => (m.archivedAt ? new Date(m.archivedAt.getTime() + ARCHIVE_DAYS * DAY_MS) : null);

/** Deletes the photo and intro video of members whose rows are gone. Never throws. */
export const dropFiles = async (rows: BrandCastMember[]): Promise<void> => {
  const keys = rows.flatMap((m) => [m.imageKey, m.introVideoKey]).filter((k): k is string => Boolean(k));
  await Promise.all(keys.map((k) => deleteObject(k).catch(() => undefined)));
};

const dropMembers = async (rows: BrandCastMember[]): Promise<void> => {
  if (rows.length === 0) return;
  await prisma.brandCastMember.deleteMany({ where: { id: { in: rows.map((m) => m.id) } } });
  await dropFiles(rows);
};

/**
 * Frees `member`'s slot inside the caller's transaction: parks them when they have a photo, else deletes them (a failed
 * face is not worth keeping). Returns the deleted member, whose files the caller drops after the commit.
 */
export const vacate = async (tx: Prisma.TransactionClient, member: BrandCastMember): Promise<BrandCastMember | null> => {
  if (member.status === 'ready' && member.imageKey) {
    await tx.brandCastMember.update({ where: { id: member.id }, data: { archivedAt: new Date() } });
    return null;
  }
  await tx.brandCastMember.delete({ where: { id: member.id } });
  return member;
};

/** Deletes parked members past ARCHIVE_DAYS, and the oldest beyond ARCHIVE_MAX. */
export const tidyArchive = async (workspaceId: string): Promise<void> => {
  const parked = await prisma.brandCastMember.findMany({ where: { workspaceId, archivedAt: { not: null } }, orderBy: { archivedAt: 'desc' } });
  const cutoff = Date.now() - ARCHIVE_DAYS * DAY_MS;
  await dropMembers(parked.filter((m, i) => i >= ARCHIVE_MAX || m.archivedAt!.getTime() < cutoff));
};

/**
 * Brings a parked member back: into a free slot when there is one, else in place of `replaceId` (an active member, who
 * is parked). The member starts at the least uses of the others, so slideshows do not all take them at once.
 */
export const restoreMember = async (workspaceId: string, memberId: string, replaceId?: string): Promise<void> => {
  const all = await prisma.brandCastMember.findMany({ where: { workspaceId } });
  const back = all.find((m) => m.id === memberId && m.archivedAt);
  if (!back) throw new HttpError(404, 'not_found', 'This face is no longer in your archive.');
  const active = all.filter((m) => !m.archivedAt);
  const free = Array.from({ length: CAST_SIZE }, (_, i) => i + 1).find((slot) => !active.some((m) => m.slot === slot));
  const out = free === undefined ? active.find((m) => m.id === replaceId) : undefined;
  if (free === undefined && !out) throw new HttpError(400, 'pick_replace', 'Pick who goes to the archive.');
  if (out && isBusy(out)) throw new HttpError(409, 'busy', 'This face is still being made.');
  const others = active.filter((m) => m.id !== out?.id);
  const uses = others.length > 0 ? Math.min(...others.map((m) => m.uses)) : 0;
  const dropped = await prisma.$transaction(async (tx) => {
    const gone = out ? await vacate(tx, out) : null;
    await tx.brandCastMember.update({ where: { id: back.id }, data: { archivedAt: null, slot: out?.slot ?? free!, uses } });
    return gone;
  });
  if (dropped) await dropFiles([dropped]);
};

/** "Move to archive" from the ⋮ menu: parks an active member, leaving their slot empty (a "+ Create Avatar" card). */
export const archiveMember = async (workspaceId: string, memberId: string): Promise<void> => {
  const member = await prisma.brandCastMember.findFirst({ where: { id: memberId, workspaceId, archivedAt: null } });
  if (!member) throw new HttpError(404, 'not_found', 'This person is not in your cast.');
  if (isBusy(member)) throw new HttpError(409, 'busy', 'This face is still being made.');
  const dropped = await prisma.$transaction((tx) => vacate(tx, member));
  if (dropped) await dropFiles([dropped]);
  await tidyArchive(workspaceId);
};

/** Deletes a parked member for good, with their photo and video. */
export const deleteParked = async (workspaceId: string, memberId: string): Promise<void> => {
  const member = await prisma.brandCastMember.findFirst({ where: { id: memberId, workspaceId, archivedAt: { not: null } } });
  if (!member) throw new HttpError(404, 'not_found', 'Only faces in your archive can be deleted.');
  await dropMembers([member]);
};

const AGE_LEAD = /^\d+ years old\./;

/**
 * The owner's name and age for a member. The age also goes into their look ("28 years old. …"), which the photo
 * prompts get. The photo and intro video stay as they are.
 */
export const editMember = async (workspaceId: string, memberId: string, rawName: string, age: number): Promise<void> => {
  const member = await prisma.brandCastMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) throw new HttpError(404, 'not_found', 'This person is not in your cast.');
  const name = rawName.replace(/[,\s]+/g, ' ').trim().slice(0, MAX_NAME);
  if (!name) throw new HttpError(400, 'bad_name', 'Add a name.');
  if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) throw new HttpError(400, 'bad_age', `Pick an age from ${MIN_AGE} to ${MAX_AGE}.`);
  const lead = `${age} years old.`;
  const look = AGE_LEAD.test(member.look) ? member.look.replace(AGE_LEAD, lead) : `${lead} ${member.look}`;
  await prisma.brandCastMember.update({
    where: { id: member.id },
    data: { name: `${name}, ${age}`, look, prompt: member.prompt.replace(member.look, look) },
  });
};
