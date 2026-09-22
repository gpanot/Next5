import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { toProjectDto } from '../../../../../src/server/admin/blitzStore';
import { prisma } from '../../../../../src/lib/db';
import type { TextConfig } from '../../../../../src/remotion/types';

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

  if (!body.templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
  }
  if (!body.captionText?.trim()) {
    return NextResponse.json({ error: 'captionText is required' }, { status: 400 });
  }
  if (!body.currentAssets?.backgroundKey || !body.currentAssets?.overlayKey) {
    return NextResponse.json({ error: 'backgroundKey and overlayKey are required' }, { status: 400 });
  }

  const template = await prisma.blitzTemplate.findUnique({ where: { id: body.templateId } });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Validate textConfig shape from template
  const textConfig = template.textConfig as TextConfig;
  if (!textConfig?.font) {
    return NextResponse.json({ error: 'Template has invalid textConfig' }, { status: 422 });
  }

  const project = await prisma.blitzProject.create({
    data: {
      templateId: body.templateId,
      // Embed textConfigOverride in the JSONB blob so the worker can apply it
      // without a schema change. Worker reads currentAssets.textConfigOverride.
      currentAssets: body.textConfigOverride
        ? { ...body.currentAssets, textConfigOverride: body.textConfigOverride }
        : body.currentAssets,
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

  return NextResponse.json(
    { projectId: project.id, status: 'PROCESSING', project: await toProjectDto(project) },
    { status: 201 },
  );
});
