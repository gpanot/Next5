/**
 * Campaign Studio v1 — Research stage.
 * Searches TikTok for each profile keyword, fetches transcripts, and matches templates.
 * Uses studio_research_cache for 7-day keyword-level deduplication.
 *
 * Cost: ~$0.001–$0.005 per keyword (TikHub) + ~$0.001 per transcript (ScrapeCreators).
 */
// server-only
import { prisma } from '../../lib/db';
import { tregCall, fetchTikTokTranscript } from '../admin/ugcLab';
import { chatJson } from '../ai/openai';
import { listTemplates } from '../templates/repository';
import type { TemplateDto } from '../templates/dto';
import type { StageMetrics } from './types';

// ─── TikHub types ─────────────────────────────────────────────────────────────

type AwemeInfo = {
  aweme_id?: string;
  share_url?: string;
  create_time?: number;
  author?: { nickname?: string; unique_id?: string };
  statistics?: { play_count?: number; digg_count?: number };
  video?: {
    cover?: { url_list?: string[] };
    duration?: number;
  };
};

type TikTokSearchData = {
  search_item_list?: Array<{ aweme_info?: AwemeInfo }>;
  aweme_list?: AwemeInfo[];
  has_more?: boolean;
};

function collectAwemes(data: TikTokSearchData): AwemeInfo[] {
  if (data.search_item_list?.length) {
    return data.search_item_list
      .map((item) => item.aweme_info)
      .filter((a): a is AwemeInfo => Boolean(a));
  }
  return data.aweme_list ?? [];
}

function buildTikTokUrl(aweme: AwemeInfo): string {
  const id = aweme.aweme_id;
  const user = aweme.author?.unique_id;
  if (id && user) return `https://www.tiktok.com/@${user}/video/${id}`;
  return aweme.share_url ?? '';
}

function extractDurationSeconds(aweme: AwemeInfo): number | null {
  const d = aweme.video?.duration;
  if (typeof d !== 'number' || d <= 0) return null;
  return Math.round(d > 1_000 ? d / 1_000 : d);
}

// ─── Template classification ───────────────────────────────────────────────────

const templateMenu = (templates: readonly TemplateDto[]): string =>
  templates
    .filter((t) => t.legacyId !== null)
    .map((t) => `${t.legacyId}. ${t.name} — ${t.pillarName}`)
    .join('\n');

const CLASSIFY_SYSTEM = (templates: readonly TemplateDto[]) => [
  'You read TikTok transcripts for small-business marketing research.',
  'Extract the opening hook (first 5-10 seconds of speech, exact words) and the content template.',
  '',
  'Templates:',
  templateMenu(templates),
  '',
  'Return JSON only: { "hook": "...", "template_id": <number or null> }',
].join('\n');

type Classification = { hook: string; template_id: number | null };

async function classifyVideo(transcript: string, templates: readonly TemplateDto[]): Promise<Classification> {
  if (!transcript.trim()) return { hook: '', template_id: null };

  const result = await chatJson<{ hook?: string; template_id?: number }>(
    [
      { role: 'system', content: CLASSIFY_SYSTEM(templates) },
      { role: 'user', content: `Transcript:\n${transcript.slice(0, 2_500)}` },
    ],
    { maxTokens: 200, temperature: 0.1, timeoutMs: 20_000 },
  );

  const hook = result?.hook?.trim() || transcript.split(/[.!?]/)[0]?.trim() || '';
  const id = result?.template_id;
  const templateId = typeof id === 'number' && templates.some((t) => t.legacyId === id) ? id : null;
  return { hook, template_id: templateId };
}

// ─── Transcript cost (micros) ─────────────────────────────────────────────────

/** Classify cost: gpt-4o-mini ≈ $0.0003/call */
const CLASSIFY_COST_MICROS = 300;

// ─── Cache helpers ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1_000; // 7 days

async function getCachedSearch(keyword: string): Promise<AwemeInfo[] | null> {
  const cached = await prisma.studioResearchCache.findUnique({
    where: {
      cacheType_cacheKey: {
        cacheType: 'keyword',
        cacheKey: keyword.toLowerCase().trim(),
      },
    },
  });
  if (!cached || cached.expiresAt < new Date()) return null;
  return (cached.data as { awemes?: AwemeInfo[] }).awemes ?? null;
}

async function setCachedSearch(keyword: string, awemes: AwemeInfo[]): Promise<void> {
  const cacheKey = keyword.toLowerCase().trim();
  await prisma.studioResearchCache.upsert({
    where: { cacheType_cacheKey: { cacheType: 'keyword', cacheKey } },
    create: {
      cacheType: 'keyword',
      cacheKey,
      data: { awemes },
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
    update: {
      data: { awemes },
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
  });
}

async function getCachedTranscript(videoUrl: string): Promise<string | null> {
  const cacheKey = videoUrl.split('?')[0]!;
  const cached = await prisma.studioResearchCache.findUnique({
    where: { cacheType_cacheKey: { cacheType: 'transcript', cacheKey } },
  });
  if (!cached || cached.expiresAt < new Date()) return null;
  return (cached.data as { transcript?: string }).transcript ?? null;
}

async function setCachedTranscript(videoUrl: string, transcript: string): Promise<void> {
  const cacheKey = videoUrl.split('?')[0]!;
  await prisma.studioResearchCache.upsert({
    where: { cacheType_cacheKey: { cacheType: 'transcript', cacheKey } },
    create: {
      cacheType: 'transcript',
      cacheKey,
      data: { transcript },
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
    update: {
      data: { transcript },
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
  });
}

// ─── Search ────────────────────────────────────────────────────────────────────

const MAX_PER_KEYWORD = 5;   // videos kept per keyword
const MAX_KEYWORDS = 4;      // keywords to search in parallel (budget control)
const MAX_TRANSCRIPT_DURATION = 120; // skip transcripts for videos > 2 min

async function searchKeyword(keyword: string): Promise<AwemeInfo[]> {
  // Check cache first
  const cached = await getCachedSearch(keyword);
  if (cached) return cached;

  try {
    const data = await tregCall<TikTokSearchData>('tikhub.tiktok.search.videos', {
      query: { keyword, count: 10, sort_type: 1 },
      timeoutMs: 30_000,
    });
    const awemes = collectAwemes(data).slice(0, MAX_PER_KEYWORD);
    await setCachedSearch(keyword, awemes);
    return awemes;
  } catch {
    return [];
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export type ResearchInput = {
  runId: string;
  keywords: string[];
  vertical: string;
};

export type ResearchResult = {
  count: number;
  telemetry: {
    search: StageMetrics;
    transcripts: StageMetrics;
    totalDurationMs: number;
    totalCostUsdMicros: number;
  };
};

export async function runResearch(input: ResearchInput): Promise<ResearchResult> {
  const searchStart = Date.now();

  // Load global template library once
  const templates = await listTemplates({ status: 'active' });

  // Limit keywords to budget
  const keywords = input.keywords.filter(Boolean).slice(0, MAX_KEYWORDS);
  if (keywords.length === 0) {
    const zero: StageMetrics = { durationMs: 0, costUsdMicros: 0 };
    return { count: 0, telemetry: { search: zero, transcripts: zero, totalDurationMs: 0, totalCostUsdMicros: 0 } };
  }

  // ── Stage 1: keyword search (parallel, with cache) ─────────────────────────
  const searchResults = await Promise.all(keywords.map(searchKeyword));
  const searchDurationMs = Date.now() - searchStart;

  // De-duplicate by video id across keywords
  const seen = new Set<string>();
  type VideoWithKeyword = { aweme: AwemeInfo; keyword: string };
  const deduped: VideoWithKeyword[] = [];
  for (let i = 0; i < keywords.length; i++) {
    for (const aweme of searchResults[i] ?? []) {
      const id = aweme.aweme_id ?? '';
      if (!id || seen.has(id)) continue;
      seen.add(id);
      deduped.push({ aweme, keyword: keywords[i]! });
    }
  }

  // ── Stage 2: transcripts + classification (sequential to avoid rate-limits) ─
  const transcriptStart = Date.now();
  let transcriptCostMicros = 0;
  const items: Array<{
    keyword: string;
    sourceUrl: string;
    author: string;
    durationSeconds: number | null;
    stats: object;
    hook: string;
    transcript: string;
    templateId: string | null;
    fetchDurationMs: number;
    transcriptCostUsdMicros: bigint;
  }> = [];

  for (const { aweme, keyword } of deduped) {
    const videoUrl = buildTikTokUrl(aweme);
    if (!videoUrl) continue;

    const durationSeconds = extractDurationSeconds(aweme);
    // Skip very long videos — transcript would be too costly
    if (durationSeconds && durationSeconds > MAX_TRANSCRIPT_DURATION * 2) continue;

    const fetchStart = Date.now();

    // Transcript (cached)
    let transcript = await getCachedTranscript(videoUrl);
    if (transcript === null) {
      if (!durationSeconds || durationSeconds <= MAX_TRANSCRIPT_DURATION) {
        transcript = await fetchTikTokTranscript(videoUrl);
        if (transcript) await setCachedTranscript(videoUrl, transcript);
      }
      transcript ??= '';
    }

    // Classify against templates
    const { hook, template_id: legacyId } = await classifyVideo(transcript, templates);
    const matchedTemplate = legacyId != null ? templates.find((t) => t.legacyId === legacyId) : null;
    const fetchDurationMs = Date.now() - fetchStart;

    if (transcript) transcriptCostMicros += CLASSIFY_COST_MICROS;

    items.push({
      keyword,
      sourceUrl: videoUrl,
      author: aweme.author?.nickname ?? aweme.author?.unique_id ?? '',
      durationSeconds,
      stats: {
        views: aweme.statistics?.play_count ?? 0,
        likes: aweme.statistics?.digg_count ?? 0,
        postedAt: aweme.create_time ? new Date(aweme.create_time * 1_000).toISOString() : null,
      },
      hook,
      transcript,
      templateId: matchedTemplate?.id ?? null,
      fetchDurationMs,
      transcriptCostUsdMicros: BigInt(transcript ? CLASSIFY_COST_MICROS : 0),
    });
  }

  const transcriptDurationMs = Date.now() - transcriptStart;

  // ── Persist items ──────────────────────────────────────────────────────────
  if (items.length > 0) {
    await prisma.studioResearchItem.createMany({
      data: items.map((item) => ({
        runId: input.runId,
        keyword: item.keyword,
        sourceUrl: item.sourceUrl,
        author: item.author,
        durationSeconds: item.durationSeconds,
        stats: item.stats,
        hook: item.hook || null,
        transcript: item.transcript || null,
        templateId: item.templateId,
        variables: {},
        fetchDurationMs: item.fetchDurationMs,
        transcriptCostUsdMicros: item.transcriptCostUsdMicros,
      })),
    });
  }

  const totalDurationMs = searchDurationMs + transcriptDurationMs;
  const totalCostUsdMicros = transcriptCostMicros;

  return {
    count: items.length,
    telemetry: {
      search: { durationMs: searchDurationMs, costUsdMicros: 0 },
      transcripts: { durationMs: transcriptDurationMs, costUsdMicros: transcriptCostMicros },
      totalDurationMs,
      totalCostUsdMicros,
    },
  };
}
