import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { tregCall, fetchTikTokTranscript, type TrendingVideo } from '../../../../../src/server/admin/ugcLab';
import { chatJson, type ChatMessage } from '../../../../../src/server/ai/openai';

// ── TikTok search types ────────────────────────────────────────────────────────

type RawVideo = {
  aweme_id?: string;
  id?: string;
  video_id?: string;
  share_url?: string;
  web_url?: string;
  url?: string;
  desc?: string;
  author?: { nickname?: string; unique_id?: string };
  statistics?: { play_count?: number; comment_count?: number; digg_count?: number };
  video?: { cover?: { url_list?: string[] }; play_addr?: { url_list?: string[] }; duration?: number };
};

type SearchResult = {
  data?: {
    videos?: RawVideo[];
    aweme_list?: RawVideo[];
    item_list?: RawVideo[];
  };
  videos?: RawVideo[];
};

function extractVideoId(v: RawVideo): string {
  return v.aweme_id ?? v.id ?? v.video_id ?? '';
}

function extractVideoUrl(v: RawVideo): string {
  return v.share_url ?? v.web_url ?? v.url ?? '';
}

function extractThumbnail(v: RawVideo): string {
  return v.video?.cover?.url_list?.[0] ?? '';
}

function extractViews(v: RawVideo): number {
  return v.statistics?.play_count ?? 0;
}

function extractLikes(v: RawVideo): number {
  return v.statistics?.digg_count ?? 0;
}

function extractAuthor(v: RawVideo): string {
  return v.author?.nickname ?? v.author?.unique_id ?? 'Unknown';
}

function extractRawVideos(result: SearchResult): RawVideo[] {
  return (
    result.data?.videos ??
    result.data?.aweme_list ??
    result.data?.item_list ??
    result.videos ??
    []
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
  const searchResult = await tregCall<SearchResult>(
    'tikhub.tiktok.search.videos',
    {
      query: { keyword: industry, count: 10, sort_type: 1 },
      timeoutMs: 30_000,
    },
  );

  const rawVideos = extractRawVideos(searchResult).slice(0, 10);

  if (rawVideos.length === 0) {
    return NextResponse.json({ videos: [] });
  }

  // 2. Fetch transcripts + extract hooks in parallel
  const videos: TrendingVideo[] = await Promise.all(
    rawVideos.map(async (v): Promise<TrendingVideo> => {
      const id = extractVideoId(v);
      const raw_transcript = id ? await fetchTikTokTranscript(id) : '';
      const hook = await extractHook(raw_transcript);

      return {
        id,
        video_url: extractVideoUrl(v),
        thumbnail: extractThumbnail(v),
        author: extractAuthor(v),
        views: extractViews(v),
        likes: extractLikes(v),
        raw_transcript,
        hook,
      };
    }),
  );

  return NextResponse.json({ videos });
});
