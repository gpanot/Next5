// server-only — never import from a 'use client' file.
import { prisma } from '../../lib/db';
import { chatJson } from './openai';

// ── Exa scraper ──────────────────────────────────────────────────────────────

interface ExaContentsResponse {
  results: Array<{ text?: string; title?: string }>;
}

/** Fetch clean homepage text via Exa (EXA_API_KEY required). Returns null on failure. */
async function fetchHomepageText(url: string): Promise<string | null> {
  const key = process.env.EXA_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch('https://api.exa.ai/contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({
        urls: [url],
        text: { maxCharacters: 3500 },
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

// ── Angle extraction ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You read a business homepage and describe the business for a marketing tool.

Angles:
- Each angle captures a CUSTOMER pain point or desire that this business solves.
- Write from the customer's perspective using vivid, specific language (NOT feature names).
- 3–7 words each, title-cased, e.g. "Missed Calls, Lost Jobs", "No-Show Prevention", "Always On, Never Missed".
- Return a maximum of 4 angles, ordered by importance.
- If the homepage is too generic or empty, return 2 safe angles from context clues.

Profile:
- audienceType: "b2c" if it sells to consumers, "b2b" if it sells to other businesses, "both" if genuinely both.
- promoting: one line, what the business or product is. Under 15 words.
- offer: one line, the reason a customer should pick them. Under 15 words.
- Invent nothing. Leave promoting or offer as "" when the page does not say.

Respond with JSON only:
{ "angles": ["...", "..."], "audienceType": "b2c", "promoting": "...", "offer": "..." }`;

export type BusinessProfileGuess = {
  audienceType: 'b2c' | 'b2b' | 'both' | null;
  promoting: string | null;
  offer: string | null;
};

export type HomepageReading = { angles: string[]; profile: BusinessProfileGuess };

const EMPTY: HomepageReading = { angles: [], profile: { audienceType: null, promoting: null, offer: null } };

const oneLine = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 200) : null;
};

/**
 * Reads a homepage once for everything the app infers about a business: its content angles and
 * the business profile the Template Engine matches on. One call, because the page is the same.
 */
export async function readHomepage(url: string): Promise<HomepageReading> {
  const text = await fetchHomepageText(url);
  if (!text) return EMPTY;

  const result = await chatJson<{ angles?: unknown; audienceType?: unknown; promoting?: unknown; offer?: unknown }>(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    { maxTokens: 400, temperature: 0.3 },
  );

  const rawAngles = Array.isArray(result?.angles) ? result.angles : [];
  const audience = result?.audienceType;
  return {
    angles: rawAngles
      .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
      .slice(0, 4),
    profile: {
      audienceType: audience === 'b2c' || audience === 'b2b' || audience === 'both' ? audience : null,
      promoting: oneLine(result?.promoting),
      offer: oneLine(result?.offer),
    },
  };
}

/** Extract 2-4 content angles from a homepage URL. Returns empty array on any failure. */
export async function extractAnglesFromUrl(url: string): Promise<string[]> {
  return (await readHomepage(url)).angles;
}

// ── Database writer ──────────────────────────────────────────────────────────

/**
 * Background job: scrape the workspace's websiteUrl, extract angles, persist them.
 * Idempotent — replaces any previously AI-generated angles, keeps user-added ones.
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

    const { angles: labels, profile } = await readHomepage(url);

    // Only fill what she has not answered herself — a guess never overwrites her own words.
    const profileFill: Record<string, string> = {};
    if (profile.audienceType && !ws?.audienceType) profileFill.audienceType = profile.audienceType;
    if (profile.promoting && !ws?.promoting) profileFill.promoting = profile.promoting;
    if (profile.offer && !ws?.offer) profileFill.offer = profile.offer;
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
