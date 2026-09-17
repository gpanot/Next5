import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { tregCall, fetchTikTokTranscript, type TrendingVideo } from '../../../../../src/server/admin/ugcLab';
import { chatJson, type ChatMessage } from '../../../../../src/server/ai/openai';

// ── TikTok API types — shape returned after tregCall strips the outer "data" ────

type AwemeInfo = {
  aweme_id?: string;
  share_url?: string;
  author?: { nickname?: string; unique_id?: string };
  statistics?: { play_count?: number; digg_count?: number };
  video?: {
    cover?: { url_list?: string[] };
    ai_dynamic_cover?: { url_list?: string[] };
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

function buildTikTokUrl(aweme: AwemeInfo): string {
  if (aweme.share_url) return aweme.share_url;
  const id = aweme.aweme_id;
  const user = aweme.author?.unique_id;
  if (id && user) return `https://www.tiktok.com/@${user}/video/${id}`;
  return '';
}

function extractThumbnail(aweme: AwemeInfo): string {
  return (
    aweme.video?.cover?.url_list?.[0] ??
    aweme.video?.ai_dynamic_cover?.url_list?.[0] ??
    ''
  );
}

// ── Hook extraction via gpt-4o-mini ───────────────────────────────────────────

async function extractHook(transcript: string): Promise<string> {
  if (!transcript.trim()) return '';

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You extract the opening hook from TikTok video transcripts. ' +
        'The hook is the very first sentence that grabs attention — usually the first 5-10 seconds of speech. ' +
        'Return JSON: { "hook": "<exact spoken words, no paraphrasing, no additions>" }. ' +
        'If no clear hook, return the first sentence verbatim.',
    },
    {
      role: 'user',
      content: `Transcript:\n${transcript.slice(0, 1500)}`,
    },
  ];

  const result = await chatJson<{ hook: string }>(messages, {
    maxTokens: 120,
    temperature: 0.1,
    timeoutMs: 15_000,
  });

  return result?.hook ?? transcript.split(/[.!?]/)[0]?.trim() ?? '';
}

// ── Route ─────────────────────────────────────────────────────────────────────

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

  // 2. Fetch transcripts + extract hooks in parallel
  const videos: TrendingVideo[] = await Promise.all(
    awemes.map(async (a): Promise<TrendingVideo> => {
      const id = a.aweme_id ?? '';
      const videoUrl = buildTikTokUrl(a);
      const raw_transcript = videoUrl ? await fetchTikTokTranscript(videoUrl) : '';
      const hook = await extractHook(raw_transcript);

      return {
        id,
        video_url: buildTikTokUrl(a),
        thumbnail: extractThumbnail(a),
        author: a.author?.nickname ?? a.author?.unique_id ?? 'Unknown',
        views: a.statistics?.play_count ?? 0,
        likes: a.statistics?.digg_count ?? 0,
        raw_transcript,
        hook,
      };
    }),
  );

  return NextResponse.json({ videos });
});
