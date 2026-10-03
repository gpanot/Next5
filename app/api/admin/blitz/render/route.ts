import { NextResponse, type NextRequest } from 'next/server';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { toProjectDto } from '../../../../../src/server/admin/blitzStore';
import { queueBlitzRender, type RenderBody } from '../../../../../src/server/labs/blitzRender';

/**
 * POST /api/admin/blitz/render
 *
 * Atomically creates a BlitzProject with renderStatus=PENDING and returns
 * { projectId, status: "PROCESSING" } immediately. The actual Remotion render
 * is performed by the Railway blitz-worker, which polls for PENDING rows.
 *
 * This route NEVER runs @remotion/renderer — that would time out on Vercel.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  const body = (await req.json()) as RenderBody;
  console.log('[blitz/render] POST received', {
    templateId: body.templateId,
    captionText: body.captionText?.slice(0, 60),
    backgroundKey: body.currentAssets?.backgroundKey,
    slidesCount: body.slides?.length,
    durationSeconds: body.durationSeconds,
  });
  const project = await queueBlitzRender(access, body);
  return NextResponse.json(
    { projectId: project.id, status: 'PROCESSING', project: await toProjectDto(project) },
    { status: 201 },
  );
});
