import { NextResponse } from 'next/server';
import { isFormatId } from '../../../../src/config/formats';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../src/server/http';
import { buildMe } from '../../../../src/server/me';
import { requireWorkspace } from '../../../../src/server/workspaces/workspaces';

const HEX = /^#[0-9a-fA-F]{6}$/;

const text = (value: unknown, max: number): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_body', 'Invalid value.');
  return value.trim().slice(0, max);
};

/** PATCH /api/app/workspaces — { product, name?, handle?, industry?, brandColors?, visibleAiTag?, defaultFormats?, displayName? } */
export const PATCH = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, body.product === 'shop' ? 'shop' : body.product === 'brand' ? 'brand' : undefined);

  const name = text(body.name, 80);
  if (name === null) throw new HttpError(400, 'name_required', 'Add your business name.');
  const brandColors = Array.isArray(body.brandColors) ? body.brandColors.map(String).filter((c) => HEX.test(c)).slice(0, 2) : undefined;
  const defaultFormats = Array.isArray(body.defaultFormats) ? body.defaultFormats.map(String).filter(isFormatId) : undefined;

  await prisma.workspace.update({
    where: { id: ws.id },
    data: {
      name,
      handle: text(body.handle, 60),
      industry: text(body.industry, 30),
      brandColors,
      defaultFormats,
      visibleAiTag: typeof body.visibleAiTag === 'boolean' ? body.visibleAiTag : undefined,
    },
  });
  const displayName = text(body.displayName, 60);
  if (displayName !== undefined) await prisma.user.update({ where: { id: session.userId }, data: { displayName } });
  return NextResponse.json(await buildMe(session.userId, ws.product));
});
