/**
 * POST /api/admin/copy-viral/upload?title=… — body: the reference video file itself (not multipart), streamed to disk.
 * Analysis then runs in the background. Localhost only.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../src/server/admin/route';
import { startFromUpload } from '../../../../../src/server/copyViral/pipeline';
import { copyViralRoute } from '../../../../../src/server/copyViral/route';
import { createProject } from '../../../../../src/server/copyViral/store';

export const POST = copyViralRoute(async (req: NextRequest) => {
  if (!req.body) return json({ error: 'No video in the request' }, { status: 400 });
  const title = req.nextUrl.searchParams.get('title')?.trim() || 'Uploaded reel';
  const project = await createProject(title, null);
  return json({ project: await startFromUpload(project, req.body) });
});
