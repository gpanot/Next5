import { NextResponse } from 'next/server';
import { CONSENT_TYPES as TYPES, CONSENT_VERSION } from '../../../../src/config/consents';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../src/server/http';

/** POST /api/app/consents — { types: ('terms' | 'face_processing' | 'ai_labeling')[] } */
export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  const types = Array.isArray(body.types) ? body.types.filter((t): t is (typeof TYPES)[number] => (TYPES as readonly unknown[]).includes(t)) : [];
  if (!types.includes('terms')) throw new HttpError(400, 'terms_required', 'Accept the terms to continue.');
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req.headers.get('user-agent')?.slice(0, 300) ?? null;
  await prisma.consentRecord.createMany({
    data: types.map((type) => ({ userId: session.userId, type, version: CONSENT_VERSION, ip, userAgent })),
  });
  return NextResponse.json({ recorded: types });
});
