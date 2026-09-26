/**
 * POST  /api/admin/studio/runs/manual — create a run from a hand-typed profile ("B2B No Website")
 * PATCH /api/admin/studio/runs/manual — save an edit of that profile as a new version
 *
 * Body: { runId? (PATCH only), profile: ManualProfileInput, photoAssetIds: string[] }
 * Returns: { runId, products } — products = the photos with their vision descriptions.
 *
 * No crawl: the run is created with extractStatus 'done', so the slideshow engine can build the
 * deck right away. New product photos are read by a vision model (src/server/studio/productPhotos.ts).
 */
import { type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { HttpError } from '../../../../../../src/server/http';
import { studioJson } from '../../../../../../src/server/studio/studioJson';
import { createManualRun, parseManualInput, updateManualRun } from '../../../../../../src/server/studio/manualProfile';

// One vision call over up to 10 photos.
export const maxDuration = 60;

type Body = { runId?: string; profile?: unknown; photoAssetIds?: unknown; workspaceId?: string };

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as Body;
  const input = parseManualInput(body.profile);
  return studioJson(await createManualRun(input, body.photoAssetIds, body.workspaceId ?? null), 201);
});

export const PATCH = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as Body;
  if (!body.runId) throw new HttpError(400, 'missing_run', 'runId is required.');
  const input = parseManualInput(body.profile);
  return studioJson(await updateManualRun(body.runId, input, body.photoAssetIds));
});
