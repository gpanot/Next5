/**
 * GET  /api/admin/slideshow-knowledge/references — recent imports (poll while any is pending or reading)
 * POST /api/admin/slideshow-knowledge/references — { urls: string[] } → create a reference per new TikTok link and import
 *      them in the background: fetch → save slides → read slides → draft or join a model
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { createReferences, runImport } from '../../../../../src/server/slideshowKnowledge/importer';
import { listReferences } from '../../../../../src/server/slideshowKnowledge/store';
import { isTikTokLink } from '../../../../../src/server/slideshowKnowledge/tiktokPosts';
import { MAX_IMPORT } from '../../../../../src/types/admin/slideshowKnowledge';

// About 20-40 s per post (fetch, slide downloads, one vision call, one model call), 3 at a time.
export const maxDuration = 300;

export const GET = adminRoute(async () => json({ references: await listReferences() }));

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { urls?: unknown };
  const urls = Array.isArray(body.urls) ? body.urls.filter((u): u is string => typeof u === 'string').map((u) => u.trim()).filter(Boolean) : [];
  if (urls.length === 0) return json({ error: 'Paste at least one TikTok link' }, { status: 400 });
  if (urls.length > MAX_IMPORT) return json({ error: `Import at most ${MAX_IMPORT} posts at a time` }, { status: 400 });
  const invalid = urls.filter((u) => !isTikTokLink(u));
  if (invalid.length > 0) return json({ error: `Not a TikTok post link: ${invalid[0]}` }, { status: 400 });

  const { ids, skipped } = await createReferences(urls);
  if (ids.length > 0) waitUntil(runImport(ids));
  return json({ created: ids.length, skipped }, { status: 201 });
});
