/**
 * TikTok research — shared by the Blitz researcher (/api/admin/ugc-lab/research) and the
 * Campaign Studio research step. One search + one classifier, so the two cannot drift apart.
 */
// server-only
import { tregCall } from '../admin/ugcLab';
import { chatJsonWithMeta, type ChatMessage } from '../ai/openai';
import type { TemplateDto } from '../templates/dto';

// ── TikTok API types — shape returned after tregCall strips the outer "data" ────

export type AwemeInfo = {
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

type TikTokSearchData = {
  search_item_list?: Array<{ aweme_info?: AwemeInfo }>;
  aweme_list?: AwemeInfo[];
  has_more?: boolean;
};

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

/** Top TikTok videos for a keyword (TikHub via treg, sorted by relevance). */
export async function searchTikTok(keyword: string, count = 10): Promise<AwemeInfo[]> {
  const data = await tregCall<TikTokSearchData>('tikhub.tiktok.search.videos', {
    query: { keyword, count, sort_type: 1 },
    timeoutMs: 30_000,
  });
  return collectAwemes(data).slice(0, count);
}

// ── Extraction helpers ─────────────────────────────────────────────────────────

/** Clean /@user/video/id URL first: share_url carries tracking params the transcript API can trip on. */
export function buildTikTokUrl(aweme: AwemeInfo): string {
  const id = aweme.aweme_id;
  const user = aweme.author?.unique_id;
  if (id && user) return `https://www.tiktok.com/@${user}/video/${id}`;
  return aweme.share_url ?? '';
}

export function extractPostedAt(aweme: AwemeInfo): string | null {
  const seconds = aweme.create_time;
  return typeof seconds === 'number' && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

export function extractThumbnail(aweme: AwemeInfo): string {
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
export function extractDuration(aweme: AwemeInfo): number | null {
  const d = aweme.video?.duration;
  if (typeof d !== 'number' || d <= 0) return null;
  return Math.round(d > 1000 ? d / 1000 : d);
}

// ── Hook + template classification via gpt-4o-mini ───────────────────────────

/**
 * The template menu the classifier picks from. Only global templates, since the
 * classifier's answer is cached against a video, not against a workspace.
 */
const templateMenu = (templates: readonly TemplateDto[]): string =>
  templates
    .filter((t) => t.legacyId !== null)
    .map((t) => `${t.legacyId}. ${t.name} — ${t.pillarName}. Format: ${t.beats.map((b) => b.label).join(' → ')}`)
    .join('\n');

const classifySystemPrompt = (templates: readonly TemplateDto[]): string =>
  [
    'You read TikTok transcripts for small-business marketing research.',
    'You do two things at once: pull out the opening hook, and say which content template the video follows.',
    '',
    'The hook is the first sentence that grabs attention — the first 5-10 seconds of speech.',
    'Return it as the exact spoken words. No paraphrasing, no additions.',
    '',
    'Templates:',
    templateMenu(templates),
    '',
    'Judge the template from the whole transcript — what the video DOES, not the words it opens with.',
    'A video that walks through a repair is a Before/After or Day in the Life, not a tips list,',
    'even when nobody says "before" or "tips" out loud. Pick the closest fit; every video gets one.',
    '',
    'Return JSON: { "hook": "...", "template_id": <number> }',
  ].join('\n');

export type Classification = {
  hook: string;
  template_id: number | null;
  promptTokens: number;
  completionTokens: number;
  elapsedMs: number;
};

/**
 * The opening hook plus the template the video follows.
 *
 * Both come from one call: the classifier needs the transcript either way, and
 * keyword-matching the hook alone put 9 of 10 results on the fallback template.
 */
export async function classifyVideo(transcript: string, templates: readonly TemplateDto[]): Promise<Classification> {
  if (!transcript.trim()) return { hook: '', template_id: null, promptTokens: 0, completionTokens: 0, elapsedMs: 0 };

  const messages: ChatMessage[] = [
    { role: 'system', content: classifySystemPrompt(templates) },
    { role: 'user', content: `Transcript:\n${transcript.slice(0, 2500)}` },
  ];

  const { result, meta } = await chatJsonWithMeta<{ hook?: string; template_id?: number }>(messages, {
    maxTokens: 200,
    temperature: 0.1,
    timeoutMs: 20_000,
  });

  const hook = result?.hook?.trim() || transcript.split(/[.!?]/)[0]?.trim() || '';
  const id = result?.template_id;
  const templateId = typeof id === 'number' && templates.some((t) => t.legacyId === id) ? id : null;
  return {
    hook,
    template_id: templateId,
    promptTokens: meta.usage?.promptTokens ?? 0,
    completionTokens: meta.usage?.completionTokens ?? 0,
    elapsedMs: meta.elapsedMs,
  };
}

/** gpt-4o-mini: $0.15 / 1M input, $0.60 / 1M output → USD micros. */
export function classifyCostMicros(c: Pick<Classification, 'promptTokens' | 'completionTokens'>): number {
  return Math.round(c.promptTokens * 0.15 + c.completionTokens * 0.6);
}
