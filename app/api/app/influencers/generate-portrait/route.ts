import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authedRoute } from '../../../../../src/server/api';
import { readJsonObject, HttpError } from '../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';
import {
  buildPortraitPrompt,
  generateAndStorePortrait,
  portraitPreviewKey,
} from '../../../../../src/server/sets/portrait';

export const maxDuration = 120;

/**
 * POST /api/app/influencers/generate-portrait
 * Body: { gender?, age?, ethnicity?, additionalDetails? }
 * Returns: { r2Key, url } — a short-lived presigned URL the wizard shows as a preview.
 * The r2Key is passed back when the user confirms to create the Influencer record.
 */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`portrait-gen:${session.userId}`, 10, 3600);

  const body = await readJsonObject(req);
  const gender = typeof body.gender === 'string' ? body.gender.trim() : null;
  const age = typeof body.age === 'number' ? body.age : null;
  const ethnicity = typeof body.ethnicity === 'string' ? body.ethnicity.trim() : null;
  const additionalDetails = typeof body.additionalDetails === 'string' ? body.additionalDetails.trim() : null;

  if (!gender && !ethnicity && !additionalDetails) {
    throw new HttpError(400, 'prompt_required', 'Describe the character: gender, ethnicity, or additional details.');
  }

  const prompt = buildPortraitPrompt({ gender, age, ethnicity, additionalDetails });

  // Use a temporary ID for the preview key; the confirmed influencer will copy/move it.
  const tempId = randomUUID();
  const r2Key = portraitPreviewKey(tempId);

  const result = await generateAndStorePortrait(r2Key, prompt);

  // Return the parsed prompt JSON alongside the image key so the wizard can persist it
  // with the Influencer record. This preserves the original portrait-clone specification
  // for future video-generation pipelines (reuse JSON, not the image).
  return NextResponse.json({ ...result, promptJson: JSON.parse(prompt) }, { status: 201 });
});
