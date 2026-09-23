import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { toProjectDto } from '../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../src/lib/db';
import type { TextConfig } from '../../../../../src/remotion/types';
import { BLITZ_BUSINESS_TEXT_MAX, clampBlitzDuration } from '../../../../../src/config/blitzLab';

type RenderBody = {
  templateId: string;
  currentAssets: {
    backgroundKey: string;
    overlayKey: string;
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
};

/**
 * Render settings stored in the current_assets JSON next to the asset keys.
 * The worker reads them from there, so no column (and no web/worker deploy-order
 * risk) is needed. Keys: textConfigOverride, durationSeconds, businessText, muteVideoAudio.
 */
const renderSettings = (body: RenderBody) => {
  const businessText = body.mentionBusiness ? body.businessText?.trim().slice(0, BLITZ_BUSINESS_TEXT_MAX) : undefined;
  const duration = Number(body.durationSeconds);
  return {
    ...(body.textConfigOverride ? { textConfigOverride: body.textConfigOverride } : {}),
    ...(Number.isFinite(duration) && duration > 0 ? { durationSeconds: clampBlitzDuration(duration) } : {}),
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
  if (!body.currentAssets?.backgroundKey || !body.currentAssets?.overlayKey) {
    console.warn('[blitz/render] Rejected: missing backgroundKey or overlayKey');
    return NextResponse.json({ error: 'backgroundKey and overlayKey are required' }, { status: 400 });
  }
  const keys = [body.currentAssets.backgroundKey, body.currentAssets.overlayKey, body.currentAssets.audioKey];
  if (keys.some((k) => k?.startsWith('local:'))) {
    console.warn('[blitz/render] Rejected: local: key still present — upload not finished');
    return NextResponse.json({ error: 'Wait for uploads to finish' }, { status: 400 });
  }

  const template = await prisma.blitzTemplate.findUnique({ where: { id: body.templateId } });
  if (!template) {
    console.error(`[blitz/render] Template ${body.templateId} not found`);
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Validate textConfig shape from template
  const textConfig = template.textConfig as TextConfig;
  if (!textConfig?.font) {
    console.error(`[blitz/render] Template ${body.templateId} has invalid textConfig (missing font)`);
    return NextResponse.json({ error: 'Template has invalid textConfig' }, { status: 422 });
  }

  const project = await prisma.blitzProject.create({
    data: {
      templateId: body.templateId,
      currentAssets: {
        backgroundKey: body.currentAssets.backgroundKey,
        overlayKey: body.currentAssets.overlayKey,
        ...(body.currentAssets.audioKey ? { audioKey: body.currentAssets.audioKey } : {}),
        ...renderSettings(body),
      },
      overlayZoom: body.overlayZoom ?? 1.0,
      overlayOffsetX: body.overlayOffsetX ?? 0,
      overlayOffsetY: body.overlayOffsetY ?? 0,
      mentionBusiness: body.mentionBusiness ?? false,
      regenPrompt: body.regenPrompt ?? null,
      captionText: body.captionText.trim(),
      renderStatus: 'PENDING',
      isIdentifiablePerson: body.isIdentifiablePerson ?? false,
    },
  });

  console.log(`[blitz/render] BlitzProject created: id=${project.id} status=PENDING`);

  return NextResponse.json(
    { projectId: project.id, status: 'PROCESSING', project: await toProjectDto(project) },
    { status: 201 },
  );
});
