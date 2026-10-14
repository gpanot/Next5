/**
 * PATCH /api/admin/studio/runs/[runId]/candidates/[candidateId]
 *   — swipe decision: accept | reject | edit
 */
import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../../../src/server/admin/route';
import { studioJson } from '../../../../../../../../src/server/studio/studioJson';
import { prisma } from '../../../../../../../../src/lib/db';

export const maxDuration = 30;

type Ctx = { params: Promise<{ runId: string; candidateId: string }> };

export const PATCH = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId, candidateId } = await ctx.params;
  const body = (await req.json()) as {
    status?: 'accepted' | 'rejected' | 'edited';
    rejectReason?: string;
    rejectNote?: string;
    payload?: Record<string, unknown>;
  };

  const candidate = await prisma.studioCandidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate || candidate.runId !== runId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const updated = await prisma.studioCandidate.update({
    where: { id: candidateId },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.rejectReason ? { rejectReason: body.rejectReason as 'off_brand' | 'wrong_audience' | 'weak_hook' | 'bad_image' | 'factually_wrong' | 'other' } : {}),
      ...(body.rejectNote !== undefined ? { rejectNote: body.rejectNote } : {}),
      ...(body.payload ? { payload: body.payload as unknown as Parameters<typeof prisma.studioCandidate.update>[0]['data']['payload'] } : {}),
    },
  });

  return studioJson(updated);
});
