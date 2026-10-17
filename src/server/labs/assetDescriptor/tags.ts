// server-only — library tags ("topic:Fitness", "setting:Gym", …) for described videos.
//
// One gpt-4o-mini call tags up to 40 assets from their description (no video re-watch).
// Every facet uses a fixed vocabulary so tags stay consistent and searchable in the admin
// Assets Library. Industry labels written by categorize.ts are kept as-is.

import { prisma } from '../../../lib/db';
import { chatJson } from '../../ai/openai';
import { CATEGORY_SLUGS, categoryLabel } from '../../slideshow/core/categories';
import type { CategorizeRow } from './categorize';

const BATCH = 40;

/** Facet → allowed values, plus how many values one asset may get. Order = tag order on the card. */
const FACETS = {
  topic: {
    max: 2,
    values: ['Fitness', 'Golf', 'Sports', 'Nutrition', 'Food/Drink', 'Wellness', 'Beauty', 'Fashion', 'Real estate',
      'Home', 'Corporate/Office', 'Money', 'Tech', 'Travel', 'Family', 'Friendship', 'Dating', 'Pets', 'Lifestyle'],
  },
  setting: {
    max: 1,
    values: ['Gym', 'Golf course', 'Car', 'Home', 'Kitchen', 'Bedroom', 'Bathroom', 'Office', 'Street', 'Park',
      'Beach', 'Pool', 'Nature', 'Restaurant', 'Cafe', 'Bar', 'Store', 'Salon', 'Studio', 'House exterior', 'Event'],
  },
  subject: {
    max: 1,
    values: ['Woman', 'Man', 'Couple', 'Friends', 'Group', 'Family', 'Kid', 'Hands only', 'No person'],
  },
  activity: {
    max: 2,
    values: ['Talking', 'Workout', 'Running', 'Walking', 'Dancing', 'Laughing', 'Eating', 'Drinking', 'Cooking',
      'Driving', 'Laptop', 'Phone', 'Shopping', 'Posing', 'Playing sport', 'Relaxing', 'Cleaning', 'Getting ready',
      'Hugging', 'Showing product', 'Touring property'],
  },
  emotion: {
    max: 1,
    values: ['Happy', 'Excited', 'Calm', 'Confident', 'Serious', 'Surprised', 'Frustrated', 'Sad', 'Funny', 'Reaction'],
  },
  shot: {
    max: 1,
    values: ['Selfie', 'POV', 'Talking head', 'Mirror', 'Close-up', 'Wide'],
  },
} as const;

type Facet = keyof typeof FACETS;
const FACET_NAMES = Object.keys(FACETS) as Facet[];

const SYSTEM = `You tag short vertical video clips for a social-video library.
For each clip, pick values ONLY from these lists (exact spelling):
${FACET_NAMES.map((f) => `- ${f} (max ${FACETS[f].max}): ${FACETS[f].values.join(', ')}`).join('\n')}

Rules:
- Tag what the footage SHOWS. Two or more friends hanging out = subject Friends + topic Friendship.
- A person filming themselves with an outstretched arm = shot Selfie.
- Skip a facet (empty list) only when nothing fits.

Return JSON only, one flat object per clip:
{ "items": [ { "id": "<id>", "topic": [], "setting": [], "subject": [], "activity": [], "emotion": [], "shot": [] } ] }`;

function assetLine(r: CategorizeRow): string {
  const d = (r.descriptor ?? {}) as { subject?: string; setting?: string; action?: string; vibe?: string[] };
  return `${r.id}: ${r.retrieval_text ?? ''} Subject: ${d.subject ?? '-'}. Setting: ${d.setting ?? '-'}. Action: ${d.action ?? '-'}. Vibe: ${(d.vibe ?? []).join(', ')}.`;
}

/** True when every facet tag is from the current vocabulary (industry labels are ignored). */
export function hasCurrentTags(tags: string[]): boolean {
  const facetTags = tags.filter((t) => t.includes(':'));
  return facetTags.length > 0 && facetTags.every((t) => {
    const [facet, value] = t.split(':', 2) as [string, string];
    return facet in FACETS && (FACETS[facet as Facet].values as readonly string[]).includes(value);
  });
}

/** Keeps only allowed values (case-insensitive), capped per facet, as "facet:Value" tags. */
function cleanTags(item: Record<string, unknown>): string[] {
  return FACET_NAMES.flatMap((facet) => {
    const raw = Array.isArray(item[facet]) ? (item[facet] as unknown[]) : [item[facet]];
    const allowed: readonly string[] = FACETS[facet].values;
    const picked = raw
      .map((v) => allowed.find((a) => typeof v === 'string' && a.toLowerCase() === v.trim().toLowerCase()))
      .filter((v): v is string => Boolean(v));
    return [...new Set(picked)].slice(0, FACETS[facet].max).map((v) => `${facet}:${v}`);
  });
}

/** Tags rows (≤ 40 per call). Rows the model skipped are left out of the map. */
export async function tagRows(rows: CategorizeRow[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const result = await chatJson<{ items?: Array<Record<string, unknown>> }>(
      [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: batch.map(assetLine).join('\n') },
      ],
      { maxTokens: 6_000, temperature: 0, timeoutMs: 90_000 },
    );
    for (const item of result?.items ?? []) {
      const tags = cleanTags(item);
      if (typeof item.id === 'string' && tags.length) out.set(item.id, tags);
    }
  }
  return out;
}

/** Replaces the asset's tags with the new facet tags, then its industry labels. */
export async function saveTags(descriptorId: string, tags: string[]): Promise<void> {
  const industryLabels = CATEGORY_SLUGS.map(categoryLabel);
  await prisma.$executeRaw`
    UPDATE blitz_assets a
    SET tags = ${tags}::text[] || array(SELECT x FROM unnest(a.tags) x WHERE x = ANY(${industryLabels}::text[]))
    FROM asset_descriptors d
    WHERE d.id = ${descriptorId} AND d.blitz_asset_id = a.id`;
}
