/**
 * src/server/labs/assetDescriptor/db.ts
 *
 * DB write helpers for the asset descriptor pipeline.
 * These are called by the worker after a successful describe + validate cycle.
 *
 * Separation of concerns:
 *  - This file knows about Prisma types and the AssetDescriptor schema.
 *  - The rest of the pipeline (measure, prompts, gemini, validate) is DB-free.
 */

import { prisma } from '../../../lib/db';
import type { Prisma } from '@prisma/client';
import type { VideoDescriptor, MusicDescriptor, AssetKind, AssetSource } from './types';
import { getModelName } from './gemini';

const DESCRIPTOR_VERSION = 5;

// ── Source-keyed upsert ───────────────────────────────────────────────────────

type RowSource =
  | { blitzAssetId: string }
  | { ugcVideoId: string };

async function upsert(
  source: RowSource,
  data: Omit<Prisma.AssetDescriptorUncheckedCreateInput, 'id' | 'blitzAssetId' | 'ugcVideoId'>,
): Promise<void> {
  const where = source;
  const ex = await prisma.assetDescriptor.findFirst({ where });
  if (ex) {
    await prisma.assetDescriptor.update({
      where: { id: ex.id },
      data:  { ...data, updatedAt: new Date() },
    });
  } else {
    const idSuffix = 'blitzAssetId' in source
      ? source.blitzAssetId.slice(0, 12)
      : (source as { ugcVideoId: string }).ugcVideoId.slice(0, 12);
    await prisma.assetDescriptor.create({
      data: {
        id: `desc-${idSuffix}`,
        ...source,
        ...(data as Prisma.AssetDescriptorUncheckedCreateInput),
      },
    });
  }
}

// ── Write video descriptor ────────────────────────────────────────────────────

export async function writeVideo(
  source: RowSource,
  kind: AssetKind,
  assetSource: AssetSource,
  d: VideoDescriptor,
  durationSec: number,
  cuts: number[],
  loudDigits: string,
): Promise<void> {
  await upsert(source, {
    kind,
    source: assetSource,
    status: 'done',
    model: getModelName(),
    descriptorVersion: DESCRIPTOR_VERSION,
    durationSec,
    sceneCuts:    cuts as unknown as Prisma.InputJsonValue,
    loudnessCurve: loudDigits as unknown as Prisma.InputJsonValue,
    descriptor:   d as unknown as Prisma.InputJsonValue,
    retrievalText: d.retrievalText,
    mood:          d.vibe,
    pacing:        d.pacing,
    hasSpeech:     d.hasSpeech,
    rightsRisk:    d.rightsRisk,
    identifiablePerson: d.identifiablePerson,
    publicFigureLikely: d.publicFigureLikely,
    avoidFor:      d.avoidFor,
    energyLevel:   d.energyLevel,
    textSafeZone:  d.textSafeZone,
    slotHook:      d.slotScores.hook,
    slotProblem:   d.slotScores.problem,
    slotProof:     d.slotScores.proof,
    slotPayoff:    d.slotScores.payoff,
    slotCta:       d.slotScores.cta,
    nicheRealtor:  d.nicheScores.realtor,
    nicheTiktokShop: d.nicheScores.tiktokShop,
  });
}

// ── Write music descriptor ────────────────────────────────────────────────────

export async function writeMusic(
  source: RowSource,
  assetSource: AssetSource,
  d: MusicDescriptor,
  durationSec: number,
  loudDigits: string,
): Promise<void> {
  await upsert(source, {
    kind: 'music',
    source: assetSource,
    status: 'done',
    model: getModelName(),
    descriptorVersion: DESCRIPTOR_VERSION,
    durationSec,
    loudnessCurve: loudDigits as unknown as Prisma.InputJsonValue,
    descriptor:   d as unknown as Prisma.InputJsonValue,
    retrievalText: d.retrievalText,
    mood:          d.vibe,
    pacing:        d.pacing,
    hasSpeech:     d.hasVocals,
    rightsRisk:    d.rightsRisk,
    avoidFor:      d.avoidFor,
    energyLevel:   d.energyLevel,
    bpmEstimate:   d.bpmEstimate,
    nicheRealtor:  d.nicheScores.realtor,
    nicheTiktokShop: d.nicheScores.tiktokShop,
  });
}

// ── Mark failed ───────────────────────────────────────────────────────────────

export async function markFailed(
  source: RowSource,
  kind: AssetKind,
  assetSource: AssetSource,
  error: string,
): Promise<void> {
  await upsert(source, {
    kind,
    source: assetSource,
    status: 'failed',
    model: getModelName(),
    descriptorVersion: DESCRIPTOR_VERSION,
    error,
  });
}
