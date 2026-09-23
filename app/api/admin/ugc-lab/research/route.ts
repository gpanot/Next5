import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { tregCall, fetchTikTokTranscript, type TrendingVideo } from '../../../../../src/server/admin/ugcLab';
import { chatJson, type ChatMessage } from '../../../../../src/server/ai/openai';
import { PHASE0A_TEMPLATES } from '../../../../../src/lib/phase0aTemplates';

// ── TikTok API types — shape returned after tregCall strips the outer "data" ────

type AwemeInfo = {
  aweme_id?: string;
  share_url?: string;
  /** Unix seconds. */
  create_time?: number;
  author?: { nickname?: string; unique_id?: string };
  statistics?: { play_count?: number; digg_count?: number };
  video?: {
    cover?: { url_list?: string[] };
    ai_dynamic_cover?: { url_list?: string[] };
    /** Duration. TikHub reports milliseconds here despite the field name. */
    duration?: number;
  };
};

type SearchItemListEntry = {
  aweme_info?: AwemeInfo;
};

// Shape returned by tregCall (outer `data` field already extracted)
type TikTokSearchData = {
  search_item_list?: SearchItemListEntry[];
  aweme_list?: AwemeInfo[];
  has_more?: boolean;
};

// ── Extraction helpers ─────────────────────────────────────────────────────────

function collectAwemes(data: TikTokSearchData): AwemeInfo[] {
  // Primary: search_item_list wraps each video in aweme_info
  if (data.search_item_list?.length) {
    return data.search_item_list
      .map((item) => item.aweme_info)
      .filter((a): a is AwemeInfo => Boolean(a));
  }
  // Fallback: direct aweme_list
  return data.aweme_list ?? [];
}

/** Clean /@user/video/id URL first: share_url carries tracking params the transcript API can trip on. */
function buildTikTokUrl(aweme: AwemeInfo): string {
  const id = aweme.aweme_id;
  const user = aweme.author?.unique_id;
  if (id && user) return `https://www.tiktok.com/@${user}/video/${id}`;
  return aweme.share_url ?? '';
}

function extractPostedAt(aweme: AwemeInfo): string | null {
  const seconds = aweme.create_time;
  return typeof seconds === 'number' && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

function extractThumbnail(aweme: AwemeInfo): string {
  return (
    aweme.video?.cover?.url_list?.[0] ??
    aweme.video?.ai_dynamic_cover?.url_list?.[0] ??
    ''
  );
}

/**
 * Duration in seconds (integer), or null when not available.
 *
 * TikHub returns milliseconds (a 62 s clip comes back as 62000), but older
 * cached rows and other providers use seconds. No TikTok is longer than
 * 10 minutes, so anything above 1000 is milliseconds.
 */
function extractDuration(aweme: AwemeInfo): number | null {
  const d = aweme.video?.duration;
  if (typeof d !== 'number' || d <= 0) return null;
  return Math.round(d > 1000 ? d / 1000 : d);
}

// ── Hook + template classification via gpt-4o-mini ───────────────────────────

/** The template menu the classifier picks from, built once at module load. */
const TEMPLATE_MENU = PHASE0A_TEMPLATES
  .map((t) => `${t.id}. ${t.name} — ${t.pillar}. Format: ${t.structure.join(' → ')}`)
  .join('\n');

const CLASSIFY_SYSTEM_PROMPT = [
  'You read TikTok transcripts for small-business marketing research.',
  'You do two things at once: pull out the opening hook, and say which content template the video follows.',
  '',
  'The hook is the first sentence that grabs attention — the first 5-10 seconds of speech.',
  'Return it as the exact spoken words. No paraphrasing, no additions.',
  '',
  'Templates:',
  TEMPLATE_MENU,
  '',
  'Judge the template from the whole transcript — what the video DOES, not the words it opens with.',
  'A video that walks through a repair is a Before/After or Day in the Life, not a tips list,',
  'even when nobody says "before" or "tips" out loud. Pick the closest fit; every video gets one.',
  '',
  'Return JSON: { "hook": "...", "template_id": <number 1-18> }',
].join('\n');

type Classification = { hook: string; template_id: number | null };

/**
 * The opening hook plus the Phase 0A template the video follows.
 *
 * Both come from one call: the classifier needs the transcript either way, and
 * keyword-matching the hook alone put 9 of 10 results on the fallback template.
 */
async function classifyVideo(transcript: string): Promise<Classification> {
  if (!transcript.trim()) return { hook: '', template_id: null };

  const messages: ChatMessage[] = [
    { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
    { role: 'user', content: `Transcript:\n${transcript.slice(0, 2500)}` },
  ];

  const result = await chatJson<{ hook?: string; template_id?: number }>(messages, {
    maxTokens: 200,
    temperature: 0.1,
    timeoutMs: 20_000,
  });

  const hook = result?.hook?.trim() || transcript.split(/[.!?]/)[0]?.trim() || '';
  const id = result?.template_id;
  const templateId = typeof id === 'number' && PHASE0A_TEMPLATES.some((t) => t.id === id) ? id : null;
  return { hook, template_id: templateId };
}

// ── Route ─────────────────────────────────────────────────────────────────────

// Search (≤30 s) + AI transcript fallback (≤60 s) + hook (≤15 s) can pass the 60 s default.
export const maxDuration = 120;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as { industry?: string };
  const industry = body.industry?.trim();

  if (!industry) {
    return NextResponse.json({ error: 'industry is required' }, { status: 400 });
  }

  // 1. Search TikTok for trending videos in this industry
  const searchData = await tregCall<TikTokSearchData>(
    'tikhub.tiktok.search.videos',
    {
      query: { keyword: industry, count: 10, sort_type: 1 },
      timeoutMs: 30_000,
    },
  );

  const awemes = collectAwemes(searchData).slice(0, 10);

  if (awemes.length === 0) {
    return NextResponse.json({ videos: [] });
  }

  // 2. Fetch full transcripts, then extract each hook, all videos in parallel
  const videos: TrendingVideo[] = await Promise.all(
    awemes.map(async (a): Promise<TrendingVideo> => {
      const id = a.aweme_id ?? '';
      const videoUrl = buildTikTokUrl(a);
      const raw_transcript = videoUrl ? await fetchTikTokTranscript(videoUrl) : '';
      const { hook, template_id } = await classifyVideo(raw_transcript);

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
        hook,
        template_id,
      };
    }),
  );

  return NextResponse.json({ videos });
});
