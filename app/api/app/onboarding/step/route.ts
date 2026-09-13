import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const ONBOARDING_STEPS = 6;

/** PATCH /api/app/onboarding/step — { product, step, completed? }. Steps only move forward. */
export const PATCH = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (!isProductLine(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const step = Number(body.step);
  if (!Number.isInteger(step) || step < 0 || step > ONBOARDING_STEPS) throw new HttpError(400, 'invalid_step', 'Unknown step.');
  const ws = await requireWorkspace(session.userId, body.product);
  const updated = await prisma.workspace.update({
    where: { id: ws.id },
    data: {
      onboardingStep: Math.max(ws.onboardingStep, step),
      onboardingCompletedAt: body.completed === true ? ws.onboardingCompletedAt ?? new Date() : undefined,
    },
  });
  return NextResponse.json({ onboardingStep: updated.onboardingStep, completed: Boolean(updated.onboardingCompletedAt) });
});
