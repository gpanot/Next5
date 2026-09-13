import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { parseSetInput, toSetDto, updateSet } from '../../../../../src/server/sets/sets';

type Ctx = RouteContext<'/api/app/sets/[setId]'>;

const ownedSet = async (userId: string, setId: string) => {
  const set = await prisma.studioSet.findFirst({ where: { id: setId, workspace: { ownerUserId: userId } }, include: { template: true, workspace: true } });
  if (!set) throw new HttpError(404, 'set_not_found', 'Set not found.');
  return set;
};

export const GET = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { setId } = await ctx.params;
  return NextResponse.json({ set: await toSetDto(await ownedSet(session.userId, setId)) });
});

/** PATCH — name, locations, wardrobe, poseEnergy, brandColors, modelRef (changes apply to new batches). */
export const PATCH = authedRoute<Ctx>(async (req, session, ctx) => {
  const { setId } = await ctx.params;
  const set = await ownedSet(session.userId, setId);
  const input = parseSetInput(await readJsonObject(req), true);
  delete input.templateId;
  await updateSet(set.workspace, set.id, input);
  return NextResponse.json({ set: await toSetDto(await ownedSet(session.userId, setId)) });
});

/** DELETE — archives the set (its batches and photos stay in the library). */
export const DELETE = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { setId } = await ctx.params;
  const set = await ownedSet(session.userId, setId);
  await prisma.studioSet.update({ where: { id: set.id }, data: { status: 'archived' } });
  return NextResponse.json({ archived: true });
});
