import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { generateAnglesForWorkspace } from '../../../../../src/server/ai/anglesExtractor';
import { isProductLine, requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const ONBOARDING_STEPS = 9;

/** PATCH /api/app/onboarding/step — { product, step, completed?, ...qualData }. Steps only move forward. */
export const PATCH = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (!isProductLine(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const step = Number(body.step);
  if (!Number.isInteger(step) || step < 0 || step > ONBOARDING_STEPS) throw new HttpError(400, 'invalid_step', 'Unknown step.');
  const ws = await requireWorkspace(session.userId, body.product);

  // Extract and validate workspace + B2B qualification fields if provided
  const qualData: Record<string, unknown> = {};
  // Step 2 — business profile
  if (typeof body.websiteUrl === 'string' && body.websiteUrl) qualData.websiteUrl = body.websiteUrl;
  // Legacy: some older clients still send workspaceName — accept but ignore (name stays as display name)
  if (typeof body.workspaceName === 'string' && body.workspaceName && !qualData.websiteUrl) qualData.websiteUrl = body.workspaceName;
  if (typeof body.industry === 'string' && body.industry) qualData.industry = body.industry;
  // Step 3 — team + revenue
  if (typeof body.teamSize === 'string' && body.teamSize) qualData.teamSize = body.teamSize;
  if (typeof body.monthlyRevenue === 'string' && body.monthlyRevenue) qualData.monthlyRevenue = body.monthlyRevenue;
  // Step 4 — role
  if (typeof body.role === 'string' && body.role) qualData.obRole = body.role;
  // Step 5 — intent + goals
  if (typeof body.signupIntent === 'string' && body.signupIntent) qualData.signupIntent = body.signupIntent;
  if (Array.isArray(body.goals)) qualData.goals = body.goals.map(String);
  // Step 6 — attribution
  if (Array.isArray(body.attribution)) qualData.attribution = body.attribution.map(String);

  const updated = await prisma.workspace.update({
    where: { id: ws.id },
    data: {
      onboardingStep: Math.max(ws.onboardingStep, step),
      onboardingCompletedAt: body.completed === true ? ws.onboardingCompletedAt ?? new Date() : undefined,
      ...qualData,
    },
  });

  // Step 2 saved a websiteUrl for the first time → kick off background angle extraction.
  // Fire-and-forget: don't await so we don't block the wizard advancing.
  if (step === 2 && qualData.websiteUrl && ws.anglesGenState === 'idle') {
    void generateAnglesForWorkspace(ws.id);
  }

  return NextResponse.json({ onboardingStep: updated.onboardingStep, completed: Boolean(updated.onboardingCompletedAt) });
});
