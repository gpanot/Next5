/**
 * POST /api/admin/slideshow-knowledge/candidates — { source: 'creator' | 'keyword', query, limit? }
 * → { candidates: CandidateDto[], costMicros } — photo slideshows found, best first. Nothing is saved.
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { prisma } from '../../../../../src/lib/db';
import { creatorCandidates, handleOf, keywordCandidates } from '../../../../../src/server/slideshowKnowledge/tiktokPosts';
import { CANDIDATE_SOURCES, MAX_IMPORT, type CandidateSource } from '../../../../../src/types/admin/slideshowKnowledge';

export const maxDuration = 120;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { source?: unknown; query?: unknown; limit?: unknown };
  if (!(CANDIDATE_SOURCES as readonly unknown[]).includes(body.source)) return json({ error: 'source must be creator or keyword' }, { status: 400 });
  const source = body.source as CandidateSource;
  const query = typeof body.query === 'string' ? (source === 'creator' ? handleOf(body.query) : body.query.trim()) : '';
  if (!query) return json({ error: source === 'creator' ? 'Enter a TikTok handle, like @scratchaiapp' : 'Enter a keyword, like golf tips' }, { status: 400 });
  const limit = Math.min(Math.max(Number(body.limit) || 12, 1), MAX_IMPORT);

  const found = source === 'creator' ? await creatorCandidates(query, limit) : await keywordCandidates(query, limit);
  const imported = await prisma.slideshowReference.findMany({ where: { postId: { in: found.candidates.map((c) => c.postId) } }, select: { postId: true } });
  const done = new Set(imported.map((r) => r.postId));
  return json({ candidates: found.candidates.map((c) => ({ ...c, imported: done.has(c.postId) })), costMicros: found.costMicros });
});
