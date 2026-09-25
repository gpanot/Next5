import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { toProjectDto } from '../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../src/lib/db';
import type { TextConfig } from '../../../../../src/remotion/types';
import {
  BLITZ_BUSINESS_TEXT_MAX,
  BLITZ_MAX_DURATION_S,
  BLITZ_SLIDESHOW_MAX_DURATION_S,
  clampBlitzDuration,
} from '../../../../../src/config/blitzLab';

type RenderBody = {
  templateId: string;
  currentAssets: {
    backgroundKey: string;
    overlayKey?: string;   // optional for CAROUSEL (no overlay)
    audioKey?: string;
  };
  overlayZoom?: number;
  overlayOffsetX?: number;
  overlayOffsetY?: number;
  mentionBusiness?: boolean;
  regenPrompt?: string;
  captionText: string;
  isIdentifiablePerson?: boolean;
  /** Partial TextConfig overrides from the editor (font, color, strokeWidth, etc.) */
  textConfigOverride?: Partial<TextConfig>;
  /** Clip length measured in the browser (shortest video layer). */
  durationSeconds?: number;
  /** Business line drawn on the video when mentionBusiness is on. */
  businessText?: string;
  /** Silence the sound of the video layers. */
  muteVideoAudio?: boolean;
  /** Slide texts for CAROUSEL type.
   * Accepts string[] (legacy) or SlideData[] (new format with per-slide backgroundKey). */
  slides?: Array<string | SlideBody>;
  /** Everything needed to re-open this render in the editor (Remix). Stored as-is, size-capped. */
  set?: unknown;
};

/** Max stored Set size: a 7-shot deck Set with swaps is ~15 KB. */
const MAX_SET_BYTES = 200_000;

const cleanSet = (set: unknown): object | null => {
  if (!set || typeof set !== 'object' || Array.isArray(set)) return null;
  return JSON.stringify(set).length <= MAX_SET_BYTES ? set : null;
};

type SlideBody = { text: string; backgroundKey?: string; durationSec?: number; trimStart?: number; positionY?: number };

/** Keeps only well-formed per-slide timing: 1–10 s slides, non-negative trims, positions inside the frame. */
const cleanSlide = (s: SlideBody): SlideBody => {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const durationSec = num(s.durationSec);
  const trimStart = num(s.trimStart);
  const positionY = num(s.positionY);
  return {
    text: s.text,
    ...(s.backgroundKey ? { backgroundKey: s.backgroundKey } : {}),
    ...(durationSec !== undefined ? { durationSec: Math.min(10, Math.max(1, durationSec)) } : {}),
    ...(trimStart !== undefined && trimStart > 0 ? { trimStart } : {}),
    ...(positionY !== undefined ? { positionY: Math.min(0.95, Math.max(0.05, positionY)) } : {}),
  };
};

/**
 * Render settings stored in the current_assets JSON next to the asset keys.
 * The worker reads them from there, so no column (and no web/worker deploy-order
 * risk) is needed. Keys: textConfigOverride, durationSeconds, businessText, muteVideoAudio.
 *
 * @param maxDurationSeconds - the clip-length ceiling for this template type.
 */
const renderSettings = (body: RenderBody, maxDurationSeconds: number) => {
  const businessText = body.mentionBusiness ? body.businessText?.trim().slice(0, BLITZ_BUSINESS_TEXT_MAX) : undefined;
  const duration = Number(body.durationSeconds);
  return {
    ...(body.textConfigOverride ? { textConfigOverride: body.textConfigOverride } : {}),
    ...(Number.isFinite(duration) && duration > 0
      ? { durationSeconds: clampBlitzDuration(duration, maxDurationSeconds) }
      : {}),
    ...(businessText ? { businessText } : {}),
    ...(body.muteVideoAudio ? { muteVideoAudio: true } : {}),
  };
};

/**
 * POST /api/admin/blitz/render
 *
 * Atomically creates a BlitzProject with renderStatus=PENDING and returns
 * { projectId, status: "PROCESSING" } immediately. The actual Remotion render
 * is performed by the Railway blitz-worker, which polls for PENDING rows.
 *
 * This route NEVER runs @remotion/renderer — that would time out on Vercel.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as RenderBody;

  console.log('[blitz/render] POST received', {
    templateId: body.templateId,
    captionText: body.captionText?.slice(0, 60),
    backgroundKey: body.currentAssets?.backgroundKey,
    overlayKey: body.currentAssets?.overlayKey,
    audioKey: body.currentAssets?.audioKey,
    slidesCount: body.slides?.length,
    durationSeconds: body.durationSeconds,
    mentionBusiness: body.mentionBusiness,
    muteVideoAudio: body.muteVideoAudio,
  });

  if (!body.templateId) {
    console.warn('[blitz/render] Rejected: missing templateId');
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
  }
  if (!body.captionText?.trim()) {
    console.warn('[blitz/render] Rejected: missing captionText');
    return NextResponse.json({ error: 'captionText is required' }, { status: 400 });
  }
  if (!body.currentAssets?.backgroundKey) {
    console.warn('[blitz/render] Rejected: missing backgroundKey');
    return NextResponse.json({ error: 'backgroundKey is required' }, { status: 400 });
  }

  // Fetch template first so we can check whether overlayKey is required
  const template = await prisma.blitzTemplate.findUnique({ where: { id: body.templateId } });
  if (!template) {
    console.error(`[blitz/render] Template ${body.templateId} not found`);
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // overlayKey is required only for non-CAROUSEL templates
  if (template.type !== 'CAROUSEL' && !body.currentAssets?.overlayKey) {
    console.warn('[blitz/render] Rejected: missing overlayKey for non-CAROUSEL template');
    return NextResponse.json({ error: 'overlayKey is required' }, { status: 400 });
  }

  // Normalize slides early so we can validate per-slide backgroundKeys below
  const normalizedSlides = (body.slides ?? []).map((s) =>
    typeof s === 'string' ? { text: s } : cleanSlide(s),
  );

  const keys = [
    body.currentAssets.backgroundKey,
    body.currentAssets.overlayKey,
    body.currentAssets.audioKey,
    // Also check per-slide backgroundKeys
    ...normalizedSlides.map((s) => s.backgroundKey),
  ];
  if (keys.some((k) => k?.startsWith('local:'))) {
    console.warn('[blitz/render] Rejected: local: key still present — upload not finished');
    return NextResponse.json({ error: 'Wait for uploads to finish' }, { status: 400 });
  }

  // Validate textConfig shape from template
  const textConfig = template.textConfig as TextConfig;
  if (!textConfig?.font) {
    console.error(`[blitz/render] Template ${body.templateId} has invalid textConfig (missing font)`);
    return NextResponse.json({ error: 'Template has invalid textConfig' }, { status: 422 });
  }

  // For CAROUSEL: derive captionText from slides[0] if not already set
  const nonEmptySlides = normalizedSlides.filter((s) => s.text.trim());
  const captionText = body.captionText.trim() || (nonEmptySlides[0]?.text ?? '');

  const project = await prisma.blitzProject.create({
    data: {
      templateId: body.templateId,
      currentAssets: {
        backgroundKey: body.currentAssets.backgroundKey,
        ...(body.currentAssets.overlayKey ? { overlayKey: body.currentAssets.overlayKey } : {}),
        ...(body.currentAssets.audioKey ? { audioKey: body.currentAssets.audioKey } : {}),
        // Store slides array for CAROUSEL — worker reads currentAssets.slides
        ...(nonEmptySlides.length > 0 ? { slides: nonEmptySlides } : {}),
        // Set: provenance + swaps so the render can be remixed later (the worker ignores it).
        ...(cleanSet(body.set) ? { set: cleanSet(body.set)! } : {}),
        // A still-image slideshow has no footage to follow, so it may run longer
        // than the footage cap. Anything else stays on BLITZ_MAX_DURATION_S.
        ...renderSettings(
          body,
          template.type === 'CAROUSEL' ? BLITZ_SLIDESHOW_MAX_DURATION_S : BLITZ_MAX_DURATION_S,
        ),
      },
      overlayZoom: body.overlayZoom ?? 1.0,
      overlayOffsetX: body.overlayOffsetX ?? 0,
      overlayOffsetY: body.overlayOffsetY ?? 0,
      mentionBusiness: body.mentionBusiness ?? false,
      regenPrompt: body.regenPrompt ?? null,
      captionText,
      renderStatus: 'PENDING',
      isIdentifiablePerson: body.isIdentifiablePerson ?? false,
    },
  });

  console.log(`[blitz/render] BlitzProject created: id=${project.id} status=PENDING template.type=${template.type}`);

  return NextResponse.json(
    { projectId: project.id, status: 'PROCESSING', project: await toProjectDto(project) },
    { status: 201 },
  );
});
