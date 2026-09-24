/**
 * Campaign Studio v1 — Research stage.
 * Same search + classifier as the Blitz researcher (src/server/research/tiktokResearch.ts),
 * run once per profile keyword, with a shared DB cache on top so repeat runs cost nothing.
 *
 * Cost: one TikHub search per uncached keyword + ~$0.001 transcript and ~$0.0003 classify per
 * uncached video.
 */
// server-only
import { prisma } from '../../lib/db';
import { fetchTikTokTranscript } from '../admin/ugcLab';
import { listTemplates } from '../templates/repository';
import {
  buildTikTokUrl,
  classifyCostMicros,
  classifyVideo,
  extractDuration,
  searchTikTok,
  type AwemeInfo,
} from '../research/tiktokResearch';
import { clearStaleResearchItems } from './researchKeywords';
import type { StageMetrics } from './types';

type CachedClassification = { hook: string; template_id: number | null };

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 24 * 60 * 60 * 1_000; // 10 days — shared cross-workspace, same niche reuses results

/**
 * Key version. v2 = the Blitz classifier prompt and full 10-video search pages. Rows written
 * by the old studio-only classifier (and 5-video pages) are ignored rather than migrated.
 */
const KEY_PREFIX = 'v2:';

type CacheType = 'keyword' | 'transcript' | 'classification';

async function readCache<T>(cacheType: CacheType, key: string): Promise<T | null> {
  const row = await prisma.studioResearchCache.findUnique({
    where: { cacheType_cacheKey: { cacheType, cacheKey: KEY_PREFIX + key } },
  });
  if (!row || row.expiresAt < new Date()) return null;
  return row.data as T;
}

async function writeCache(cacheType: CacheType, key: string, data: object): Promise<void> {
  const cacheKey = KEY_PREFIX + key;
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
  await prisma.studioResearchCache.upsert({
    where: { cacheType_cacheKey: { cacheType, cacheKey } },
    create: { cacheType, cacheKey, data, expiresAt },
    update: { data, expiresAt },
  });
}

const normalizeKeyword = (k: string) => k.toLowerCase().trim();
const normalizeUrl = (u: string) => u.split('?')[0]!;

// ─── Search ───────────────────────────────────────────────────────────────────

const MAX_PER_KEYWORD = 10;          // same page size as the Blitz researcher
const MAX_KEYWORDS = 3;              // budget control
const MAX_VIDEOS = 10;               // total kept per run — enough to pick from, no more transcripts than needed
const MAX_TRANSCRIPT_DURATION = 120; // skip transcripts for videos > 2 min
const CONCURRENCY = 5;               // parallel transcript + classify calls

async function searchKeyword(keyword: string): Promise<AwemeInfo[]> {
  const key = normalizeKeyword(keyword);
  const cached = await readCache<{ awemes?: AwemeInfo[] }>('keyword', key);
  if (cached?.awemes) {
    console.log(`[studio/research] keyword="${keyword}" → cache HIT (${cached.awemes.length} videos)`);
    return cached.awemes;
  }

  console.log(`[studio/research] keyword="${keyword}" → TikHub search`);
  try {
    const awemes = await searchTikTok(keyword, MAX_PER_KEYWORD);
    await writeCache('keyword', key, { awemes });
    console.log(`[studio/research] keyword="${keyword}" → ${awemes.length} videos (cached)`);
    return awemes;
  } catch (err) {
    console.error(`[studio/research] keyword="${keyword}" → search FAILED:`, err);
    return [];
  }
}

/** Runs `fn` over `items` with at most `limit` in flight, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
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

type ItemRow = {
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
};

type Templates = Awaited<ReturnType<typeof listTemplates>>;

async function researchVideo(aweme: AwemeInfo, keyword: string, templates: Templates): Promise<ItemRow | null> {
  const videoUrl = buildTikTokUrl(aweme);
  if (!videoUrl) return null;
  const durationSeconds = extractDuration(aweme);
  if (durationSeconds && durationSeconds > MAX_TRANSCRIPT_DURATION * 2) return null;

  const fetchStart = Date.now();
  const urlKey = normalizeUrl(videoUrl);
  let costMicros = 0;
  let transcript = (await readCache<{ transcript?: string }>('transcript', urlKey))?.transcript ?? '';

  let classification = await readCache<CachedClassification>('classification', urlKey);
  if (!classification || typeof classification.hook !== 'string') {
    if (!transcript && (!durationSeconds || durationSeconds <= MAX_TRANSCRIPT_DURATION)) {
      transcript = (await fetchTikTokTranscript(videoUrl)) ?? '';
      if (transcript) await writeCache('transcript', urlKey, { transcript });
    }
    const c = await classifyVideo(transcript, templates);
    costMicros = classifyCostMicros(c);
    classification = { hook: c.hook, template_id: c.template_id };
    await writeCache('classification', urlKey, classification);
  }

  const templateLegacyId = classification.template_id;
  const matched = templateLegacyId != null ? templates.find((t) => t.legacyId === templateLegacyId) : null;
  return {
    keyword,
    sourceUrl: videoUrl,
    author: aweme.author?.nickname ?? aweme.author?.unique_id ?? '',
    durationSeconds,
    stats: {
      views: aweme.statistics?.play_count ?? 0,
      likes: aweme.statistics?.digg_count ?? 0,
      postedAt: aweme.create_time ? new Date(aweme.create_time * 1_000).toISOString() : null,
    },
    hook: classification.hook,
    transcript,
    templateId: matched?.id ?? null,
    fetchDurationMs: Date.now() - fetchStart,
    transcriptCostUsdMicros: BigInt(costMicros),
  };
}

export async function runResearch(input: ResearchInput): Promise<ResearchResult> {
  const searchStart = Date.now();
  const templates = await listTemplates({ status: 'active' });

  const keywords = [...new Set(input.keywords.map((k) => k.trim()).filter(Boolean))].slice(0, MAX_KEYWORDS);
  console.log(`[studio/research] run=${input.runId} keywords=[${keywords.join(', ')}]`);
  if (keywords.length === 0) {
    console.warn(`[studio/research] run=${input.runId} → no keywords, aborting`);
    const zero: StageMetrics = { durationMs: 0, costUsdMicros: 0 };
    return { count: 0, telemetry: { search: zero, transcripts: zero, totalDurationMs: 0, totalCostUsdMicros: 0 } };
  }

  // ── Stage 1: keyword search (parallel, cached) ───────────────────────────
  const searchResults = await Promise.all(keywords.map(searchKeyword));
  const searchDurationMs = Date.now() - searchStart;

  // Round-robin across keywords (each keyword's best first), dedupe by video id, keep 10 —
  // so "mechanics" + "electricians" gives ~5 of each, not 10 mechanics.
  const seen = new Set<string>();
  const deduped: Array<{ aweme: AwemeInfo; keyword: string }> = [];
  const longest = Math.max(...searchResults.map((r) => r.length));
  for (let rank = 0; rank < longest && deduped.length < MAX_VIDEOS; rank++) {
    keywords.forEach((keyword, i) => {
      const aweme = searchResults[i]?.[rank];
      const id = aweme?.aweme_id ?? '';
      if (!aweme || !id || seen.has(id) || deduped.length >= MAX_VIDEOS) return;
      seen.add(id);
      deduped.push({ aweme, keyword });
    });
  }

  // ── Stage 2: transcripts + classification (bounded parallel, cached) ─────
  const transcriptStart = Date.now();
  const rows = await mapLimit(deduped, CONCURRENCY, ({ aweme, keyword }) => researchVideo(aweme, keyword, templates));
  const items = rows.filter((r): r is ItemRow => r !== null);
  const transcriptCostMicros = items.reduce((sum, r) => sum + Number(r.transcriptCostUsdMicros), 0);
  const transcriptDurationMs = Date.now() - transcriptStart;

  // ── Persist items — replace the previous run's items (keeping any a candidate uses) ──
  await clearStaleResearchItems(input.runId);
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
  console.log(`[studio/research] run=${input.runId} DONE items=${items.length} durationMs=${totalDurationMs} costMicros=${transcriptCostMicros}`);

  return {
    count: items.length,
    telemetry: {
      search: { durationMs: searchDurationMs, costUsdMicros: 0 },
      transcripts: { durationMs: transcriptDurationMs, costUsdMicros: transcriptCostMicros },
      totalDurationMs,
      totalCostUsdMicros: transcriptCostMicros,
    },
  };
}
