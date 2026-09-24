import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { fetchTikTokTranscript, type TrendingVideo } from '../../../../../src/server/admin/ugcLab';
import { listTemplates } from '../../../../../src/server/templates/repository';
import type { TemplateDto } from '../../../../../src/server/templates/dto';
import {
  buildTikTokUrl,
  classifyVideo,
  extractDuration,
  extractPostedAt,
  extractThumbnail,
  searchTikTok,
} from '../../../../../src/server/research/tiktokResearch';

/** The global library, read once per request rather than once per video. */
let libraryPromise: Promise<TemplateDto[]> | null = null;
const templateLibrary = (): Promise<TemplateDto[]> => {
  libraryPromise ??= listTemplates({ status: 'active' });
  return libraryPromise;
};

// ── Route ─────────────────────────────────────────────────────────────────────

// Search (≤30 s) + AI transcript fallback (≤60 s) + hook (≤15 s) can pass the 60 s default.
export const maxDuration = 120;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as { industry?: string };
  const industry = body.industry?.trim();

  if (!industry) {
    return NextResponse.json({ error: 'industry is required' }, { status: 400 });
  }

  const routeStart = Date.now();

  // 1. Search TikTok for trending videos in this industry
  const tregStart = Date.now();
  const awemes = await searchTikTok(industry, 10);
  const tregElapsedMs = Date.now() - tregStart;

  if (awemes.length === 0) {
    return NextResponse.json({ videos: [], meta: { elapsedMs: Date.now() - routeStart, tregElapsedMs, aiElapsedMs: 0, aiPromptTokens: 0, aiCompletionTokens: 0 } });
  }

  // 2. Fetch full transcripts, then extract each hook, all videos in parallel
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalAiElapsedMs = 0;

  const videos: TrendingVideo[] = await Promise.all(
    awemes.map(async (a): Promise<TrendingVideo> => {
      const id = a.aweme_id ?? '';
      const videoUrl = buildTikTokUrl(a);
      const raw_transcript = videoUrl ? await fetchTikTokTranscript(videoUrl) : '';
      const classification = await classifyVideo(raw_transcript, await templateLibrary());
      totalPromptTokens += classification.promptTokens;
      totalCompletionTokens += classification.completionTokens;
      totalAiElapsedMs = Math.max(totalAiElapsedMs, classification.elapsedMs);

      return {
        id,
        video_url: videoUrl,
        thumbnail: extractThumbnail(a),
        author: a.author?.nickname ?? a.author?.unique_id ?? 'Unknown',
        views: a.statistics?.play_count ?? 0,
        likes: a.statistics?.digg_count ?? 0,
        posted_at: extractPostedAt(a),
        duration: extractDuration(a),
        raw_transcript,
        hook: classification.hook,
        template_id: classification.template_id,
      };
    }),
  );

  return NextResponse.json({
    videos,
    meta: {
      elapsedMs: Date.now() - routeStart,
      tregElapsedMs,
      aiElapsedMs: totalAiElapsedMs,
      aiPromptTokens: totalPromptTokens,
      aiCompletionTokens: totalCompletionTokens,
    },
  });
});
