// server-only — never import from a 'use client' file.
// One shot's photo made again from a prompt the admin edited, on the model the short uses. The edited text becomes the
// beat's image prompt (the same wrapper as the pipeline adds the brand look and the anchor reference). Not a pipeline
// step: it runs inside the request, and the clip made from the old photo is dropped, since it would no longer match.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { createMeter } from '../metaAds/cost';
import type { StepCost } from '../../types/admin/metaAds';
import { presignObject, putObject } from '../storage/objectStore';
import { DEFAULT_PHOTO_MODEL, type ShortBeat, type ShortInputs } from '../../types/admin/shorts';
import { makePhoto } from './media';
import { biblePhotoPrompt } from './storyboard';
import { photoPrompt } from './visuals';

const json = (v: unknown) => v as Prisma.InputJsonValue;

/** The prompt as the pipeline sends it: with the anchor as a reference for a Visual Bible short, else the classic wrapper. */
const sentPrompt = (beat: ShortBeat, inputs: ShortInputs, withReference: boolean): string =>
  inputs.visualBible ? biblePhotoPrompt(beat, inputs.visualBible, withReference) : photoPrompt(beat, inputs);

/** Returns an error message, or null when the photo was replaced. The caller has checked that the short is not running. */
export const regenerateShotPhoto = async (id: string, idx: number, prompt: string): Promise<string | null> => {
  const short = await prisma.shortReel.findUniqueOrThrow({ where: { id } });
  const inputs = short.inputs as unknown as ShortInputs | null;
  const beats = short.beats as unknown as ShortBeat[];
  const beat = beats.find((b) => b.idx === idx);
  if (!inputs || !beat) return 'Shot not found';
  const edited: ShortBeat = { ...beat, imagePrompt: prompt };
  const anchorUrl = inputs.anchorKey ? await presignObject(inputs.anchorKey, 60 * 60) : null;
  const refs = anchorUrl?.startsWith('https://') ? [anchorUrl] : [];
  const meter = createMeter();
  const photo = await makePhoto(sentPrompt(edited, inputs, refs.length > 0), meter, refs, inputs.photoModel ?? DEFAULT_PHOTO_MODEL);
  const imageKey = `shorts/${id}/frame-${idx}-${Date.now().toString(36)}.jpg`;
  await putObject(imageKey, photo, 'image/jpeg');
  // Read again: the short may have changed while the photo was made.
  const latest = await prisma.shortReel.findUniqueOrThrow({ where: { id } });
  const next = (latest.beats as unknown as ShortBeat[]).map((b) =>
    b.idx === idx ? { ...b, imagePrompt: prompt, imageKey, qa: undefined, clipKey: undefined, clipTaskId: undefined, clipSourceUrl: undefined, clipError: null, clipMs: undefined, videoPrompt: undefined } : b,
  );
  const costs = latest.stepCosts as unknown as Record<string, StepCost>;
  const spent = meter.summary();
  const photoStep = costs['3'] ?? { usdMicros: 0, items: [] };
  const merged: StepCost = { usdMicros: photoStep.usdMicros + spent.usdMicros, items: [...photoStep.items, ...spent.items.map((i) => ({ ...i, label: `Regenerated shot ${idx + 1} · ${i.label}` }))] };
  await prisma.shortReel.update({ where: { id }, data: { beats: json(next), stepCosts: json({ ...costs, 3: merged }) } });
  return null;
};
