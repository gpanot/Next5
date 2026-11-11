/**
 * GET  /api/admin/copy-viral — every Copy Viral Post project, newest first
 * POST /api/admin/copy-viral — { url, title? } → new project from a TikTok or Instagram reel link (downloaded via treg)
 * Localhost only. A reel file is sent to ./upload instead.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../src/server/admin/route';
import { startFromUrl } from '../../../../src/server/copyViral/pipeline';
import { copyViralRoute } from '../../../../src/server/copyViral/route';
import { createProject, listProjects } from '../../../../src/server/copyViral/store';

export const GET = copyViralRoute(async () => json({ projects: await listProjects() }));

const titleFromUrl = (url: URL) => {
  const parts = url.pathname.split('/').filter(Boolean);
  return `${url.hostname.replace(/^www\./, '').split('.')[0]} ${parts[parts.length - 1] ?? ''}`.trim();
};

export const POST = copyViralRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { url?: unknown; title?: unknown };
  let url: URL;
  try {
    url = new URL(String(body.url ?? '').trim());
  } catch {
    return json({ error: 'Paste a full reel link (https://…)' }, { status: 400 });
  }
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : titleFromUrl(url);
  const project = await createProject(title, url.toString());
  startFromUrl(project);
  return json({ project });
});
