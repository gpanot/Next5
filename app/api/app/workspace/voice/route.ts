import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';
import type { ProductLineDto } from '../../../../../src/types/business/me';

const isProduct = (v: unknown): v is ProductLineDto => v === 'brand' || v === 'shop';

const MENTION_FREQ = ['never', 'rarely', 'sometimes', 'often', 'always'] as const;
type MentionFreq = (typeof MENTION_FREQ)[number];
const isMentionFreq = (v: unknown): v is MentionFreq => MENTION_FREQ.includes(v as MentionFreq);

const GENDER_FILTER = ['men', 'women'] as const;
type GenderFilter = (typeof GENDER_FILTER)[number];
const isGenderFilter = (v: unknown): v is GenderFilter => GENDER_FILTER.includes(v as GenderFilter);

/**
 * PATCH /api/app/workspace/voice
 * { product, mentionFrequency?, genderFilter?, websiteUrl? }
 */
export const PATCH = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (!isProduct(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, body.product);

  const data: Record<string, unknown> = {};
  if (isMentionFreq(body.mentionFrequency)) data.mentionFrequency = body.mentionFrequency;
  if (body.genderFilter === null || body.genderFilter === '') data.genderFilter = null;
  else if (isGenderFilter(body.genderFilter)) data.genderFilter = body.genderFilter;
  if (typeof body.websiteUrl === 'string') data.websiteUrl = body.websiteUrl.trim() || null;

  if (Object.keys(data).length === 0) throw new HttpError(400, 'no_changes', 'Nothing to update.');

  const updated = await prisma.workspace.update({
    where: { id: ws.id },
    data,
    select: { mentionFrequency: true, genderFilter: true, websiteUrl: true, anglesGenState: true },
  });
  return NextResponse.json(updated);
});
