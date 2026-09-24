// server-only — never import from a 'use client' file.
import { prisma } from '../../lib/db';
import { chatJson } from './openai';
import type { BrandExtractData } from '../../types/business/me';

// ── Exa scraper ──────────────────────────────────────────────────────────────

interface ExaContentsResponse {
  results: Array<{ text?: string; title?: string }>;
}

/**
 * Fetch clean homepage text via Exa (EXA_API_KEY required).
 * Increased to 5 000 chars: avenue2.au totals 4 356, koka hvac 7 000+ (5 k captures the
 * "our services / why us / testimonials" block that matters for brand extraction).
 */
async function fetchHomepageText(url: string): Promise<string | null> {
  const key = process.env.EXA_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch('https://api.exa.ai/contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({
        urls: [url],
        text: { maxCharacters: 5_000 },
        livecrawl: 'always',
        livecrawlTimeout: 15_000,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ExaContentsResponse;
    return data.results?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

// ── Extraction prompt ─────────────────────────────────────────────────────────

/**
 * Single combined prompt: angles + basic profile + rich brand extract fields.
 * One LLM call keeps latency and cost flat.
 *
 * Tested on:
 *   avenue2.au          → 455–575 output tokens, all fields populated
 *   manhattanautoinc.com → 455 output tokens (sparse site — graceful fallback)
 *   kokahvac.com         → 574 output tokens, all fields populated
 *
 * maxTokens: 900 (was 400) — gives headroom for all fields without waste.
 */
const SYSTEM_PROMPT = `You read a business homepage and extract a structured brand profile + content angles for a social-media marketing tool. Works for ANY business: auto shop, SaaS, HVAC, spa, law firm, etc.

Rules:
- Invent NOTHING. Leave a field as "" or [] when the page does not say.
- audienceType: "b2c" (consumers), "b2b" (businesses), or "both".
- promoting: max 15 words. What the business is + who it serves.
- offer: max 15 words. Core value proposition.

ANGLES (for content suggestions):
- 3–4 customer pain points or desires this business solves, 3–7 words each, title-cased.
- Examples: "Missed Calls, Lost Jobs", "No-Show Prevention", "Always On, Never Missed".

BRAND FIELDS (for the brand page):
- coreIdentity: 1–2 sentences. What the company IS — plain factual description.
- productOffering: 2–3 sentences. All products/services/features they offer.
- uniqueBenefits: 2–3 sentences. Key benefits that make this business stand out.
- problemSolution: 2–3 sentences. The problem they solve and how.
- mission: 1–2 sentences. Company mission/purpose (infer if not explicit).
- differentiation: 2–3 sentences. How they differ from competitors/alternatives.
- ownedSpace: 1 sentence. The brand territory they uniquely own — a memorable positioning phrase.
- customerSegments: 2–5 segments. Each: { "name": "...", "description": "...", "percentage": N }. Percentages must sum to 100. Use actual customer types mentioned on the page.
- toneDos: 3–5 strings. Concrete tone guidelines — what this brand SHOULD sound like.
- toneDonts: 3–5 strings. What this brand should NEVER sound like.
- competitors: array of competitor brand/product names visible on the page (e.g. in "vs", "unlike", "compared to" text). [] if none mentioned.

Return valid JSON only (no markdown):
{
  "angles": ["...", "..."],
  "audienceType": "b2c|b2b|both",
  "promoting": "...",
  "offer": "...",
  "coreIdentity": "...",
  "productOffering": "...",
  "uniqueBenefits": "...",
  "problemSolution": "...",
  "mission": "...",
  "differentiation": "...",
  "ownedSpace": "...",
  "customerSegments": [{ "name": "...", "description": "...", "percentage": 0 }],
  "toneDos": ["..."],
  "toneDonts": ["..."],
  "competitors": ["..."]
}`;

export type BusinessProfileGuess = {
  audienceType: 'b2c' | 'b2b' | 'both' | null;
  promoting: string | null;
  offer: string | null;
};

export type HomepageReading = {
  angles: string[];
  profile: BusinessProfileGuess;
  brandExtract: BrandExtractData | null;
};

const EMPTY: HomepageReading = {
  angles: [],
  profile: { audienceType: null, promoting: null, offer: null },
  brandExtract: null,
};

const oneLine = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 200) : null;
};

const str = (value: unknown, fallback = ''): string => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || fallback;
};

/**
 * Reads a homepage once for everything the app infers about a business: content angles,
 * the basic business profile (audienceType/promoting/offer), and the rich brand extract.
 * All in one LLM call — page is the same, crawl cost is the same.
 */
export async function readHomepage(url: string): Promise<HomepageReading> {
  const text = await fetchHomepageText(url);
  if (!text) return EMPTY;

  type LLMResult = {
    angles?: unknown;
    audienceType?: unknown;
    promoting?: unknown;
    offer?: unknown;
    coreIdentity?: unknown;
    productOffering?: unknown;
    uniqueBenefits?: unknown;
    problemSolution?: unknown;
    mission?: unknown;
    differentiation?: unknown;
    ownedSpace?: unknown;
    customerSegments?: unknown;
    toneDos?: unknown;
    toneDonts?: unknown;
    competitors?: unknown;
  };

  const result = await chatJson<LLMResult>(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text.slice(0, 5_000) },
    ],
    { maxTokens: 900, temperature: 0.2 },
  );

  const rawAngles = Array.isArray(result?.angles) ? result.angles : [];
  const audience = result?.audienceType;

  // Build brand extract from LLM result
  const rawSegments = Array.isArray(result?.customerSegments) ? result.customerSegments : [];
  const customerSegments = rawSegments
    .filter((s): s is { name: string; description: string; percentage: number } =>
      typeof s === 'object' && s !== null && typeof (s as Record<string, unknown>).name === 'string',
    )
    .map((s) => ({
      name: str(s.name),
      description: str(s.description),
      percentage: typeof s.percentage === 'number' ? Math.max(0, Math.min(100, s.percentage)) : 0,
    }));

  const brandExtract: BrandExtractData = {
    coreIdentity: str(result?.coreIdentity),
    productOffering: str(result?.productOffering),
    uniqueBenefits: str(result?.uniqueBenefits),
    problemSolution: str(result?.problemSolution),
    mission: str(result?.mission),
    differentiation: str(result?.differentiation),
    ownedSpace: str(result?.ownedSpace),
    customerSegments,
    toneDos: Array.isArray(result?.toneDos) ? (result.toneDos as string[]).filter((s) => typeof s === 'string') : [],
    toneDonts: Array.isArray(result?.toneDonts) ? (result.toneDonts as string[]).filter((s) => typeof s === 'string') : [],
    competitors: Array.isArray(result?.competitors) ? (result.competitors as string[]).filter((s) => typeof s === 'string') : [],
  };

  return {
    angles: rawAngles
      .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
      .slice(0, 4),
    profile: {
      audienceType: audience === 'b2c' || audience === 'b2b' || audience === 'both' ? audience : null,
      promoting: oneLine(result?.promoting),
      offer: oneLine(result?.offer),
    },
    brandExtract,
  };
}

/** Extract 2-4 content angles from a homepage URL. Returns empty array on any failure. */
export async function extractAnglesFromUrl(url: string): Promise<string[]> {
  return (await readHomepage(url)).angles;
}

// ── Database writer ──────────────────────────────────────────────────────────

/**
 * Background job: scrape the workspace's websiteUrl, extract angles + rich brand profile,
 * persist both. Idempotent — replaces AI-generated angles, keeps user-added ones.
 * Safe to call without awaiting (fire-and-forget from a route handler).
 */
export async function generateAnglesForWorkspace(workspaceId: string): Promise<void> {
  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { websiteUrl: true, audienceType: true, promoting: true, offer: true },
    });
    const url = ws?.websiteUrl?.trim();
    if (!url) return;

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { anglesGenState: 'pending' },
    });

    const { angles: labels, profile, brandExtract } = await readHomepage(url);

    // Only fill what she has not answered herself — a guess never overwrites her own words.
    const profileFill: Record<string, unknown> = {};
    if (profile.audienceType && !ws?.audienceType) profileFill.audienceType = profile.audienceType;
    if (profile.promoting && !ws?.promoting) profileFill.promoting = profile.promoting;
    if (profile.offer && !ws?.offer) profileFill.offer = profile.offer;

    // Always write brandExtract (it is derived from the website, not user-entered).
    if (brandExtract) {
      profileFill.brandExtract = brandExtract;
      profileFill.brandExtractAt = new Date();
    }

    if (Object.keys(profileFill).length > 0) {
      await prisma.workspace.update({ where: { id: workspaceId }, data: profileFill });
    }

    if (labels.length === 0) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { anglesGenState: 'failed', anglesGenAt: new Date() },
      });
      return;
    }

    // Replace AI-generated angles; keep user-added ones at the end.
    await prisma.$transaction([
      prisma.workspaceAngle.deleteMany({
        where: { workspaceId, source: 'ai' },
      }),
      ...labels.map((label, i) =>
        prisma.workspaceAngle.create({
          data: {
            workspaceId,
            label,
            weight: Math.floor(100 / labels.length),
            position: i,
            source: 'ai',
          },
        }),
      ),
      prisma.workspace.update({
        where: { id: workspaceId },
        data: { anglesGenState: 'done', anglesGenAt: new Date() },
      }),
    ]);
  } catch {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { anglesGenState: 'failed' },
    }).catch(() => undefined);
  }
}
