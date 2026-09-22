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

const SYSTEM_PROMPT = `You extract 2–4 short marketing angles from a business homepage.

Rules:
- Each angle captures a CUSTOMER pain point or desire that this business solves.
- Write from the customer's perspective using vivid, specific language (NOT feature names).
- 3–7 words each, title-cased, e.g. "Missed Calls, Lost Jobs", "No-Show Prevention", "Always On, Never Missed".
- Return a maximum of 4 angles, ordered by importance.
- If the homepage is too generic or empty, return 2 safe angles from context clues.

Respond with JSON only: { "angles": ["...", "..."] }`;

/** Extract 2-4 content angles from a homepage URL. Returns empty array on any failure. */
export async function extractAnglesFromUrl(url: string): Promise<string[]> {
  const text = await fetchHomepageText(url);
  if (!text) return [];

  const result = await chatJson<{ angles: string[] }>(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    { maxTokens: 200, temperature: 0.3 },
  );

  const raw = result?.angles;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    .slice(0, 4);
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
      select: { websiteUrl: true },
    });
    const url = ws?.websiteUrl?.trim();
    if (!url) return;

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { anglesGenState: 'pending' },
    });

    const labels = await extractAnglesFromUrl(url);

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
