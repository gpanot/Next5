import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';
import type { ProductLineDto } from '../../../../../src/types/business/me';

const isProduct = (v: unknown): v is ProductLineDto => v === 'brand' || v === 'shop';

const AUDIENCES = ['b2c', 'b2b', 'both'] as const;
type Audience = (typeof AUDIENCES)[number];
const isAudience = (v: unknown): v is Audience => AUDIENCES.includes(v as Audience);

/** One line each — longer answers make worse hooks, so they are capped rather than truncated silently. */
const MAX_LINE = 200;

const line = (value: unknown): string | null | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length > MAX_LINE) throw new HttpError(400, 'too_long', `Keep it under ${MAX_LINE} characters.`);
  return trimmed || null;
};

/**
 * PATCH /api/app/workspace/business-profile
 * { product, audienceType?, promoting?, offer? }
 *
 * What the Template Engine reads about the business. `audienceType` is asked at signup step 2;
 * this is where she corrects it, along with the two lines the campaign wizard defaults from.
 */
export const PATCH = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (!isProduct(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, body.product);

  const data: Record<string, unknown> = {};
  if (isAudience(body.audienceType)) data.audienceType = body.audienceType;
  const promoting = line(body.promoting);
  if (promoting !== undefined) data.promoting = promoting;
  const offer = line(body.offer);
  if (offer !== undefined) data.offer = offer;

  if (Object.keys(data).length === 0) throw new HttpError(400, 'no_changes', 'Nothing to update.');

  const updated = await prisma.workspace.update({
    where: { id: ws.id },
    data,
    select: { audienceType: true, promoting: true, offer: true },
  });
  return NextResponse.json(updated);
});
