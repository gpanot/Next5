// server-only — never import from a 'use client' file.
// Shorts as the admin pages see them: list rows and the full detail, with signed links to every file.

import type { ShortReel } from '@prisma/client';
import { prisma } from '../../lib/db';
import { presignObject } from '../storage/objectStore';
import type { StepCost } from '../../types/admin/metaAds';
import type { ShortAudio, ShortBeat, ShortDetailDto, ShortDto, ShortInputs, ShortScriptAttempt, ShortStatus, ShortStep } from '../../types/admin/shorts';

const sign = (key: string | null | undefined) => (key ? presignObject(key) : Promise.resolve(null));

/** Cost and time of all steps. Time includes the negative `overlap` entry: voice and photos run at the same time. */
const totals = (short: ShortReel) => {
  const costs = Object.values(short.stepCosts as Record<string, StepCost>);
  const timings = Object.values(short.stepTimings as Record<string, number>);
  return { usd: costs.reduce((s, c) => s + (c?.usdMicros ?? 0), 0), ms: timings.reduce((s, t) => s + (t ?? 0), 0) };
};

const toDto = async (short: ShortReel, workspaceName: string): Promise<ShortDto> => {
  const attempts = short.attempts as unknown as ShortScriptAttempt[];
  const audio = short.audio as unknown as ShortAudio | null;
  const { usd, ms } = totals(short);
  const [videoUrl, posterUrl] = await Promise.all([sign(short.videoKey), sign(short.posterKey)]);
  return {
    id: short.id,
    workspaceId: short.workspaceId,
    workspaceName,
    videoModel: short.videoModel,
    status: short.status as ShortStatus,
    failedStep: (short.failedStep as ShortStep | null) ?? null,
    error: short.error,
    hook: attempts[attempts.length - 1]?.script.hook ?? (short.inputs as unknown as ShortInputs | null)?.hookText ?? null,
    durationS: audio?.durationS ?? null,
    totalUsdMicros: usd,
    totalMs: ms,
    videoUrl,
    posterUrl,
    createdAt: short.createdAt.toISOString(),
    finishedAt: short.finishedAt?.toISOString() ?? null,
  };
};

const workspaceNames = async (ids: string[]): Promise<Map<string, string>> => {
  const rows = await prisma.workspace.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true } });
  return new Map(rows.map((w) => [w.id, w.name]));
};

export const listShorts = async (): Promise<ShortDto[]> => {
  const shorts = await prisma.shortReel.findMany({ orderBy: { createdAt: 'desc' }, take: 60 });
  const names = await workspaceNames(shorts.map((s) => s.workspaceId));
  return Promise.all(shorts.map((s) => toDto(s, names.get(s.workspaceId) ?? '')));
};

export const getShortDetail = async (id: string): Promise<ShortDetailDto | null> => {
  const short = await prisma.shortReel.findUnique({ where: { id } });
  if (!short) return null;
  const names = await workspaceNames([short.workspaceId]);
  const audio = short.audio as unknown as ShortAudio | null;
  const beats = short.beats as unknown as ShortBeat[];
  const inputs = short.inputs as unknown as ShortInputs | null;
  const [base, audioUrl, signedBeats, options, anchorUrl] = await Promise.all([
    toDto(short, names.get(short.workspaceId) ?? ''),
    sign(audio?.key),
    Promise.all(
      beats.map(async (b) => ({
        ...b,
        imageUrl: await sign(b.imageKey),
        imageDownloadUrl: b.imageKey ? await presignObject(b.imageKey, undefined, `short-${short.id}-shot-${b.idx + 1}.jpg`) : null,
        clipUrl: await sign(b.clipKey),
      })),
    ),
    Promise.all((audio?.options ?? []).map(async (o) => ({ ...o, sampleUrl: await sign(o.sampleKey) }))),
    sign(inputs?.anchorKey),
  ]);
  return {
    ...base,
    // Before step 1 the inputs hold only the text model.
    inputs: inputs?.brandName ? inputs : null,
    textModel: inputs?.textModel ?? null,
    anchorUrl,
    attempts: short.attempts as unknown as ShortScriptAttempt[],
    audio: audio
      ? { durationS: audio.durationS, voice: audio.voice, words: audio.words, sentences: audio.sentences, tempo: audio.tempo, rawWpm: audio.rawWpm, direction: audio.direction, pickedBy: audio.pickedBy, options, url: audioUrl }
      : null,
    beats: signedBeats,
    stepTimings: short.stepTimings as Partial<Record<ShortStep, number>>,
    stepCosts: short.stepCosts as Partial<Record<ShortStep, StepCost>>,
  };
};
